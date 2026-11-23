import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  walletCards,
  cardInvoices,
  preferredInvoice,
  presentCardMoney,
} = require('../../out/application/card-invoices.js');
const { createDemoScenario, DEMO_EXCHANGE_RATE } = require('../../out/fixtures/financas/demo.js');
const { withSeptemberHistory } = require('../../out/fixtures/financas/comparison-history.js');
const { withSecondCard } = require('../../out/fixtures/financas/card-wallet.js');
const { accountBalanceAt } = require('../../out/domain/finance.js');
const { money } = require('../../out/domain/money.js');

function legacyWallet() {
  const demo = createDemoScenario();
  return withSeptemberHistory({
    formatVersion: 1,
    seedId: 'demo-financas-v1',
    seedVersion: 1,
    asOf: demo.clock.today(),
    timezone: demo.timezone,
    facts: demo.facts,
  });
}

test('F08a: carteira filtra conta, mantém faturas próprias e não altera snapshot ou saldos', () => {
  const previous = legacyWallet(),
    before = JSON.stringify(previous),
    data = withSecondCard(previous);
  assert.equal(JSON.stringify(previous), before);
  assert.equal(data.seedVersion, 3);
  assert.equal(withSecondCard(data), data);
  assert.equal(withSeptemberHistory(data), data);
  for (const account of data.facts.accounts)
    assert.deepEqual(
      accountBalanceAt(data.facts, account.id, data.asOf),
      accountBalanceAt(previous.facts, account.id, previous.asOf),
    );
  for (const key of ['accounts', 'movements', 'salaries', 'subscriptions', 'coverage'])
    assert.deepEqual(data.facts[key], previous.facts[key]);
  for (const key of ['cards', 'purchases', 'invoices', 'invoiceItems'])
    assert.deepEqual(data.facts[key].slice(0, previous.facts[key].length), previous.facts[key]);
  assert.equal(walletCards(data, 'demo-a').length, 2);
  assert.equal(walletCards(data, 'all').length, 2);
  assert.equal(walletCards(data, 'demo-u').length, 0);
  assert.equal(walletCards(data, 'missing').length, 0);
  assert.deepEqual(cardInvoices(data, 'demo-u', 'card-demo'), []);
  const invoices = cardInvoices(data, 'demo-a', 'card-demo');
  assert.equal(preferredInvoice(invoices), 'fat-nov');
  assert.deepEqual(
    invoices.find((r) => r.invoice.id === 'fat-nov').knownSubtotal,
    money(28324, 'BRL'),
  );
  assert.equal(invoices.find((r) => r.invoice.id === 'fat-nov').invoice.confirmedTotal, null);
  assert.deepEqual(invoices[0].invoice.confirmedTotal, money(26000, 'BRL'));
  const extra = cardInvoices(data, 'all', 'card-demo-extra');
  assert.ok(extra.every((r) => r.invoice.cardId === 'card-demo-extra'));
  assert.deepEqual(extra[0].knownSubtotal, money(8990, 'BRL'));
  assert.equal(extra[1].knownSubtotal, null);
  assert.equal(extra[1].itemCount, 0);
});

test('F08a: atualização recusa colisões e versões desconhecidas sem mutar dados', () => {
  for (const [key, id] of [
    ['cards', 'card-demo-extra'],
    ['purchases', 'compra-extra-demo'],
    ['invoices', 'fat-extra-nov'],
    ['invoices', 'fat-extra-dez'],
    ['invoiceItems', 'item-extra-nov'],
  ]) {
    const data = legacyWallet();
    data.facts = { ...data.facts, [key]: [...data.facts[key], { ...data.facts[key][0], id }] };
    const bytes = JSON.stringify(data);
    assert.throws(() => withSecondCard(data));
    assert.equal(JSON.stringify(data), bytes);
  }
  assert.throws(() => withSecondCard({ ...legacyWallet(), seedVersion: 99 }));
  assert.throws(() => withSecondCard({ ...legacyWallet(), seedVersion: 1 }));
});

