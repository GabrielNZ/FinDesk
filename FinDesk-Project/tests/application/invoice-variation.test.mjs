import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { invoiceVariation } = require('../../out/application/invoice-variation.js');
const { createDemoScenario, DEMO_EXCHANGE_RATE } = require('../../out/fixtures/financas/demo.js');
const { withSecondCard } = require('../../out/fixtures/financas/card-wallet.js');
const { withSeptemberHistory } = require('../../out/fixtures/financas/comparison-history.js');
const { money } = require('../../out/domain/money.js');
function data() {
  const demo = createDemoScenario();
  return withSecondCard(
    withSeptemberHistory({
      formatVersion: 1,
      seedId: 'demo-financas-v1',
      seedVersion: 1,
      asOf: demo.clock.today(),
      timezone: demo.timezone,
      facts: demo.facts,
    }),
  );
}
const compare = (
  s,
  id = 'fat-nov',
  currency = 'original',
  rate = DEMO_EXCHANGE_RATE,
  card = 'card-demo',
  account = 'demo-a',
) => invoiceVariation(s, account, card, id, currency, rate);
function invoices(s, changes) {
  s.facts = {
    ...s.facts,
    invoices: s.facts.invoices.map((row) => ({ ...row, ...changes[row.id] })),
  };
}

