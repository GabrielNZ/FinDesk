import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { invoiceEvolution } = require('../../out/application/invoice-evolution.js');
const { createDemoScenario, DEMO_EXCHANGE_RATE } = require('../../out/fixtures/financas/demo.js');
const { withSeptemberHistory } = require('../../out/fixtures/financas/comparison-history.js');
const { withSecondCard } = require('../../out/fixtures/financas/card-wallet.js');
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
const plot = (
  s,
  card = 'card-demo',
  currency = 'original',
  rate = DEMO_EXCHANGE_RATE,
  account = 'demo-a',
) => invoiceEvolution(s, account, card, currency, rate);

test('F09b: uma coluna por fatura, confirmado/conhecido, escala e parcelas sem somar pagamento ou contrato', () => {
  const s = data(),
    before = JSON.stringify(s),
    result = plot(s);
  assert.equal(result.columns.length, 7);
  assert.deepEqual(
    result.invoices.map((r) => r.month),
    ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04'],
  );
  assert.deepEqual(
    result.invoices.map((r) => r.value.minorUnits),
    [26000, 28324, 23333, 23333, 20000, 20000, 20000],
  );
  assert.deepEqual(
    result.invoices.map((r) => r.basis),
    ['confirmed', 'known', 'known', 'known', 'known', 'known', 'known'],
  );
  assert.deepEqual(
    result.ticks.map((t) => t.minorUnits),
    [30000, 20000, 10000, 0],
  );
  assert.equal(result.invoices[1].height, 94.41);
  assert.equal(result.invoices[0].reading.invoice.status, 'paid');
  assert.equal(JSON.stringify(s), before);
  s.facts = {
    ...s.facts,
    invoices: s.facts.invoices.map((i) =>
      i.id === 'fat-nov' ? { ...i, confirmedTotal: money(50000, 'BRL') } : i,
    ),
  };
  const differing = plot(s).invoices[1];
  assert.equal(differing.value.minorUnits, 50000);
  assert.equal(differing.reading.knownSubtotal.minorUnits, 28324);
  assert.equal(differing.basis, 'confirmed');
});
test('F09b: conta/cartão, mês sem itens, zero conhecido e zero confirmado permanecem distintos', () => {
  const s = data();
  assert.equal(plot(s, 'card-demo', 'original', null, 'demo-u'), null);
  assert.equal(plot(s, 'missing'), null);
  assert.equal(plot(s, 'card-demo', 'original', null, 'all').columns.length, 7);
  const extra = plot(s, 'card-demo-extra');
  assert.equal(extra.invoices[0].value.minorUnits, 8990);
  assert.equal(extra.invoices[1].value, null);
  assert.equal(extra.invoices[1].basis, null);
  assert.equal(extra.invoices[1].unavailable, 'no-items');
  s.facts = {
    ...s.facts,
    invoices: s.facts.invoices.map((i) =>
      i.id === 'fat-extra-dez' ? { ...i, status: 'closed', confirmedTotal: money(0, 'BRL') } : i,
    ),
  };
  const zero = plot(s, 'card-demo-extra').invoices[1];
  assert.deepEqual(zero.value, money(0, 'BRL'));
  assert.equal(zero.basis, 'confirmed');
  assert.equal(zero.unavailable, null);
  assert.equal(zero.height, 0);
  s.facts = {
    ...s.facts,
    purchases: s.facts.purchases.map((p) =>
      p.id === 'compra-extra-demo' ? { ...p, total: money(0, 'BRL') } : p,
    ),
    invoiceItems: s.facts.invoiceItems.map((i) =>
      i.id === 'item-extra-nov' ? { ...i, amount: money(0, 'BRL') } : i,
    ),
  };
  assert.equal(plot(s, 'card-demo-extra').invoices[0].basis, 'known');
  assert.deepEqual(plot(s, 'card-demo-extra').invoices[0].value, money(0, 'BRL'));
});
test('F09b: lacunas longas são explícitas e limitadas, sem gerar faturas ou agregar duas do mesmo mês', () => {
  const s = data();
  s.facts = {
    ...s.facts,
    invoices: s.facts.invoices.map((i) =>
      i.id === 'fat-extra-dez' ? { ...i, dueOn: '2036-12-12' } : i,
    ),
  };
  const gaps = plot(s, 'card-demo-extra');
  assert.equal(gaps.columns.length, 3);
  assert.equal(gaps.columns[1].kind, 'gap');
  assert.equal(gaps.columns[1].count, 120);
  assert.equal(gaps.columns[1].month, '2026-12');
  assert.equal(gaps.columns[1].endMonth, '2036-11');
  s.facts = {
    ...s.facts,
    invoices: s.facts.invoices.map((i) => (i.id === 'fat-jan' ? { ...i, dueOn: '2026-12-20' } : i)),
  };
  const same = plot(s);
  assert.equal(same.invoices.filter((r) => r.month === '2026-12').length, 2);
  assert.deepEqual(
    same.invoices.filter((r) => r.month === '2026-12').map((r) => r.key),
    ['fat-dez', 'fat-jan'],
  );
  assert.equal(same.columns.find((r) => r.kind === 'gap').month, '2027-01');
});
test('F09b: conversão arredonda cada fatura uma vez, conserva originais e recusa taxa ausente/futura', () => {
  const s = data();
  const usd = plot(s, 'card-demo', 'USD');
  assert.deepEqual(
    usd.invoices.map((r) => r.value.minorUnits),
    [5200, 5665, 4667, 4667, 4000, 4000, 4000],
  );
  assert.ok(usd.invoices.every((r) => r.value.currency === 'USD' && r.original.currency === 'BRL'));
  assert.equal(usd.invoices[1].original.minorUnits, 28324);
  assert.ok(
    plot(s, 'card-demo', 'USD', null).invoices.every(
      (r) => r.value === null && r.unavailable === 'conversion',
    ),
  );
  assert.ok(
    plot(s, 'card-demo', 'USD', { ...DEMO_EXCHANGE_RATE, on: '2026-11-01' }).invoices.every(
      (r) => r.value === null,
    ),
  );
  s.facts = {
    ...s.facts,
    cards: s.facts.cards.map((c) =>
      c.id === 'card-demo-extra'
        ? {
            ...c,
            accountId: 'demo-u',
            totalLimit: money(150000, 'USD'),
            usedLimit: money(8990, 'USD'),
            availableLimit: money(141010, 'USD'),
          }
        : c,
    ),
    purchases: s.facts.purchases.map((p) =>
      p.id === 'compra-extra-demo' ? { ...p, total: money(8990, 'USD') } : p,
    ),
    invoiceItems: s.facts.invoiceItems.map((i) =>
      i.id === 'item-extra-nov' ? { ...i, amount: money(8990, 'USD') } : i,
    ),
  };
  const originalUsd = plot(s, 'card-demo-extra', 'original', null, 'all');
  assert.deepEqual(originalUsd.invoices[0].value, money(8990, 'USD'));
  assert.ok(originalUsd.ticks.every((t) => t.currency === 'USD'));
  assert.equal(plot(s).invoices[1].value.minorUnits, 28324);
});
test('F09b: excesso de precisão não vira barra parcial; escala extrema permanece segura; vínculo inválido é recusado', () => {
  const s = data(),
    base = s.facts.purchases.find((p) => p.id === 'compra-extra-demo');
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
  const row = plot(s, 'card-demo-extra').invoices[0];
  assert.equal(row.value, null);
  assert.equal(row.height, 0);
  assert.equal(row.unavailable, 'precision');
  s.facts = {
    ...s.facts,
    invoices: s.facts.invoices.map((i) =>
      i.id === 'fat-extra-nov'
        ? { ...i, confirmedTotal: money(Number.MAX_SAFE_INTEGER, 'BRL') }
        : i,
    ),
  };
  const extreme = plot(s, 'card-demo-extra');
  assert.equal(extreme.invoices[0].height, 100);
  assert.ok(extreme.ticks.every((t) => Number.isSafeInteger(t.minorUnits)));
  assert.throws(() =>
    plot({
      ...s,
      facts: { ...s.facts, invoiceItems: [...s.facts.invoiceItems, s.facts.invoiceItems[0]] },
    }),
  );
});