test('F08a: prioridade, ordenação e conversão preservam zero confirmado e moedas originais', () => {
  const data = withSecondCard(legacyWallet());
  data.facts = { ...data.facts, invoices: [...data.facts.invoices].reverse() };
  const readings = cardInvoices(data, 'demo-a', 'card-demo');
  assert.equal(readings[0].invoice.id, 'fat-out');
  assert.equal(preferredInvoice([]), null);
  assert.equal(preferredInvoice(readings.filter((r) => r.invoice.status === 'paid')), 'fat-out');
  const closed = { ...readings[0], invoice: { ...readings[0].invoice, status: 'closed' } };
  assert.equal(preferredInvoice([closed, ...readings.slice(1)]), 'fat-out');
  const amount = money(28324, 'BRL');
  assert.deepEqual(
    presentCardMoney(amount, 'USD', data.asOf, DEMO_EXCHANGE_RATE),
    money(5665, 'USD'),
  );
  assert.equal(presentCardMoney(amount, 'original', data.asOf, null), amount);
  assert.equal(presentCardMoney(amount, 'USD', data.asOf, null), null);
  assert.equal(
    presentCardMoney(amount, 'USD', data.asOf, { ...DEMO_EXCHANGE_RATE, on: '2026-10-30' }),
    null,
  );
  assert.deepEqual(
    presentCardMoney(money(0, 'BRL'), 'USD', data.asOf, DEMO_EXCHANGE_RATE),
    money(0, 'USD'),
  );
  assert.equal(presentCardMoney(null, 'USD', data.asOf, DEMO_EXCHANGE_RATE), null);
  assert.deepEqual(amount, money(28324, 'BRL'));
});

test('F08a: soma insegura não produz subtotal parcial; zero confirmado e falta de faturas são distintos', () => {
  const data = withSecondCard(legacyWallet());
  const base = data.facts.purchases.find((p) => p.cardId === 'card-demo-extra');
  const large = [1, 2].map((index) => ({
    ...base,
    id: `large-${index}`,
    total: money(Number.MAX_SAFE_INTEGER, 'BRL'),
  }));
  const zeroInvoice = data.facts.invoices.find((i) => i.id === 'fat-extra-dez');
  data.facts = {
    ...data.facts,
    purchases: [...data.facts.purchases, ...large],
    invoiceItems: [
      ...data.facts.invoiceItems,
      ...large.map((p) => ({
        id: `item-${p.id}`,
        invoiceId: 'fat-extra-nov',
        purchaseId: p.id,
        installmentNumber: 1,
        amount: p.total,
        nature: 'observed',
      })),
    ],
    invoices: data.facts.invoices.map((i) =>
      i.id === zeroInvoice.id ? { ...i, status: 'closed', confirmedTotal: money(0, 'BRL') } : i,
    ),
  };
  const readings = cardInvoices(data, 'demo-a', 'card-demo-extra');
  assert.equal(readings[0].knownSubtotal, null);
  assert.deepEqual(readings[0].categories, []);
  assert.equal(readings[0].itemCount, 3);
  assert.deepEqual(readings[1].invoice.confirmedTotal, money(0, 'BRL'));
  assert.equal(readings[1].knownSubtotal, null);
  assert.equal(preferredInvoice(readings), 'fat-extra-dez');
  assert.deepEqual(
    cardInvoices(
      {
        ...data,
        facts: {
          ...data.facts,
          invoices: data.facts.invoices.filter((i) => i.cardId !== 'card-demo-extra'),
          invoiceItems: data.facts.invoiceItems.filter(
            (i) => !i.invoiceId.startsWith('fat-extra-'),
          ),
          purchases: data.facts.purchases.filter((p) => p.cardId !== 'card-demo-extra'),
        },
      },
      'demo-a',
      'card-demo-extra',
    ),
    [],
  );
});

