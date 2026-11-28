import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { invoiceMerchants } = require('../../out/application/invoice-merchants.js');
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
const compose = (
  s,
  invoice = 'fat-nov',
  card = 'card-demo',
  mode = 'original',
  rate = DEMO_EXCHANGE_RATE,
  account = 'demo-a',
) => invoiceMerchants(s, account, card, invoice, mode, rate);

test('F09d: agrupa parcelas por estabelecimento, conserva IDs e não duplica contrato ou pagamento', () => {
  const s = data(),
    before = JSON.stringify(s),
    result = compose(s);
  assert.equal(result.value.minorUnits, 28324);
  assert.deepEqual(
    result.parts.map((p) => [p.merchantId, p.original.minorUnits, p.itemIds.length, p.share]),
    [
      ['loja', 23334, 2, '82,4%'],
      ['netflix', 4990, 1, '17,6%'],
    ],
  );
  assert.equal(
    result.parts.reduce((sum, p) => sum + p.original.minorUnits, 0),
    28324,
  );
  assert.equal(result.parts.flatMap((p) => p.itemIds).length, 3);
  assert.equal(result.parts[0].percent, 82.3824);
  assert.equal(result.unavailable, null);
  assert.deepEqual(
    compose(s, 'fat-out').parts.map((p) => [p.merchantId, p.original.minorUnits]),
    [
      ['loja', 12010],
      ['mercado', 10000],
      ['netflix', 3990],
    ],
  );
  assert.equal(JSON.stringify(s), before);
  s.facts = {
    ...s.facts,
    invoiceItems: [...s.facts.invoiceItems].reverse(),
    purchases: [...s.facts.purchases].reverse(),
  };
  assert.deepEqual(compose(s), result);
});
test('F09d: limita conta/cartão/fatura e usa a base conhecida mesmo com total confirmado diferente', () => {
  const s = data();
  assert.equal(compose(s, 'missing'), null);
  assert.equal(compose(s, 'fat-extra-nov'), null);
  assert.equal(compose(s, 'fat-nov', 'card-demo', 'original', null, 'demo-u'), null);
  assert.equal(compose(s, 'fat-extra-nov', 'card-demo-extra').value.minorUnits, 8990);
  assert.deepEqual(compose(s, 'fat-nov', 'card-demo', 'original', null, 'all'), compose(s));
  s.facts = {
    ...s.facts,
    invoices: s.facts.invoices.map((i) =>
      i.id === 'fat-nov' ? { ...i, confirmedTotal: money(50000, 'BRL') } : i,
    ),
  };
  assert.equal(compose(s).value.minorUnits, 28324);
  assert.equal(compose(s).parts[0].share, '82,4%');
  assert.equal(compose(s).reading.invoice.confirmedTotal.minorUnits, 50000);
});
test('F09d: estabelecimento pode conter categorias diferentes; IDs diferentes e empates permanecem estáveis', () => {
  const s = data();
  s.facts = {
    ...s.facts,
    purchases: s.facts.purchases.map((p) =>
      p.id === 'compra-3x' ? { ...p, categoryId: null } : p,
    ),
  };
  assert.deepEqual(compose(s).parts[0].categoryIds, [null, 'casa']);
  const base = s.facts.purchases.find((p) => p.id === 'compra-extra-demo');
  s.facts = {
    ...s.facts,
    purchases: [
      ...s.facts.purchases.map((p) =>
        p.id === base.id ? { ...p, total: money(100, 'BRL'), merchantId: 'same-name-b' } : p,
      ),
      { ...base, id: 'other-purchase', total: money(100, 'BRL'), merchantId: 'same-name-a' },
    ],
    invoiceItems: [
      ...s.facts.invoiceItems.map((i) =>
        i.id === 'item-extra-nov' ? { ...i, amount: money(100, 'BRL') } : i,
      ),
      {
        id: 'other-item',
        purchaseId: 'other-purchase',
        invoiceId: 'fat-extra-nov',
        installmentNumber: 1,
        amount: money(100, 'BRL'),
        nature: 'observed',
      },
    ],
  };
  assert.deepEqual(
    compose(s, 'fat-extra-nov', 'card-demo-extra').parts.map((p) => [p.merchantId, p.share]),
    [
      ['same-name-a', '50,0%'],
      ['same-name-b', '50,0%'],
    ],
  );
});
test('F09d: fatura sem itens e grupo conhecido zero são distintos, sem percentuais inventados', () => {
  const s = data(),
    empty = compose(s, 'fat-extra-dez', 'card-demo-extra');
  assert.equal(empty.unavailable, 'no-items');
  assert.equal(empty.value, null);
  s.facts = {
    ...s.facts,
    invoices: s.facts.invoices.map((i) =>
      i.id === 'fat-extra-dez' ? { ...i, confirmedTotal: money(0, 'BRL') } : i,
    ),
    purchases: s.facts.purchases.map((p) =>
      p.id === 'compra-extra-demo' ? { ...p, total: money(0, 'BRL') } : p,
    ),
    invoiceItems: s.facts.invoiceItems.map((i) =>
      i.id === 'item-extra-nov' ? { ...i, amount: money(0, 'BRL') } : i,
    ),
  };
  assert.equal(compose(s, 'fat-extra-dez', 'card-demo-extra').unavailable, 'no-items');
  const zero = compose(s, 'fat-extra-nov', 'card-demo-extra');
  assert.equal(zero.unavailable, null);
  assert.deepEqual(zero.value, money(0, 'BRL'));
  assert.equal(zero.parts.length, 1);
  assert.equal(zero.parts[0].share, null);
  assert.equal(zero.parts[0].percent, null);
});
test('F09d: converte cada agregado uma vez, preserva proporções e originais, recusa taxa ausente/futura', () => {
  const s = data();
  const usd = compose(s, 'fat-nov', 'card-demo', 'USD');
  assert.equal(usd.parts[0].original.minorUnits, 23334);
  assert.deepEqual(usd.parts[0].value, money(4667, 'USD'));
  assert.equal(usd.parts[0].share, '82,4%');
  assert.equal(compose(s, 'fat-nov', 'card-demo', 'USD', null).unavailable, 'conversion');
  assert.equal(
    compose(s, 'fat-nov', 'card-demo', 'USD', { ...DEMO_EXCHANGE_RATE, on: '2026-11-01' })
      .unavailable,
    'conversion',
  );
  assert.equal(compose(s, 'fat-nov', 'card-demo', 'BRL', null).unavailable, null);
  const rounding = structuredClone(s);
  const base = rounding.facts.purchases.find((p) => p.id === 'compra-extra-demo');
  const small = [1, 2].map((n) => ({
    ...base,
    id: `rounding-${n}`,
    merchantId: 'rounding',
    total: money(3, 'BRL'),
  }));
  rounding.facts = {
    ...rounding.facts,
    purchases: [...rounding.facts.purchases, ...small],
    invoiceItems: [
      ...rounding.facts.invoiceItems,
      ...small.map((p) => ({
        id: `item-${p.id}`,
        purchaseId: p.id,
        invoiceId: 'fat-extra-nov',
        installmentNumber: 1,
        amount: p.total,
        nature: 'observed',
      })),
    ],
  };
  const grouped = compose(rounding, 'fat-extra-nov', 'card-demo-extra', 'USD').parts.find(
    (p) => p.merchantId === 'rounding',
  );
  assert.equal(grouped.original.minorUnits, 6);
  // 6 / 5 arredonda para 1; converter cada item de 3 centavos separadamente daria 2.
  assert.equal(grouped.value.minorUnits, 1);
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
  const original = compose(s, 'fat-extra-nov', 'card-demo-extra', 'original', null, 'all');
  assert.deepEqual(original.value, money(8990, 'USD'));
  assert.equal(
    compose(s, 'fat-extra-nov', 'card-demo-extra', 'BRL', DEMO_EXCHANGE_RATE, 'all').value
      .minorUnits,
    44950,
  );
});
test('F09d: excesso de precisão não expõe grupos parciais e vínculos inválidos são recusados', () => {
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
  const result = compose(s, 'fat-extra-nov', 'card-demo-extra');
  assert.equal(result.unavailable, 'precision');
  assert.equal(result.value, null);
  assert.deepEqual(result.parts, []);
  assert.throws(() =>
    compose({
      ...s,
      facts: { ...s.facts, invoiceItems: [...s.facts.invoiceItems, s.facts.invoiceItems[0]] },
    }),
  );
});
