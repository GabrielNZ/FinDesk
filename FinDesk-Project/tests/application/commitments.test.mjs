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
const { withCommitments } = require('../../out/fixtures/financas/commitments.js');
const { commitments, commitmentTotals } = require('../../out/application/commitments.js');
const { commitmentCalendar } = require('../../out/application/commitment-calendar.js');
const { parseCommitmentPreferences } = require('../../out/application/commitment-preferences.js');
const { validateFacts, accountBalanceAt } = require('../../out/domain/finance.js');
const {
  defaultCardLayout,
  parseCardLayout,
  resolveCardLayout,
} = require('../../out/application/card-layout.js');
function snapshot() {
  const scenario = createDemoScenario();
  return withCommitments(
    withCardRefund(
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
    ),
  );
}
const october = { start: '2026-10-01', end: '2026-10-31' };
const november = { start: '2026-11-01', end: '2026-11-30' };
const total = (s, rows, mode = 'original', exchange = rate) =>
  commitmentTotals(rows, mode, s.asOf, exchange);

test('D181: ocorrências explícitas e uma obrigação por fatura preservam saldo, pagamentos e fatos', () => {
  const s = snapshot(),
    before = JSON.stringify(s);
  const q = commitments(s, 'demo-a', october);
  assert.equal(q.rows.length, 2);
  assert.ok(q.rows.every((row) => row.status === 'paid'));
  assert.equal(total(s, q.rows).values[0].minorUnits, 38000);
  assert.equal(q.previous.length, 1);
  assert.equal(total(s, q.previous).values[0].minorUnits, 7500);
  const next = commitments(s, 'demo-a', november);
  assert.equal(next.rows.length, 4);
  assert.equal(next.rows.filter((row) => row.invoice).length, 2);
  assert.equal(total(s, next.rows).values[0].minorUnits, 137314);
  assert.equal(total(s, next.rows).partial, 2);
  assert.equal(
    next.rows.some((row) => row.name.includes('Netflix')),
    false,
  );
  assert.equal(accountBalanceAt(s.facts, 'demo-a', s.asOf).minorUnits, 250020);
  assert.equal(JSON.stringify(s), before);
  assert.equal(withCommitments(s), s);
});

test('pendências anteriores permanecem separadas ao trocar mês, filtro e seleção de dia', () => {
  const s = snapshot();
  for (const range of [october, november, { start: '2026-10-29', end: '2026-11-27' }]) {
    for (const filter of ['all', 'upcoming', 'overdue', 'paid']) {
      const q = commitments(s, 'demo-a', range, filter, '2026-11-05');
      assert.equal(q.previous.length, 1);
      assert.equal(q.previous[0].dueOn, '2026-09-28');
      assert.ok(q.rows.every((row) => row.dueOn === '2026-11-05'));
    }
  }
  assert.equal(commitments(s, 'demo-a', october, 'paid').rows.length, 2);
  assert.equal(commitments(s, 'demo-a', november, 'overdue').rows.length, 0);
  assert.equal(commitments(s, 'missing', november), null);
  assert.equal(commitments(s, 'demo-a', null), null);
  assert.throws(() => commitments(s, 'demo-a', october, 'unknown'));
});

test('crédito isolado não vira obrigação nem pendência; ausência e zero ficam distintos', () => {
  const s = snapshot();
  s.facts.invoices.find((row) => row.id === 'fat-nov').confirmedTotal = {
    minorUnits: -5000,
    currency: 'BRL',
  };
  const q = commitments(s, 'demo-a', november);
  const sums = total(s, q.rows);
  assert.equal(q.rows.find((row) => row.id === 'invoice:fat-nov').status, 'credit');
  assert.equal(sums.values[0].minorUnits, 113990);
  assert.equal(sums.credits[0].minorUnits, -5000);
  const december = commitments(s, 'demo-a', { start: '2026-12-01', end: '2026-12-31' });
  assert.equal(total(s, december.rows).missing, 1);
  const extra = s.facts.invoices.find((row) => row.id === 'fat-extra-dez');
  extra.confirmedTotal = { minorUnits: 0, currency: 'BRL' };
  assert.equal(total(s, commitments(s, 'demo-a', december.range).rows).missing, 0);
});

test('contas sem valor não entram como zero, e hoje permanece A vencer', () => {
  const s = snapshot();
  const base = s.facts.commitments[2];
  s.facts.commitments.push({
    ...base,
    id: 'unknown-value',
    dueOn: s.asOf,
    amount: null,
    origin: { ...base.origin, externalId: 'unknown-value' },
  });
  const q = commitments(s, 'demo-a', october, 'upcoming');
  assert.equal(q.rows.length, 1);
  assert.equal(q.rows[0].status, 'upcoming');
  assert.deepEqual(total(s, q.rows).values, []);
  assert.equal(total(s, q.rows).missing, 1);
});

