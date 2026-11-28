import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const require = createRequire(import.meta.url);
const { DemoStore } = require('../../out/desktop/storage/store.js');
const { StorageClient } = require('../../out/desktop/storage/client.js');
const { validateRequest } = require('../../out/desktop/storage/contracts.js');
const {
  defaultCardLayout,
  parseCardLayout,
  resolveCardLayout,
  resizeCard,
  reorderCard,
  normalizeInvoiceLayout,
} = require('../../out/application/card-layout.js');
async function temporary(t) {
  const root = await mkdtemp(join(tmpdir(), 'findesk-invoice-layout-'));
  t.after(async () => {
    if (
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !basename(root).startsWith('findesk-invoice-layout-')
    )
      throw Error('Perfil inválido');
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });
  return root;
}

test('D175: contrato de cinco cards preserva altura simétrica e adaptação sem alterar preferência', () => {
  const layout = defaultCardLayout('finance-invoices'),
    before = JSON.stringify(layout);
  assert.deepEqual(
    layout.cards.map((c) => c.id),
    ['wallet', 'invoice', 'invoice-evolution', 'invoice-purchases', 'invoice-future'],
  );
  const wide = resolveCardLayout(layout, 1500).cards;
  assert.equal(wide[1].height, 400);
  assert.equal(wide[2].height, 400);
  assert.equal(wide[2].y, 0);
  assert.equal(layout.cards[1].columns, 3.676);
  assert.equal(layout.cards[2].columns, 5.146);
  assert.ok(wide[2].width > wide[1].width);
  const narrow = resolveCardLayout(layout, 500).cards;
  assert.ok(narrow.every((c) => c.width === 500));
  assert.ok(narrow[1].y > 0);
  assert.equal(JSON.stringify(layout), before);
  const changed = resizeCard(layout, 'invoice', 5.1, 6.1, 1500);
  assert.equal(changed.cards.find((c) => c.id === 'invoice').rows, 6.1);
  assert.equal(reorderCard(changed, 'invoice-evolution', 0).cards[0].id, 'invoice-evolution');
  for (const wrong of [
    defaultCardLayout(),
    defaultCardLayout('finance-charts'),
    { ...layout, version: 2 },
    { ...layout, sql: 'x' },
    { ...layout, cards: layout.cards.slice(1) },
    { ...layout, cards: layout.cards.map((c) => (c.id === 'invoice' ? { ...c, rows: 0 } : c)) },
  ])
    assert.throws(() => parseCardLayout(wrong, 'finance-invoices'));
});
test('D175: layout v3 é acrescentado em memória; leitura não muda bytes e gesto explícito salva v4', async (t) => {
  const root = await temporary(t),
    store = new DemoStore(root),
    db = new DatabaseSync(join(root, 'preferences.sqlite'));
  try {
    const current = defaultCardLayout('finance-invoices');
    const legacy = {
      ...current,
      version: 3,
      cards: current.cards
        .filter((c) => c.id !== 'invoice-future')
        .map((c) => (c.id === 'invoice' ? { ...c, columns: 4.1, rows: 6.1, align: 0.3 } : c)),
      rowStarts: ['wallet', 'invoice-purchases'],
    };
    const bytes = JSON.stringify(legacy);
    db.prepare("INSERT INTO preferences(key,payload) VALUES('layout.finance-invoices.v1', ?)").run(
      bytes,
    );
    const read = store.readInvoiceCardsLayout();
    assert.deepEqual(read, legacy);
    const upgraded = normalizeInvoiceLayout(read);
    assert.equal(upgraded.version, 4);
    assert.deepEqual(upgraded.cards.slice(0, 4), legacy.cards);
    assert.equal(
      db.prepare("SELECT payload FROM preferences WHERE key='layout.finance-invoices.v1'").get()
        .payload,
      bytes,
    );
    assert.equal(upgraded.cards.at(-1).id, 'invoice-future');
    assert.deepEqual(store.saveInvoiceCardsLayout(upgraded), upgraded);
    assert.throws(() =>
      store.saveInvoiceCardsLayout({ ...upgraded, cards: upgraded.cards.slice(0, 4) }),
    );
    assert.throws(() => parseCardLayout({ ...defaultCardLayout(), version: 4 }));
  } finally {
    db.close();
    store.close();
  }
});
test('D164: worker persiste/reabre só o layout de Cartão; restauração demo preserva layouts/fatos/preferências', async (t) => {
  const root = await temporary(t),
    client = new StorageClient(root),
    layout = defaultCardLayout('finance-invoices');
  try {
    assert.equal((await client.getInvoiceCardsLayout()).value, null);
    assert.deepEqual((await client.saveInvoiceCardsLayout(layout)).value, layout);
    for (const bad of [
      defaultCardLayout(),
      defaultCardLayout('finance-analysis'),
      defaultCardLayout('finance-charts'),
      { ...layout, path: 'arbitrary' },
      { ...layout, cards: [] },
    ])
      assert.equal((await client.saveInvoiceCardsLayout(bad)).ok, false);
    assert.throws(() =>
      validateRequest({ id: 1, operation: 'read-invoice-cards-layout', payload: {} }),
    );
    assert.throws(() =>
      validateRequest({
        id: 1,
        operation: 'save-invoice-cards-layout',
        payload: defaultCardLayout(),
      }),
    );
    assert.equal((await client.getCardLayout()).value, null);
    assert.equal((await client.getExpenseChartsLayout()).value, null);
    assert.equal((await client.getExpenseAnalysisLayout()).value, null);
  } finally {
    await client.close();
  }
  const store = new DemoStore(root);
  try {
    const demo = store.readDemo(),
      prefs = store.readPreferences();
    assert.deepEqual(store.readInvoiceCardsLayout(), layout);
    store.restoreDemo();
    assert.deepEqual(store.readInvoiceCardsLayout(), layout);
    assert.deepEqual(store.readDemo(), demo);
    assert.deepEqual(store.readPreferences(), prefs);
    assert.throws(() => store.saveCardLayout(layout));
    assert.throws(() => store.saveExpenseChartsLayout(layout));
    assert.throws(() => store.saveExpenseAnalysisLayout(layout));
  } finally {
    store.close();
  }
});
test('D164: falha de escrita e conteúdo futuro/corrupto recusam substituição preservando bytes', async (t) => {
  const root = await temporary(t),
    store = new DemoStore(root),
    db = new DatabaseSync(join(root, 'preferences.sqlite'));
  try {
    const layout = defaultCardLayout('finance-invoices');
    store.saveInvoiceCardsLayout(layout);
    const bytes = () =>
      db.prepare("SELECT payload FROM preferences WHERE key='layout.finance-invoices.v1'").get()
        .payload;
    const before = bytes();
    db.exec(
      "CREATE TRIGGER fail_invoice BEFORE UPDATE ON preferences WHEN NEW.key='layout.finance-invoices.v1' BEGIN SELECT RAISE(ABORT,'test'); END",
    );
    assert.throws(() =>
      store.saveInvoiceCardsLayout({ ...layout, cards: [...layout.cards].reverse() }),
    );
    assert.equal(bytes(), before);
    db.exec('DROP TRIGGER fail_invoice');
    for (const [payload, code] of [
      [JSON.stringify({ ...layout, version: 99 }), 'incompatible'],
      ['{}', 'corrupt'],
      ['[]', 'corrupt'],
    ]) {
      db.prepare("UPDATE preferences SET payload=? WHERE key='layout.finance-invoices.v1'").run(
        payload,
      );
      assert.throws(
        () => store.readInvoiceCardsLayout(),
        (e) => e.code === code,
      );
      assert.throws(() => store.saveInvoiceCardsLayout(layout));
      assert.equal(bytes(), payload);
    }
  } finally {
    db.close();
    store.close();
  }
});
