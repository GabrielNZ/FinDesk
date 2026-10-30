import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  presentAccountBalance,
  moveCalendarMonth,
  formatMoney,
  formatCivilDate,
} = require('../../out/application/finance-context.js');
const { createDemoScenario, DEMO_EXCHANGE_RATE } = require('../../out/fixtures/financas/demo.js');
const { civilDate } = require('../../out/domain/civil-date.js');
const { money } = require('../../out/domain/money.js');

function snapshot() {
  const demo = createDemoScenario();
  return {
    formatVersion: 1,
    seedId: 'demo-financas-v1',
    seedVersion: 1,
    asOf: demo.clock.today(),
    timezone: demo.timezone,
    facts: demo.facts,
  };
}

test('FIN-006/008 / C02/C23: saldo segue caixa; Original separa moedas e conversão preserva cada original', () => {
  const data = snapshot();
  const before = JSON.stringify(data);
  assert.deepEqual(presentAccountBalance(data, 'demo-a', 'original', null).values, [
    money(250020, 'BRL'),
  ]);
  const original = presentAccountBalance(data, 'all', 'original', null);
  assert.deepEqual(original.values, [money(310020, 'BRL'), money(30000, 'USD')]);
  const brl = presentAccountBalance(data, 'all', 'BRL', DEMO_EXCHANGE_RATE);
  assert.deepEqual(brl.values, [money(460020, 'BRL')]);
  assert.deepEqual(brl.originals, original.originals);
  assert.equal(brl.converted, true);
  assert.deepEqual(presentAccountBalance(data, 'all', 'USD', DEMO_EXCHANGE_RATE).values, [
    money(92004, 'USD'),
  ]);
  assert.deepEqual(presentAccountBalance(data, 'demo-u', 'BRL', DEMO_EXCHANGE_RATE).values, [
    money(150000, 'BRL'),
  ]);
  assert.equal(JSON.stringify(data), before);
});

test('FIN-008: sem taxa compatível/data válida ou conta, ausência não vira saldo zero nem conversão parcial', () => {
  const data = snapshot();
  for (const rate of [null, { ...DEMO_EXCHANGE_RATE, on: civilDate('2026-10-30') }]) {
    const balance = presentAccountBalance(data, 'all', 'BRL', rate);
    assert.equal(balance.unavailable, true);
    assert.deepEqual(balance.values, []);
    assert.equal(balance.originals.length, 3);
  }
  assert.equal(presentAccountBalance(data, 'removida', 'original', null).unavailable, true);
  assert.deepEqual(presentAccountBalance(data, 'demo-u', 'USD', null).values, [
    money(30000, 'USD'),
  ]);
});

test('FIN-010 / C01/C19: meses civis atravessam ano/bissexto e recusam ultrapassar os limites', () => {
  assert.equal(moveCalendarMonth(civilDate('2026-12-31'), 1), '2027-01-01');
  assert.equal(moveCalendarMonth(civilDate('2028-03-31'), -1), '2028-02-01');
  assert.equal(moveCalendarMonth(civilDate('0001-01-01'), -1), null);
  assert.equal(moveCalendarMonth(civilDate('9999-12-01'), 1), null);
  assert.throws(() => moveCalendarMonth(civilDate('2026-10-01'), 0.5));
  assert.equal(formatCivilDate(civilDate('2028-02-29')), '29/02/2028');
});

test('FIN-008/048: apresentação preserva o último centavo no limite seguro e arredonda só o subtotal por moeda', () => {
  assert.equal(formatMoney(money(Number.MAX_SAFE_INTEGER, 'BRL')), 'R$ 90.071.992.547.409,91');
  assert.equal(formatMoney(money(-1, 'USD')), '-US$ 0,01');
  const data = snapshot();
  data.facts = {
    ...data.facts,
    accounts: [
      { id: 'a', name: 'A', openingOn: data.asOf, openingBalance: money(1, 'BRL') },
      { id: 'b', name: 'B', openingOn: data.asOf, openingBalance: money(1, 'BRL') },
    ],
    movements: [],
    cards: [],
    purchases: [],
    invoices: [],
    invoiceItems: [],
    salaries: [],
    subscriptions: [],
    coverage: [],
  };
  assert.deepEqual(
    presentAccountBalance(data, 'all', 'USD', { ...DEMO_EXCHANGE_RATE, numerator: 2 }).values,
    [money(1, 'USD')],
  );
});