test('moedas permanecem separadas ou convertem uma vez por agregado; falha não gera parcial', () => {
  const s = snapshot(),
    base = s.facts.commitments[2];
  s.facts.commitments.push({
    ...base,
    id: 'usd',
    accountId: 'demo-u',
    amount: { minorUnits: 1000, currency: 'USD' },
    origin: { ...base.origin, externalId: 'usd' },
  });
  const q = commitments(s, 'all', november);
  assert.equal(total(s, q.rows).values.length, 2);
  assert.equal(total(s, q.rows, 'BRL').values[0].minorUnits, 142314);
  assert.equal(total(s, q.rows, 'BRL', null).unavailable, true);
  assert.deepEqual(total(s, q.rows, 'BRL', null).values, []);
  const rows = q.rows
    .filter((row) => row.occurrence && row.currency === 'BRL')
    .map((row) => ({ ...row, amount: { minorUnits: 3, currency: 'BRL' } }));
  assert.equal(total(s, rows, 'USD').values[0].minorUnits, 1);
  const extreme = rows.map((row) => ({
    ...row,
    amount: { minorUnits: Number.MAX_SAFE_INTEGER, currency: 'BRL' },
  }));
  assert.equal(total(s, extreme).unavailable, true);
});

test('vínculos e evidência de pagamento são explícitos; despesa não pode pagar duas ocorrências', () => {
  for (const changes of [
    { accountId: 'missing' },
    { dueOn: '2026-02-30' },
    { name: '' },
    { amount: { minorUnits: -1, currency: 'BRL' } },
    { amount: { minorUnits: 100, currency: 'USD' } },
    { paymentMovementId: 'missing' },
    { paymentMovementId: 'mov-fat-out' },
    { amount: null },
  ]) {
    const s = snapshot();
    s.facts.commitments[1] = { ...s.facts.commitments[1], ...changes };
    assert.throws(() => validateFacts(s.facts));
  }
  const s = snapshot(),
    paid = s.facts.commitments[1];
  s.facts.commitments.push({
    ...paid,
    id: 'second',
    origin: { ...paid.origin, externalId: 'second' },
  });
  assert.throws(() => validateFacts(s.facts), /duplicado/);
});

test('calendário alinha segunda-feira, dias válidos, recorte e quantidade sem criar obrigações', () => {
  const s = snapshot(),
    q = commitments(s, 'demo-a', november);
  const cells = commitmentCalendar('2026-11-01', november, q.periodRows);
  assert.equal(cells.length, 42);
  assert.ok(cells.slice(0, 6).every((day) => day.on === null));
  assert.equal(cells[6].on, '2026-11-01');
  assert.equal(cells.find((day) => day.on === '2026-11-10').count, 1);
  assert.equal(cells.filter((day) => day.enabled).length, 30);
  const partial = commitmentCalendar(
    '2026-11-01',
    { start: '2026-11-05', end: '2026-11-12' },
    q.periodRows,
  );
  assert.equal(partial.filter((day) => day.enabled).length, 8);
});

test('preferência local tem contrato fechado, sem SQL/caminhos ou versão futura', () => {
  const good = { version: 1, period: 'finance', view: 'split' };
  assert.deepEqual(parseCommitmentPreferences(good), good);
  for (const invalid of [
    { ...good, version: 2 },
    { ...good, period: 'month' },
    { ...good, view: 'unknown' },
    { ...good, path: 'x' },
  ])
    assert.throws(() => parseCommitmentPreferences(invalid));
});

test('D182: calendário maior à esquerda e detalhe à direita empilham sem salvar a apresentação estreita', () => {
  const layout = defaultCardLayout('finance-commitments'),
    before = JSON.stringify(layout);
  assert.deepEqual(parseCardLayout(layout, 'finance-commitments'), layout);
  assert.throws(() => parseCardLayout(defaultCardLayout(), 'finance-commitments'));
  const wide = resolveCardLayout(layout, 1400),
    narrow = resolveCardLayout(layout, 614);
  assert.equal(wide.cards[0].y, wide.cards[1].y);
  assert.ok(wide.cards[0].width > wide.cards[1].width);
  assert.ok(narrow.cards[1].y >= narrow.cards[0].height);
  assert.ok(narrow.cards.every((card) => card.width === 614));
  assert.equal(JSON.stringify(layout), before);
});