test('F09c: anterior do mesmo cartão, sinais, virada do ano e Parcial sem duplicar contrato/pagamento', () => {
  const s = data(),
    before = JSON.stringify(s);
  const nov = compare(s);
  assert.equal(nov.reference.invoice.id, 'fat-out');
  assert.deepEqual(nov.original, money(2324, 'BRL'));
  assert.equal(nov.percentage, '+8,9%');
  assert.equal(nov.partial, true);
  assert.equal(nov.unavailable, null);
  const dec = compare(s, 'fat-dez');
  assert.equal(dec.reference.invoice.id, 'fat-nov');
  assert.equal(dec.original.minorUnits, -4991);
  assert.equal(dec.percentage, '−17,6%');
  const jan = compare(s, 'fat-jan');
  assert.equal(jan.reference.invoice.id, 'fat-dez');
  assert.equal(jan.original.minorUnits, 0);
  assert.equal(jan.percentage, '0,0%');
  assert.equal(jan.partial, true);
  assert.equal(JSON.stringify(s), before);
  assert.equal(
    compare(s, 'fat-extra-nov', 'original', null, 'card-demo-extra').unavailable,
    'no-previous',
  );
  assert.equal(compare(s, 'fat-nov', 'original', null, 'card-demo-extra'), null);
  assert.equal(compare(s, 'fat-nov', 'original', null, 'card-demo', 'demo-u'), null);
  assert.deepEqual(compare(s, 'fat-nov', 'original', null, 'card-demo', 'all'), nov);
});
test('F09c: confirmado prioritário em ambos os lados, zero real e arredondamento simétrico de empate', () => {
  const s = data();
  invoices(s, {
    'fat-dez': { confirmedTotal: money(2000, 'BRL') },
    'fat-jan': { confirmedTotal: money(2001, 'BRL') },
  });
  assert.equal(compare(s, 'fat-jan').percentage, '+0,1%');
  assert.equal(compare(s, 'fat-jan').partial, false);
  invoices(s, { 'fat-jan': { confirmedTotal: money(1999, 'BRL') } });
  assert.equal(compare(s, 'fat-jan').percentage, '−0,1%');
  invoices(s, { 'fat-dez': { confirmedTotal: money(0, 'BRL') } });
  assert.equal(compare(s, 'fat-jan').percentage, null);
  assert.equal(compare(s, 'fat-jan').value.minorUnits, 1999);
  invoices(s, { 'fat-jan': { confirmedTotal: money(0, 'BRL') } });
  assert.deepEqual(compare(s, 'fat-jan').value, money(0, 'BRL'));
  assert.equal(compare(s, 'fat-jan').unavailable, null);
});
test('F09c: ausência não é zero e não pula a anterior sem valor para procurar referência favorável', () => {
  const s = data();
  assert.equal(compare(s, 'fat-out').unavailable, 'no-previous');
  assert.equal(
    compare(s, 'fat-extra-dez', 'original', null, 'card-demo-extra').unavailable,
    'no-items',
  );
  invoices(s, { 'fat-extra-dez': { confirmedTotal: money(0, 'BRL') } });
  assert.equal(
    compare(s, 'fat-extra-dez', 'original', null, 'card-demo-extra').value.minorUnits,
    -8990,
  );
  s.facts = {
    ...s.facts,
    invoiceItems: s.facts.invoiceItems.filter((row) => row.invoiceId !== 'fat-nov'),
    purchases: s.facts.purchases.map((row) => ({ ...row, scheduleCoverage: 'partial' })),
  };
  const missing = compare(s, 'fat-dez');
  assert.equal(missing.reference.invoice.id, 'fat-nov');
  assert.equal(missing.unavailable, 'no-items');
});
test('F09c: lacuna mantém referência real e vencimentos empatados não usam ID/fechamento como ordem', () => {
  const s = data();
  invoices(s, { 'fat-extra-dez': { dueOn: '2036-12-12', confirmedTotal: money(9000, 'BRL') } });
  const gap = compare(s, 'fat-extra-dez', 'original', null, 'card-demo-extra');
  assert.equal(gap.reference.invoice.dueOn.slice(0, 7), '2026-11');
  assert.equal(gap.original.minorUnits, 10);
  invoices(s, { 'fat-jan': { dueOn: '2026-12-10' } });
  assert.equal(compare(s, 'fat-jan').unavailable, 'ambiguous');
  assert.equal(compare(s, 'fat-dez').unavailable, 'ambiguous');
  assert.equal(compare(s, 'fat-fev').unavailable, 'ambiguous');
  invoices(s, { 'fat-jan': { dueOn: '2026-12-20' } });
  assert.equal(compare(s, 'fat-jan').reference.invoice.id, 'fat-dez');
});
test('F09c: diferença convertida uma vez, percentual original, taxa ausente/futura e precisão extrema', () => {
  const s = data();
  invoices(s, {
    'fat-dez': { confirmedTotal: money(1, 'BRL') },
    'fat-jan': { confirmedTotal: money(3, 'BRL') },
  });
  const usd = compare(s, 'fat-jan', 'USD');
  assert.deepEqual(usd.original, money(2, 'BRL'));
  assert.deepEqual(usd.value, money(0, 'USD'));
  assert.equal(usd.percentage, '+200,0%');
  assert.equal(compare(s, 'fat-jan', 'USD', null).unavailable, 'conversion');
  assert.equal(
    compare(s, 'fat-jan', 'USD', { ...DEMO_EXCHANGE_RATE, on: '2026-11-01' }).unavailable,
    'conversion',
  );
  assert.equal(compare(s, 'fat-jan', 'BRL', null).unavailable, null);
  invoices(s, { 'fat-jan': { confirmedTotal: money(Number.MAX_SAFE_INTEGER, 'BRL') } });
  assert.equal(compare(s, 'fat-jan').percentage, '+900719925474099000,0%');
  const base = s.facts.purchases.find((p) => p.id === 'compra-extra-demo');
  const large = [1, 2].map((n) => ({
    ...base,
    id: `large-${n}`,
    total: money(Number.MAX_SAFE_INTEGER, 'BRL'),
  }));
  s.facts = {
    ...s.facts,
    purchases: [...s.facts.purchases, ...large],
    invoiceItems: [
      ...s.facts.invoiceItems,
      ...large.map((p) => ({
        id: `item-${p.id}`,
        purchaseId: p.id,
        invoiceId: 'fat-extra-nov',
        installmentNumber: 1,
        amount: p.total,
        nature: 'observed',
      })),
    ],
  };
  assert.equal(
    compare(s, 'fat-extra-dez', 'original', null, 'card-demo-extra').unavailable,
    'precision',
  );
  assert.throws(() =>
    compare({
      ...s,
      facts: { ...s.facts, invoiceItems: [...s.facts.invoiceItems, s.facts.invoiceItems[0]] },
    }),
  );
});
