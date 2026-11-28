import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { cardFuture } = require('../../out/application/card-future.js');
const { createDemoScenario, DEMO_EXCHANGE_RATE } = require('../../out/fixtures/financas/demo.js');
const { withSeptemberHistory } = require('../../out/fixtures/financas/comparison-history.js');
const { withSecondCard } = require('../../out/fixtures/financas/card-wallet.js');
const { money } = require('../../out/domain/money.js');
function data() {
  const d = createDemoScenario();
  return withSecondCard(
    withSeptemberHistory({
      formatVersion: 1,
      seedId: 'demo-financas-v1',
      seedVersion: 1,
      asOf: d.clock.today(),
      timezone: d.timezone,
      facts: d.facts,
    }),
  );
}
const future = (
  s,
  id = 'fat-nov',
  card = 'card-demo',
  mode = 'original',
  rate = DEMO_EXCHANGE_RATE,
  account = 'demo-a',
) => cardFuture(s, account, card, id, mode, rate);
test('F09e: posterior conhecido conserva centavos/IDs e não soma atual, contrato, pagamento ou projeção', () => {
  const s = data(),
    before = JSON.stringify(s),
    q = future(s);
  assert.equal(q.original.minorUnits, 106666);
  assert.deepEqual(
    q.invoices.map((r) => [r.reading.invoice.id, r.original.minorUnits]),
    [
      ['fat-dez', 23333],
      ['fat-jan', 23333],
      ['fat-fev', 20000],
      ['fat-mar', 20000],
      ['fat-abr', 20000],
    ],
  );
  assert.equal(q.invoices.flatMap((r) => r.items).length, 7);
  assert.ok(q.invoices.every((r) => r.items.every((i) => i.kind === 'installment')));
  assert.equal(q.invoices[0].percent, 100);
  assert.equal(q.incompletePurchases, 0);
  assert.equal(JSON.stringify(s), before);
});
test('F09e: fronteiras e ausência/zero/total confirmado não substituem a base conhecida', () => {
  const s = data();
  assert.equal(future(s, 'missing'), null);
  assert.equal(future(s, 'fat-extra-nov'), null);
  assert.equal(future(s, 'fat-nov', 'card-demo', 'original', null, 'demo-u'), null);
  assert.deepEqual(future(s, 'fat-nov', 'card-demo', 'original', null, 'all'), future(s));
  assert.equal(future(s, 'fat-abr').invoices.length, 0);
  const empty = future(s, 'fat-extra-nov', 'card-demo-extra');
  assert.equal(empty.missingInvoices, 1);
  assert.equal(empty.value, null);
  s.facts = {
    ...s.facts,
    invoices: s.facts.invoices.map((i) =>
      i.id === 'fat-dez' ? { ...i, confirmedTotal: money(90000, 'BRL') } : i,
    ),
  };
  assert.equal(future(s).invoices[0].value.minorUnits, 23333);
  assert.equal(future(s).value.minorUnits, 106666);
  s.facts = {
    ...s.facts,
    purchases: s.facts.purchases.map((p) =>
      p.id === 'compra-extra-demo' ? { ...p, total: money(0, 'BRL') } : p,
    ),
    invoiceItems: s.facts.invoiceItems.map((i) =>
      i.id === 'item-extra-nov' ? { ...i, invoiceId: 'fat-extra-dez', amount: money(0, 'BRL') } : i,
    ),
  };
  const zero = future(s, 'fat-extra-nov', 'card-demo-extra');
  assert.deepEqual(zero.value, money(0, 'BRL'));
  assert.equal(zero.unavailable, null);
  assert.equal(zero.missingInvoices, 0);
});
test('F09e: histórico distingue recorrência registrada, parcelamento e à vista sem duplicação', () => {
  const s = data();
  assert.equal(future(s, 'fat-out').value.minorUnits, 134990);
  assert.equal(
    future(s, 'fat-out').invoices[0].items.find((i) => i.purchase.id === 'compra-netflix-out').kind,
    'recurring',
  );
  s.facts = {
    ...s.facts,
    purchases: s.facts.purchases.map((p) =>
      p.id === 'compra-6x' ? { ...p, subscriptionId: 'sub-card' } : p,
    ),
  };
  assert.equal(future(s).value.minorUnits, 106666);
  assert.ok(
    future(s).invoices.every((r) =>
      r.items.filter((i) => i.purchase.id === 'compra-6x').every((i) => i.kind === 'installment'),
    ),
  );
  s.facts = {
    ...s.facts,
    invoiceItems: s.facts.invoiceItems.map((i) =>
      i.id === 'item-extra-nov' ? { ...i, invoiceId: 'fat-extra-dez' } : i,
    ),
  };
  assert.equal(future(s, 'fat-extra-nov', 'card-demo-extra').invoices[0].items[0].kind, 'other');
});
test('F09e: agenda parcial e lacunas permanecem explícitas, sem gerar meses ou unir faturas', () => {
  const s = data();
  s.facts = {
    ...s.facts,
    purchases: s.facts.purchases.map((p) =>
      p.id === 'compra-6x' ? { ...p, scheduleCoverage: 'partial' } : p,
    ),
    invoiceItems: s.facts.invoiceItems.filter((i) => i.invoiceId !== 'fat-mar'),
    invoices: s.facts.invoices.map((i) =>
      i.id === 'fat-jan'
        ? { ...i, dueOn: '2026-12-20' }
        : i.id === 'fat-abr'
          ? { ...i, dueOn: '2036-04-10' }
          : i,
    ),
  };
  const q = future(s);
  assert.equal(q.incompletePurchases, 1);
  assert.equal(q.missingInvoices, 1);
  assert.equal(q.invoices.length, 5);
  assert.equal(q.invoices.filter((r) => r.reading.invoice.dueOn.startsWith('2026-12')).length, 2);
  assert.equal(q.invoices.at(-1).reading.invoice.dueOn, '2036-04-10');
  assert.equal(q.value.minorUnits, 86666);
});
test('F09e: fatura posterior paga conserva estado real sem transformá-la em cobrança a pagar', () => {
  const s = data(),
    payment = s.facts.movements.find((m) => m.kind === 'invoice-payment');
  s.facts = {
    ...s.facts,
    invoices: s.facts.invoices.map((i) =>
      i.id === 'fat-dez'
        ? {
            ...i,
            status: 'paid',
            confirmedTotal: money(23333, 'BRL'),
            paidByMovementId: 'paid-dec',
          }
        : i,
    ),
    movements: [
      ...s.facts.movements,
      {
        ...payment,
        id: 'paid-dec',
        on: '2026-12-10',
        invoiceId: 'fat-dez',
        delta: money(-23333, 'BRL'),
        origin: { ...payment.origin, externalId: 'paid-dec' },
      },
    ],
  };
  assert.equal(future(s).invoices[0].reading.invoice.status, 'paid');
  assert.equal(future(s).value.minorUnits, 106666);
});
test('F09e: conversão uma vez por agregado, originais preservados, taxa ausente/futura indisponível', () => {
  const s = data(),
    q = future(s, 'fat-nov', 'card-demo', 'USD');
  assert.deepEqual(q.value, money(21333, 'USD'));
  assert.equal(q.original.minorUnits, 106666);
  assert.equal(
    q.invoices.reduce((sum, r) => sum + r.value.minorUnits, 0),
    21334,
  );
  assert.equal(q.invoices[0].original.minorUnits, 23333);
  assert.equal(future(s, 'fat-nov', 'card-demo', 'USD', null).unavailable, 'conversion');
  assert.equal(
    future(s, 'fat-nov', 'card-demo', 'USD', { ...DEMO_EXCHANGE_RATE, on: '2026-11-01' }).value,
    null,
  );
});
test('F09e: soma extrema recusa subtotal parcial; duplicatas e vínculos inválidos são recusados', () => {
  const s = data(),
    base = s.facts.purchases.find((p) => p.id === 'compra-extra-demo');
  const large = [1, 2].map((n) => ({
    ...base,
    id: `large-${n}`,
    total: money(Number.MAX_SAFE_INTEGER, 'BRL'),
  }));
  const dec = s.facts.invoices.find((i) => i.id === 'fat-extra-dez');
  s.facts = {
    ...s.facts,
    invoices: [
      ...s.facts.invoices,
      { ...dec, id: 'extra-jan', closesOn: '2027-01-03', dueOn: '2027-01-12' },
    ],
    purchases: [...s.facts.purchases, ...large],
    invoiceItems: [
      ...s.facts.invoiceItems,
      ...large.map((p, i) => ({
        id: `item-${p.id}`,
        purchaseId: p.id,
        invoiceId: i === 0 ? 'fat-extra-dez' : 'extra-jan',
        installmentNumber: 1,
        amount: p.total,
        nature: 'observed',
      })),
    ],
  };
  const q = future(s, 'fat-extra-nov', 'card-demo-extra');
  assert.equal(q.value, null);
  assert.equal(q.unavailable, 'precision');
  assert.ok(q.invoices.every((r) => r.original.minorUnits === Number.MAX_SAFE_INTEGER));
  assert.throws(() =>
    future({
      ...s,
      facts: { ...s.facts, invoiceItems: [...s.facts.invoiceItems, s.facts.invoiceItems[0]] },
    }),
  );
});
