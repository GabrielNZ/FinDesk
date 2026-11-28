import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createDemoScenario } = require('../../out/fixtures/financas/demo.js');
const { validateFacts, accountBalanceAt } = require('../../out/domain/finance.js');
const { invoiceRegisteredAmounts } = require('../../out/domain/card-refunds.js');

function scenario() {
  const { facts } = createDemoScenario();
  return {
    ...facts,
    cardRefunds: [
      {
        nature: 'observed',
        id: 'refund-loja',
        purchaseId: 'compra-6x',
        invoiceId: 'fat-nov',
        on: '2026-10-28',
        amount: { minorUnits: 5000, currency: 'BRL' },
        origin: { kind: 'file', sourceId: 'demo-statement', externalId: 'refund-loja' },
      },
    ],
  };
}

test('D176: crédito reduz somente a fatura de destino, preservando caixa, compra e agenda', () => {
  const facts = scenario();
  const before = JSON.stringify(facts);
  assert.deepEqual(invoiceRegisteredAmounts(facts, 'fat-nov'), {
    purchases: { minorUnits: 28324, currency: 'BRL' },
    refunds: { minorUnits: 5000, currency: 'BRL' },
    net: { minorUnits: 23324, currency: 'BRL' },
    itemCount: 3,
    refundCount: 1,
  });
  assert.equal(invoiceRegisteredAmounts(facts, 'fat-out').net.minorUnits, 26000);
  assert.equal(invoiceRegisteredAmounts(facts, 'fat-dez').net.minorUnits, 23333);
  assert.deepEqual(
    accountBalanceAt(facts, 'demo-a', '2026-10-29'),
    accountBalanceAt(createDemoScenario().facts, 'demo-a', '2026-10-29'),
  );
  assert.equal(JSON.stringify(facts), before);
});

test('fatura só com crédito preserva líquido negativo; legado não inventa estorno', () => {
  const facts = scenario();
  facts.cardRefunds[0].amount.minorUnits = 30000;
  assert.equal(invoiceRegisteredAmounts(facts, 'fat-nov').net.minorUnits, -1676);
  const legacy = createDemoScenario().facts;
  assert.equal(invoiceRegisteredAmounts(legacy, 'fat-nov').refunds.minorUnits, 0);
  assert.equal(invoiceRegisteredAmounts(legacy, 'fat-nov').net.minorUnits, 28324);
  const onlyCredit = {
    ...facts,
    invoiceItems: facts.invoiceItems.filter((item) => item.invoiceId !== 'fat-nov'),
    purchases: facts.purchases.map((purchase) => ({ ...purchase, scheduleCoverage: 'partial' })),
  };
  assert.equal(invoiceRegisteredAmounts(onlyCredit, 'fat-nov').net.minorUnits, -30000);
  assert.equal(invoiceRegisteredAmounts(onlyCredit, 'fat-nov').itemCount, 0);
  assert.equal(invoiceRegisteredAmounts(onlyCredit, 'fat-nov').refundCount, 1);
});

test('vínculos, data, natureza, sinal e moeda de estornos são validados', () => {
  for (const changes of [
    { purchaseId: 'missing' },
    { invoiceId: 'missing' },
    { on: '2026-10-19' },
    { on: '2026-02-30' },
    { nature: 'estimated' },
    { amount: { minorUnits: 0, currency: 'BRL' } },
    { amount: { minorUnits: -1, currency: 'BRL' } },
    { amount: { minorUnits: 1, currency: 'USD' } },
    { origin: { kind: 'file', sourceId: '', externalId: 'x' } },
  ]) {
    const facts = scenario();
    facts.cardRefunds[0] = { ...facts.cardRefunds[0], ...changes };
    assert.throws(() => validateFacts(facts), RangeError);
  }
  const wrongCard = scenario();
  wrongCard.invoices.find((row) => row.id === 'fat-nov').cardId = 'missing';
  assert.throws(() => validateFacts(wrongCard), RangeError);
});

test('estornos parciais podem somar o principal inteiro, sem duplicação de ID/origem', () => {
  const facts = scenario();
  const first = facts.cardRefunds[0];
  facts.cardRefunds.push({
    ...first,
    id: 'refund-restante',
    invoiceId: 'fat-dez',
    amount: { minorUnits: 115000, currency: 'BRL' },
    origin: { ...first.origin, externalId: 'refund-restante' },
  });
  assert.doesNotThrow(() => validateFacts(facts));
  facts.cardRefunds[1].amount.minorUnits++;
  assert.throws(() => validateFacts(facts), /principal/);
  facts.cardRefunds[1].amount.minorUnits = 1;
  facts.cardRefunds[1].id = first.id;
  assert.throws(() => validateFacts(facts), /duplicado/);
  facts.cardRefunds[1].id = 'refund-restante';
  facts.cardRefunds[1].origin.externalId = first.origin.externalId;
  assert.throws(() => validateFacts(facts), /duplicada/);
});

test('precisão é verificada por agregado, sem total parcial ou moeda misturada', () => {
  const facts = scenario();
  facts.cardRefunds = [];
  facts.invoiceItems = [];
  facts.purchases = [];
  for (const id of ['a', 'b']) {
    facts.purchases.push({
      ...createDemoScenario().facts.purchases[0],
      id,
      total: { minorUnits: Number.MAX_SAFE_INTEGER, currency: 'BRL' },
      installmentCount: 1,
    });
    facts.invoiceItems.push({
      nature: 'observed',
      id,
      purchaseId: id,
      invoiceId: 'fat-nov',
      installmentNumber: 1,
      amount: { minorUnits: Number.MAX_SAFE_INTEGER, currency: 'BRL' },
    });
  }
  assert.doesNotThrow(() => validateFacts(facts));
  assert.throws(() => invoiceRegisteredAmounts(facts, 'fat-nov'), /precisão/);
  assert.throws(() => invoiceRegisteredAmounts(facts, 'missing'), /inexistente/);
});
