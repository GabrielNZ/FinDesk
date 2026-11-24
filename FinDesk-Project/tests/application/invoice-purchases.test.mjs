import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { invoicePurchases } = require('../../out/application/invoice-purchases.js');
const { cardInvoices, presentCardMoney } = require('../../out/application/card-invoices.js');
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
const query = (snapshot, invoice = 'fat-nov') =>
  invoicePurchases(snapshot, 'demo-a', 'card-demo', invoice);

test('F09a: itens, compra original e agenda mantêm centavos, origens e fatos sem somar pagamento ou contrato', () => {
  const snapshot = data(),
    before = JSON.stringify(snapshot),
    value = query(snapshot);
  assert.equal(value.rows.length, 3);
  assert.deepEqual(value.knownTotal, money(28324, 'BRL'));
  assert.equal(
    value.rows.reduce((sum, row) => sum + row.item.amount.minorUnits, 0),
    28324,
  );
  const six = value.rows.find((row) => row.purchase.id === 'compra-6x');
  assert.equal(six.item.amount.minorUnits, 20000);
  assert.equal(six.purchase.total.minorUnits, 120000);
  assert.equal(six.schedule.length, 6);
  assert.equal(six.knownScheduleTotal.minorUnits, 120000);
  assert.equal(six.afterCount, 5);
  assert.equal(six.afterKnownTotal.minorUnits, 100000);
  assert.equal(six.lastKnownDueOn, '2027-04-10');
  assert.equal(six.complete, true);
  assert.equal(six.missingInstallments, 0);
  assert.deepEqual(
    six.schedule.filter((entry) => entry.current).map((entry) => entry.item.installmentNumber),
    [1],
  );
  assert.deepEqual(
    six.purchase.origin,
    snapshot.facts.purchases.find((p) => p.id === six.purchase.id).origin,
  );
  const three = value.rows.find((row) => row.purchase.id === 'compra-3x');
  assert.deepEqual(
    three.schedule.map((entry) => entry.item.amount.minorUnits),
    [3334, 3333, 3333],
  );
  assert.equal(three.afterKnownTotal.minorUnits, 6666);
  assert.equal(value.rows.filter((row) => row.purchase.merchantId === 'loja').length, 2);
  const paid = query(snapshot, 'fat-out');
  assert.equal(paid.invoice.status, 'paid');
  assert.equal(paid.knownTotal.minorUnits, 26000);
  assert.equal(
    paid.rows.reduce((sum, row) => sum + row.item.amount.minorUnits, 0),
    26000,
  );
  assert.ok(paid.rows.every((row) => row.item.id !== 'mov-fat-out'));
  assert.equal(JSON.stringify(snapshot), before);
  assert.deepEqual(
    value.knownTotal,
    cardInvoices(snapshot, 'demo-a', 'card-demo').find((row) => row.invoice.id === 'fat-nov')
      .knownSubtotal,
  );
});

test('F09a: consulta respeita conta/cartão/fatura e mantém futuro sem itens como ausência', () => {
  const snapshot = data();
  for (const [account, card, invoice] of [
    ['demo-u', 'card-demo', 'fat-nov'],
    ['missing', 'card-demo', 'fat-nov'],
    ['demo-a', 'card-demo', 'fat-extra-nov'],
    ['demo-a', 'missing', 'fat-nov'],
    ['demo-a', 'card-demo', 'missing'],
  ])
    assert.equal(invoicePurchases(snapshot, account, card, invoice), null);
  assert.equal(
    invoicePurchases(snapshot, 'all', 'card-demo', 'fat-nov').knownTotal.minorUnits,
    28324,
  );
  const extra = invoicePurchases(snapshot, 'demo-a', 'card-demo-extra', 'fat-extra-nov');
  assert.equal(extra.rows.length, 1);
  assert.equal(extra.knownTotal.minorUnits, 8990);
  const empty = invoicePurchases(snapshot, 'all', 'card-demo-extra', 'fat-extra-dez');
  assert.deepEqual(empty.rows, []);
  assert.equal(empty.knownTotal, null);
  const future = query(snapshot, 'fat-dez');
  assert.equal(future.invoice.status, 'future');
  assert.equal(future.knownTotal.minorUnits, 23333);
  assert.ok(future.rows.every((row) => row.item.installmentNumber === 2));
});

test('F09a: agenda parcial conserva lacuna e posterior conhecido sem inferir término ou quitação', () => {
  const snapshot = data();
  snapshot.facts = {
    ...snapshot.facts,
    purchases: snapshot.facts.purchases.map((p) =>
      p.id === 'compra-6x' ? { ...p, scheduleCoverage: 'partial' } : p,
    ),
    invoiceItems: snapshot.facts.invoiceItems.filter((item) => item.id !== 'item-6x-3'),
  };
  const six = query(snapshot).rows.find((row) => row.purchase.id === 'compra-6x');
  assert.equal(six.complete, false);
  assert.equal(six.missingInstallments, 1);
  assert.deepEqual(
    six.schedule.map((entry) => entry.item.installmentNumber),
    [1, 2, 4, 5, 6],
  );
  assert.equal(six.afterCount, 4);
  assert.equal(six.afterKnownTotal.minorUnits, 80000);
  const last = query(snapshot, 'fat-abr').rows[0];
  assert.equal(last.afterCount, 0);
  assert.equal(last.afterKnownTotal.minorUnits, 0);
  assert.equal(last.complete, false);
});

