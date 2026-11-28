import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  createDemoScenario,
  DEMO_EXCHANGE_RATE: rate,
} = require('../../out/fixtures/financas/demo.js');
const { withSeptemberHistory } = require('../../out/fixtures/financas/comparison-history.js');
const { withSecondCard } = require('../../out/fixtures/financas/card-wallet.js');
const { withCardRefund } = require('../../out/fixtures/financas/card-refund.js');
const { cardInvoices } = require('../../out/application/card-invoices.js');
const { invoicePurchases } = require('../../out/application/invoice-purchases.js');
const { invoiceMerchants } = require('../../out/application/invoice-merchants.js');
const { invoiceEvolution } = require('../../out/application/invoice-evolution.js');
const { invoiceVariation } = require('../../out/application/invoice-variation.js');
const { cardFuture } = require('../../out/application/card-future.js');
const { invoiceKnownSubtotal } = require('../../out/domain/finance.js');
function snapshot() {
  const scenario = createDemoScenario();
  return withCardRefund(
    withSecondCard(
      withSeptemberHistory({
        formatVersion: 1,
        seedVersion: 1,
        seedId: 'demo-financas-v1',
        asOf: scenario.clock.today(),
        timezone: scenario.timezone,
        facts: scenario.facts,
      }),
    ),
  );
}
const reading = (s) =>
  cardInvoices(s, 'demo-a', 'card-demo').find((row) => row.invoice.id === 'fat-nov');
const future = (s, invoice = 'fat-out', currency = 'original', exchange = rate) =>
  cardFuture(s, 'demo-a', 'card-demo', invoice, currency, exchange);

test('D176–D179: fatura e tabela líquidas, composição bruta e agenda original sem mutação', () => {
  const s = snapshot(),
    before = JSON.stringify(s);
  const row = reading(s);
  assert.equal(row.knownSubtotal.minorUnits, 23324);
  assert.equal(row.purchasesSubtotal.minorUnits, 28324);
  assert.equal(row.refundsSubtotal.minorUnits, 5000);
  assert.equal(row.refundCount, 1);
  assert.equal(
    row.categories.reduce((sum, part) => sum + part.amount.minorUnits, 0),
    28324,
  );
  assert.equal(invoiceKnownSubtotal(s.facts, 'fat-nov').minorUnits, 23324);
  const table = invoicePurchases(s, 'demo-a', 'card-demo', 'fat-nov');
  assert.equal(table.rows.length, 4);
  assert.equal(
    table.rows.reduce((sum, entry) => sum + entry.amount.minorUnits, 0),
    23324,
  );
  const credit = table.rows.find((entry) => entry.refund);
  assert.equal(credit.on, '2026-10-28');
  assert.equal(credit.item, null);
  assert.equal(credit.purchase.id, 'compra-6x');
  assert.equal(credit.amount.minorUnits, -5000);
  assert.equal(credit.schedule.length, 6);
  assert.equal(credit.afterKnownTotal.minorUnits, 100000);
  assert.equal(
    table.rows
      .filter((entry) => entry.purchase.merchantId === 'loja')
      .reduce((sum, entry) => sum + entry.amount.minorUnits, 0),
    18334,
  );
  const merchants = invoiceMerchants(s, 'demo-a', 'card-demo', 'fat-nov', 'original', rate);
  assert.equal(
    merchants.parts.find((part) => part.merchantId === 'loja').original.minorUnits,
    23334,
  );
  assert.equal(merchants.value.minorUnits, 28324);
  assert.equal(JSON.stringify(s), before);
  // IDs das coleções são independentes; a chave visual distingue item e estorno.
  s.facts.invoiceItems.find((item) => item.invoiceId === 'fat-nov').id =
    `refund-${s.facts.cardRefunds[0].id}`;
  const colliding = invoicePurchases(s, 'demo-a', 'card-demo', 'fat-nov');
  assert.equal(new Set(colliding.rows.map((entry) => entry.id)).size, colliding.rows.length);
});