test('F08a/D157: categorias usam apenas os itens da fatura, com centavos e proporções exatos', () => {
  const data = withSecondCard(legacyWallet()),
    before = JSON.stringify(data);
  const rows = cardInvoices(data, 'demo-a', 'card-demo');
  const november = rows.find((row) => row.invoice.id === 'fat-nov');
  assert.deepEqual(
    november.categories.map((part) => [part.categoryId, part.amount.minorUnits, part.share]),
    [
      ['casa', 23334, '82,4%'],
      ['entretenimento', 4990, '17,6%'],
    ],
  );
  for (const row of rows) {
    assert.equal(
      row.categories.reduce((sum, part) => sum + part.amount.minorUnits, 0),
      row.knownSubtotal.minorUnits,
    );
    assert.equal(row.categories[0].start, 0);
    assert.equal(row.categories.at(-1).end, 100);
    assert.equal(
      row.categories.reduce((sum, part) => sum + part.width, 0),
      100,
    );
    row.categories.forEach((part, index) => {
      if (index) assert.equal(part.start, row.categories[index - 1].end);
    });
  }
  assert.deepEqual(
    rows[0].categories.map((part) => part.amount.minorUnits),
    [12010, 10000, 3990],
  );
  const extra = cardInvoices(data, 'demo-a', 'card-demo-extra');
  assert.deepEqual(
    extra[0].categories.map((part) => [part.categoryId, part.amount.minorUnits, part.width]),
    [['casa', 8990, 100]],
  );
  assert.deepEqual(extra[1].categories, []);
  assert.equal(JSON.stringify(data), before);
});

test('F08a/D157: Sem categoria participa, categorias da conta não reclassificam compras e duplicatas são recusadas', () => {
  const data = withSecondCard(legacyWallet());
  data.facts = {
    ...data.facts,
    purchases: data.facts.purchases.map((purchase) =>
      ['compra-6x', 'compra-3x'].includes(purchase.id)
        ? { ...purchase, categoryId: null }
        : purchase,
    ),
    movements: data.facts.movements.map((movement) =>
      movement.kind === 'expense' ? { ...movement, categoryId: 'entretenimento' } : movement,
    ),
  };
  const row = cardInvoices(data, 'demo-a', 'card-demo').find((r) => r.invoice.id === 'fat-nov');
  assert.deepEqual(
    row.categories.map((part) => [part.categoryId, part.amount.minorUnits]),
    [
      [null, 23334],
      ['entretenimento', 4990],
    ],
  );
  const item = data.facts.invoiceItems.find((item) => item.invoiceId === 'fat-nov');
  assert.throws(() =>
    cardInvoices(
      { ...data, facts: { ...data.facts, invoiceItems: [...data.facts.invoiceItems, item] } },
      'demo-a',
      'card-demo',
    ),
  );
});

test('F08a/D157: categorias de cartão USD permanecem separadas, total confirmado diferente não inventa categoria', () => {
  const data = withSecondCard(legacyWallet());
  const card = data.facts.cards[0],
    purchase = data.facts.purchases[0];
  const usdCard = {
    ...card,
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
    status: 'closed',
    confirmedTotal: money(10, 'USD'),
    paidByMovementId: null,
  };
  const purchases = [1, 2].map((minor, index) => ({
    ...purchase,
    id: `purchase-usd-${index}`,
    cardId: usdCard.id,
    total: money(minor, 'USD'),
    installmentCount: 1,
    categoryId: index ? 'casa' : 'transporte',
    subscriptionId: null,
  }));
  data.facts = {
    ...data.facts,
    cards: [...data.facts.cards, usdCard],
    purchases: [...data.facts.purchases, ...purchases],
    invoices: [...data.facts.invoices, usdInvoice],
    invoiceItems: [
      ...data.facts.invoiceItems,
      ...purchases.map((p) => ({
        id: `item-${p.id}`,
        invoiceId: usdInvoice.id,
        purchaseId: p.id,
        installmentNumber: 1,
        amount: p.total,
        nature: 'observed',
      })),
    ],
  };
  const usd = cardInvoices(data, 'all', usdCard.id)[0];
  assert.deepEqual(usd.knownSubtotal, money(3, 'USD'));
  assert.deepEqual(
    usd.categories.map((part) => [part.categoryId, part.amount, part.share]),
    [
      ['casa', money(2, 'USD'), '66,7%'],
      ['transporte', money(1, 'USD'), '33,3%'],
    ],
  );
  assert.equal(
    usd.categories.reduce((sum, part) => sum + part.amount.minorUnits, 0),
    3,
  );
  assert.equal(usd.invoice.confirmedTotal.minorUnits, 10);
  assert.deepEqual(cardInvoices(data, 'demo-a', usdCard.id), []);
  assert.equal(
    cardInvoices(data, 'demo-a', 'card-demo').find((r) => r.invoice.id === 'fat-nov').knownSubtotal
      .minorUnits,
    28324,
  );
});