test('F09a: posterior usa o vencimento da fatura e não repete outro item da própria fatura', () => {
  const snapshot = data();
  snapshot.facts = {
    ...snapshot.facts,
    invoiceItems: snapshot.facts.invoiceItems.map((item) =>
      item.id === 'item-6x-2' ? { ...item, invoiceId: 'fat-nov' } : item,
    ),
  };
  const value = query(snapshot),
    rows = value.rows.filter((row) => row.purchase.id === 'compra-6x');
  assert.equal(rows.length, 2);
  assert.equal(value.knownTotal.minorUnits, 48324);
  for (const row of rows) {
    assert.equal(row.afterCount, 4);
    assert.equal(row.afterKnownTotal.minorUnits, 80000);
    assert.equal(row.schedule.filter((entry) => entry.current).length, 2);
  }
});

test('F09a: soma fora de precisão não gera total parcial; duplicatas e vínculos inválidos são recusados', () => {
  const snapshot = data(),
    base = snapshot.facts.purchases[0];
  const large = [1, 2].map((index) => ({
    ...base,
    id: `large-${index}`,
    total: money(Number.MAX_SAFE_INTEGER, 'BRL'),
    installmentCount: 1,
  }));
  snapshot.facts = {
    ...snapshot.facts,
    purchases: [...snapshot.facts.purchases, ...large],
    invoiceItems: [
      ...snapshot.facts.invoiceItems,
      ...large.map((p) => ({
        id: `item-${p.id}`,
        purchaseId: p.id,
        invoiceId: 'fat-nov',
        installmentNumber: 1,
        amount: p.total,
        nature: 'observed',
      })),
    ],
  };
  const result = query(snapshot);
  assert.equal(result.knownTotal, null);
  assert.equal(result.rows.length, 5);
  const duplicate = snapshot.facts.invoiceItems[0];
  assert.throws(() =>
    query({
      ...snapshot,
      facts: { ...snapshot.facts, invoiceItems: [...snapshot.facts.invoiceItems, duplicate] },
    }),
  );
  assert.throws(() =>
    query({
      ...snapshot,
      facts: {
        ...snapshot.facts,
        invoiceItems: snapshot.facts.invoiceItems.map((item) =>
          item.id === duplicate.id ? { ...item, purchaseId: 'missing' } : item,
        ),
      },
    }),
  );
});

test('F09a: zero observado é diferente de fatura sem itens; moedas originais não se misturam', () => {
  const snapshot = data(),
    purchase = snapshot.facts.purchases.find((p) => p.id === 'compra-extra-demo');
  const usdCard = {
    ...snapshot.facts.cards[0],
    id: 'card-usd',
    accountId: 'demo-u',
    totalLimit: money(10000, 'USD'),
    usedLimit: money(3, 'USD'),
    availableLimit: money(9997, 'USD'),
  };
  const usdInvoice = {
    id: 'invoice-usd',
    cardId: usdCard.id,
    closesOn: '2026-11-02',
    dueOn: '2026-11-10',
    status: 'open',
    confirmedTotal: null,
    paidByMovementId: null,
  };
  const usdPurchase = {
    ...purchase,
    id: 'purchase-usd',
    cardId: usdCard.id,
    total: money(3, 'USD'),
  };
  snapshot.facts = {
    ...snapshot.facts,
    cards: [...snapshot.facts.cards, usdCard],
    invoices: [...snapshot.facts.invoices, usdInvoice],
    purchases: [...snapshot.facts.purchases, usdPurchase],
    invoiceItems: [
      ...snapshot.facts.invoiceItems,
      {
        id: 'usd-item',
        purchaseId: usdPurchase.id,
        invoiceId: usdInvoice.id,
        installmentNumber: 1,
        amount: usdPurchase.total,
        nature: 'observed',
      },
    ],
  };
  const usd = invoicePurchases(snapshot, 'all', usdCard.id, usdInvoice.id);
  assert.deepEqual(usd.knownTotal, money(3, 'USD'));
  assert.deepEqual(
    presentCardMoney(usd.knownTotal, 'BRL', snapshot.asOf, DEMO_EXCHANGE_RATE),
    money(15, 'BRL'),
  );
  assert.equal(query(snapshot).knownTotal.minorUnits, 28324);
  const zero = {
    ...snapshot,
    facts: {
      ...snapshot.facts,
      purchases: snapshot.facts.purchases.map((p) =>
        p.id === usdPurchase.id ? { ...p, total: money(0, 'USD') } : p,
      ),
      invoiceItems: snapshot.facts.invoiceItems.map((item) =>
        item.id === 'usd-item' ? { ...item, amount: money(0, 'USD') } : item,
      ),
    },
  };
  assert.deepEqual(
    invoicePurchases(zero, 'demo-u', usdCard.id, usdInvoice.id).knownTotal,
    money(0, 'USD'),
  );
});
