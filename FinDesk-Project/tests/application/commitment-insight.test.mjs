import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createDemoScenario } = require('../../out/fixtures/financas/demo.js');
const { withSeptemberHistory } = require('../../out/fixtures/financas/comparison-history.js');
const { withSecondCard } = require('../../out/fixtures/financas/card-wallet.js');
const { withCardRefund } = require('../../out/fixtures/financas/card-refund.js');
const { withCommitments } = require('../../out/fixtures/financas/commitments.js');
const { withCommitmentDetails } = require('../../out/fixtures/financas/commitment-details.js');
const { commitments } = require('../../out/application/commitments.js');
const { commitmentInsight } = require('../../out/application/commitment-insight.js');
const { validateFacts, accountBalanceAt } = require('../../out/domain/finance.js');
function snapshot() {
  const s = createDemoScenario();
  return withCommitmentDetails(
    withCommitments(
      withCardRefund(
        withSecondCard(
          withSeptemberHistory({
            formatVersion: 1,
            seedVersion: 1,
            seedId: 'demo-financas-v1',
            asOf: s.clock.today(),
            timezone: s.timezone,
            facts: s.facts,
          }),
        ),
      ),
    ),
  );
}
function energy(s) {
  return commitments(s, 'demo-a', { start: '2026-10-01', end: '2026-10-31' }).rows.find(
    (row) => row.occurrence?.id === 'commitment-energy-demo',
  );
}

test('D184: dez pagamentos observados, julho versus outubro, sem inventar meses ou alterar caixa', () => {
  const s = snapshot(),
    before = JSON.stringify(s),
    q = commitmentInsight(s, energy(s));
  assert.equal(q.series.destination, 'Energia — demonstração');
  assert.equal(q.series.categoryId, 'casa');
  assert.equal(q.series.frequency, 'monthly');
  assert.equal(q.paymentCount, 10);
  assert.equal(q.previous.dueOn, '2026-07-15');
  assert.equal(q.previous.amount.minorUnits, 11000);
  assert.equal(q.difference.minorUnits, 1000);
  assert.equal(q.percentage, '+9,1%');
  assert.equal(s.facts.commitments.length, 4);
  assert.equal(q.series.priorHistory.length, 9);
  assert.equal(
    q.series.priorHistory.some(
      (row) => row.dueOn.startsWith('2026-08') || row.dueOn.startsWith('2026-09'),
    ),
    false,
  );
  assert.equal(accountBalanceAt(s.facts, 'demo-a', s.asOf).minorUnits, 250020);
  assert.equal(JSON.stringify(s), before);
  assert.equal(withCommitmentDetails(s), s);
});

test('nome/valor coincidentes não criam série, frequência, histórico ou pagamento', () => {
  const s = snapshot();
  s.facts.commitments[2].name = 'Energia';
  const row = commitments(s, 'demo-a', { start: '2026-11-01', end: '2026-11-30' }).rows.find(
    (row) => row.occurrence?.id === 'commitment-rent-demo',
  );
  const q = commitmentInsight(s, row);
  assert.equal(q.series, null);
  assert.equal(q.paymentCount, 0);
  assert.equal(q.difference, null);
  assert.equal(q.unavailable, 'no-series');
});

test('base anterior ausente/zero, pagamento ausente e ambiguidade preservam seus estados', () => {
  const s = snapshot(),
    history = s.facts.commitmentSeries[0].priorHistory;
  history[8].amount = null;
  assert.equal(commitmentInsight(s, energy(s)).unavailable, 'no-value');
  history[8].amount = { minorUnits: 0, currency: 'BRL' };
  history[8].paidOn = null;
  const zero = commitmentInsight(s, energy(s));
  assert.equal(zero.difference.minorUnits, 12000);
  assert.equal(zero.percentage, null);
  assert.equal(zero.paymentCount, 9);
  history.push({
    ...history[8],
    id: 'ambiguous',
    origin: { ...history[8].origin, externalId: 'ambiguous' },
  });
  assert.equal(commitmentInsight(s, energy(s)).unavailable, 'ambiguous');
  s.facts.commitmentSeries[0].priorHistory = [];
  assert.equal(commitmentInsight(s, energy(s)).unavailable, 'no-previous');
});

test('histórico não pode atravessar a abertura, misturar moedas, duplicar origem ou ligar outra conta', () => {
  for (const change of [
    (s) => {
      s.facts.commitmentSeries[0].priorHistory[0].dueOn = '2026-09-01';
    },
    (s) => {
      s.facts.commitmentSeries[0].priorHistory[0].paidOn = '2026-09-01';
    },
    (s) => {
      s.facts.commitmentSeries[0].priorHistory[0].amount = { minorUnits: 1, currency: 'USD' };
    },
    (s) => {
      s.facts.commitmentSeries[0].frequency = 'weekly';
    },
    (s) => {
      s.facts.commitmentSeries[0].priorHistory[0].nature = 'estimated';
    },
    (s) => {
      s.facts.commitmentSeries[0].priorHistory[1].origin.externalId =
        s.facts.commitmentSeries[0].priorHistory[0].origin.externalId;
    },
    (s) => {
      s.facts.commitmentSeries[0].accountId = 'demo-b';
    },
    (s) => {
      s.facts.commitments[1].seriesId = 'missing';
    },
  ]) {
    const s = snapshot();
    change(s);
    assert.throws(() => validateFacts(s.facts));
  }
});