test('líquido reduz evolução/variação/futuro da referência anterior sem alterar futuros de novembro', () => {
  const s = snapshot();
  const evolution = invoiceEvolution(s, 'demo-a', 'card-demo', 'original', rate);
  assert.equal(evolution.invoices.find((row) => row.key === 'fat-nov').value.minorUnits, 23324);
  const variation = invoiceVariation(s, 'demo-a', 'card-demo', 'fat-nov', 'original', rate);
  assert.equal(variation.value.minorUnits, -2676);
  assert.equal(variation.percentage, '−10,3%');
  assert.equal(variation.partial, true);
  assert.equal(future(s, 'fat-nov').original.minorUnits, 106666);
  const q = future(s);
  assert.equal(q.original.minorUnits, 129990);
  assert.equal(q.invoices[0].items.filter((entry) => entry.kind === 'refund').length, 1);
  assert.equal(
    q.invoices[0].items.reduce((sum, entry) => sum + entry.amount.minorUnits, 0),
    23324,
  );
});

test('crédito excedente conserva sinal, geometria abaixo de zero e percentual sem base negativa', () => {
  const s = snapshot();
  s.facts.cardRefunds[0].amount = { minorUnits: 30000, currency: 'BRL' };
  const evolution = invoiceEvolution(s, 'demo-a', 'card-demo', 'original', rate);
  assert.equal(evolution.zero, 50);
  assert.ok(evolution.ticks.some((tick) => tick.minorUnits < 0));
  const row = evolution.invoices.find((entry) => entry.key === 'fat-nov');
  assert.equal(row.value.minorUnits, -1676);
  assert.ok(row.height > 0 && row.height <= 50);
  const q = future(s);
  assert.equal(q.signed, true);
  assert.equal(q.invoices[0].value.minorUnits, -1676);
  assert.ok(q.invoices[0].percent > 0 && q.invoices[0].percent <= 50);
  const next = invoiceVariation(s, 'demo-a', 'card-demo', 'fat-dez', 'original', rate);
  assert.equal(next.percentage, null);
  assert.equal(next.value.minorUnits, 25009);
});

test('fatura só com crédito não é ausência nem zero; crédito de outra fatura não retroage', () => {
  const s = snapshot();
  const refund = s.facts.cardRefunds[0];
  s.facts.cardRefunds.push({
    ...refund,
    id: 'refund-extra',
    purchaseId: 'compra-extra-demo',
    invoiceId: 'fat-extra-dez',
    amount: { minorUnits: 2000, currency: 'BRL' },
    origin: { ...refund.origin, externalId: 'refund-extra' },
  });
  const q = cardFuture(s, 'demo-a', 'card-demo-extra', 'fat-extra-nov', 'original', rate);
  assert.equal(q.value.minorUnits, -2000);
  assert.equal(q.missingInvoices, 0);
  assert.equal(q.unavailable, null);
  assert.equal(q.invoices[0].unavailable, null);
  assert.equal(q.invoices[0].items.length, 1);
  assert.equal(q.invoices[0].items[0].kind, 'refund');
  assert.equal(cardInvoices(s, 'demo-a', 'card-demo-extra')[0].knownSubtotal.minorUnits, 8990);
});

test('total confirmado preserva autoridade inclusive crédito; futuro mantém itens registrados', () => {
  const s = snapshot();
  s.facts.invoices.find((row) => row.id === 'fat-nov').confirmedTotal = {
    minorUnits: -1000,
    currency: 'BRL',
  };
  const evolution = invoiceEvolution(s, 'demo-a', 'card-demo', 'original', rate);
  assert.equal(evolution.invoices.find((row) => row.key === 'fat-nov').value.minorUnits, -1000);
  assert.equal(future(s).invoices[0].value.minorUnits, 23324);
  assert.equal(reading(s).knownSubtotal.minorUnits, 23324);
});

test('conversão líquida ocorre uma vez por agregado e ausência de taxa não gera parcial', () => {
  const s = snapshot();
  const q = future(s, 'fat-out', 'USD');
  assert.equal(q.value.minorUnits, 25998);
  assert.equal(q.original.minorUnits, 129990);
  assert.equal(q.invoices[0].value.minorUnits, 4665);
  assert.equal(q.invoices[0].items.find((entry) => entry.refund).value.minorUnits, -1000);
  assert.equal(future(s, 'fat-out', 'USD', null).value, null);
  assert.equal(future(s, 'fat-out', 'USD', null).unavailable, 'conversion');
});
