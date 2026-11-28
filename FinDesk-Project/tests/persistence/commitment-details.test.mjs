import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const require = createRequire(import.meta.url);
const { DemoStore } = require('../../out/desktop/storage/store.js');
const { defaultCardLayout } = require('../../out/application/card-layout.js');
async function temporary(t) {
  const root = await mkdtemp(join(tmpdir(), 'findesk-commitment-details-'));
  t.after(async () => {
    if (
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !basename(root).startsWith('findesk-commitment-details-')
    )
      throw new Error('Perfil inválido.');
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });
  return root;
}
function legacy(s) {
  const facts = {
    ...s.facts,
    commitments: s.facts.commitments.map((row) => {
      const item = { ...row };
      delete item.seriesId;
      return item;
    }),
  };
  delete facts.commitmentSeries;
  return { ...s, formatVersion: 3, seedVersion: 5, facts };
}

test('D184: migração atômica acrescenta só metadados/recibos e preserva layouts, fatos e reabertura', async (t) => {
  const root = await temporary(t);
  let store = new DemoStore(root),
    db;
  try {
    const layout = store.saveCommitmentCardsLayout(defaultCardLayout('finance-commitments'));
    const prefs = store.saveCommitmentPreferences({
      version: 1,
      period: 'next-30-days',
      view: 'split',
    });
    const old = legacy(store.readDemo());
    store.close();
    db = new DatabaseSync(join(root, 'demo.sqlite'));
    const bytes = JSON.stringify(old);
    db.prepare('UPDATE demo_state SET payload=?').run(bytes);
    db.exec(
      "CREATE TRIGGER fail_details BEFORE UPDATE ON demo_state WHEN json_extract(NEW.payload,'$.seedVersion')=6 BEGIN SELECT RAISE(ABORT,'falha simulada'); END",
    );
    assert.throws(() => new DemoStore(root));
    assert.equal(db.prepare('SELECT payload FROM demo_state').get().payload, bytes);
    db.exec('DROP TRIGGER fail_details');
    store = new DemoStore(root);
    const next = store.readDemo();
    assert.equal(next.formatVersion, 4);
    assert.equal(next.seedVersion, 6);
    for (const key of Object.keys(old.facts).filter((key) => key !== 'commitments'))
      assert.deepEqual(next.facts[key], old.facts[key]);
    assert.deepEqual(
      next.facts.commitments.map((row) => {
        const item = { ...row };
        delete item.seriesId;
        return item;
      }),
      old.facts.commitments,
    );
    assert.equal(next.facts.commitmentSeries[0].priorHistory.length, 9);
    assert.deepEqual(store.readCommitmentCardsLayout(), layout);
    assert.deepEqual(store.readCommitmentPreferences(), prefs);
    const saved = db.prepare('SELECT payload FROM demo_state').get().payload;
    store.close();
    store = new DemoStore(root);
    assert.equal(db.prepare('SELECT payload FROM demo_state').get().payload, saved);
    store.restoreDemo();
    assert.equal(store.readDemo().facts.commitmentSeries[0].priorHistory.length, 9);
    assert.deepEqual(store.readCommitmentCardsLayout(), layout);
    assert.deepEqual(store.readCommitmentPreferences(), prefs);
  } finally {
    store.close();
    db?.close();
  }
});

test('contratos históricos inválidos ou futuros preservam o payload sem reset', async (t) => {
  const root = await temporary(t),
    store = new DemoStore(root),
    data = store.readDemo();
  store.close();
  const db = new DatabaseSync(join(root, 'demo.sqlite'));
  try {
    for (const change of [
      (s) => {
        s.formatVersion = 5;
      },
      (s) => {
        s.asOf = '2026-01-01';
      },
      (s) => {
        s.facts.commitmentSeries[0].priorHistory[0].extra = true;
      },
      (s) => {
        s.facts.commitmentSeries[0].priorHistory[0].paidOn = '2026-10-20';
      },
      (s) => {
        delete s.facts.commitmentSeries;
      },
      (s) => {
        delete s.facts.commitments[0].seriesId;
      },
    ]) {
      const next = structuredClone(data);
      change(next);
      const bytes = JSON.stringify(next);
      db.prepare('UPDATE demo_state SET payload=?').run(bytes);
      assert.throws(() => new DemoStore(root));
      assert.equal(db.prepare('SELECT payload FROM demo_state').get().payload, bytes);
    }
  } finally {
    db.close();
  }
});
