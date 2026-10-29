import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { money, sumMoney, divideForDisplay } = require('../../out/domain/money.js');
const { civilDate } = require('../../out/domain/civil-date.js');
const {
  validateFacts,
  accountBalanceAt,
  invoiceKnownSubtotal,
} = require('../../out/domain/finance.js');
const {
  createDemoScenario,
  createUncategorizedScenario,
  createLateSalaryScenario,
} = require('../../out/fixtures/financas/demo.js');

test('FIN-048/049 / C02/C03: saldos seguem caixa e moeda, com transferência própria sem nova receita', () => {
  const { facts, clock } = createDemoScenario();
  validateFacts(facts);
  assert.deepEqual(accountBalanceAt(facts, 'demo-a', clock.today()), money(250020, 'BRL'));
  assert.deepEqual(accountBalanceAt(facts, 'demo-b', clock.today()), money(60000, 'BRL'));
  assert.deepEqual(accountBalanceAt(facts, 'demo-u', clock.today()), money(30000, 'USD'));
  assert.equal(
    sumMoney(
      'BRL',
      facts.movements.filter((m) => m.kind === 'own-transfer').map((m) => m.delta),
    ).minorUnits,
    0,
  );
  assert.equal(facts.movements.filter((m) => m.kind === 'income').length, 1);
  assert.equal(facts.movements.filter((m) => m.kind === 'investment-contribution').length, 1);
  assert.throws(() => accountBalanceAt(facts, 'demo-a', civilDate('2026-09-29')), /desconhecido/);
});

test('FIN-014/017 / C04/C05: compras e parcelas não debitam caixa; pagamento integral tem vínculo único', () => {
  const { facts } = createDemoScenario();
  assert.equal(invoiceKnownSubtotal(facts, 'fat-out').minorUnits, 26000);
  assert.equal(invoiceKnownSubtotal(facts, 'fat-nov').minorUnits, 28324);
  assert.equal(facts.invoices.find((i) => i.id === 'fat-nov').confirmedTotal, null);
  assert.equal(facts.movements.filter((m) => m.kind === 'invoice-payment').length, 1);
  assert.equal(
    facts.movements.some((m) => m.kind === 'expense' && m.subscriptionId === 'sub-card'),
    false,
  );
  const cashOnly = { ...facts, purchases: [], invoiceItems: [] };
  assert.equal(accountBalanceAt(cashOnly, 'demo-a', civilDate('2026-10-29')).minorUnits, 250020);
  const payment = facts.movements.find((m) => m.kind === 'invoice-payment');
  assert.throws(
    () =>
      validateFacts({
        ...facts,
        movements: [
          ...facts.movements,
          {
            ...payment,
            id: 'outro-pagamento',
            origin: { ...payment.origin, externalId: 'outro-pagamento' },
          },
        ],
      }),
    /duplicado/,
  );
});

test('FIN-029 / C06/C07: agendas observadas atravessam ano e preservam centavos, sem gerador de fechamento', () => {
  const { facts } = createDemoScenario();
  const six = facts.invoiceItems.filter((i) => i.purchaseId === 'compra-6x');
  assert.deepEqual(
    six.map((i) => i.amount.minorUnits),
    [20000, 20000, 20000, 20000, 20000, 20000],
  );
  assert.deepEqual(
    six.map((i) => facts.invoices.find((f) => f.id === i.invoiceId).dueOn),
    ['2026-11-10', '2026-12-10', '2027-01-10', '2027-02-10', '2027-03-10', '2027-04-10'],
  );
  const three = facts.invoiceItems.filter((i) => i.purchaseId === 'compra-3x');
  assert.equal(
    facts.invoiceItems.every((item) => item.nature === 'observed'),
    true,
  );
  assert.throws(
    () =>
      validateFacts({
        ...facts,
        invoiceItems: facts.invoiceItems.map((item) => ({ ...item, nature: 'estimated' })),
      }),
    /observada/,
  );
  assert.deepEqual(
    three.map((i) => i.amount.minorUnits),
    [3334, 3333, 3333],
  );
  const changed = facts.invoiceItems.map((i) =>
    i.id === 'item-3x-1' ? { ...i, amount: money(3333, 'BRL') } : i,
  );
  assert.throws(() => validateFacts({ ...facts, invoiceItems: changed }), /Agenda/);
  assert.throws(
    () =>
      validateFacts({
        ...facts,
        invoiceItems: [...facts.invoiceItems, { ...three[0], id: 'parcela-duplicada' }],
      }),
    /Parcela/,
  );
});

test('FIN-045/044 / C09/C10: Sem categoria não some; compras legítimas iguais não são deduplicadas', () => {
  const base = createDemoScenario();
  const variant = createUncategorizedScenario();
  validateFacts(variant.facts);
  assert.equal(accountBalanceAt(variant.facts, 'demo-a', variant.clock.today()).minorUnits, 248020);
  assert.equal(variant.facts.movements.find((m) => m.id === 'mov-sem-categoria').categoryId, null);
  const uber = base.facts.movements.filter((m) => m.kind === 'expense' && m.merchantId === 'uber');
  assert.equal(uber.length, 2);
  assert.equal(new Set(uber.map((m) => m.origin.externalId)).size, 2);
  assert.equal(
    sumMoney(
      'BRL',
      uber.map((m) => m.delta),
    ).minorUnits,
    -6000,
  );
  assert.throws(
    () => validateFacts({ ...base.facts, movements: [...base.facts.movements, uber[0]] }),
    /duplicado/,
  );
});

test('FIN-036 / C12: anual debita valor integral uma vez e equivalente não gera outras cobranças', () => {
  const { facts } = createDemoScenario();
  const annual = facts.subscriptions.find((s) => s.id === 'sub-anual');
  assert.equal(annual.periodicity, 'annual');
  assert.equal(annual.nextExpectedOn, '2027-10-20');
  assert.equal(divideForDisplay(annual.billingAmount, 12).minorUnits, 1999);
  const charges = facts.movements.filter(
    (m) => m.kind === 'expense' && m.subscriptionId === annual.id,
  );
  assert.equal(charges.length, 1);
  assert.equal(charges[0].delta.minorUnits, -23990);
});

test('FIN-011/017 / C17/C18: previsão não vira saldo, recebimento não altera data prevista', () => {
  const base = createDemoScenario();
  assert.equal(base.facts.salaries.find((s) => s.id === 'sal-out').expectedOn, '2026-10-05');
  assert.equal(base.facts.movements.find((m) => m.id === 'mov-sal').on, '2026-10-02');
  const pending = createLateSalaryScenario(false);
  const received = createLateSalaryScenario(true);
  assert.equal(accountBalanceAt(pending.facts, 'demo-a', pending.clock.today()).minorUnits, 250020);
  assert.equal(
    accountBalanceAt(received.facts, 'demo-a', received.clock.today()).minorUnits,
    550020,
  );
  assert.equal(
    accountBalanceAt(received.facts, 'demo-a', pending.clock.today()).minorUnits,
    250020,
  );
  for (const scenario of [pending, received])
    assert.equal(scenario.facts.salaries.find((s) => s.id === 'sal-nov').expectedOn, '2026-11-05');
  assert.equal(base.clock.today(), '2026-10-29');
  assert.equal(
    base.facts.movements.some((m) => m.id === 'mov-sal-nov'),
    false,
  );
});

test('FIN-014 / C04: pagamento pode vir de outra conta própria sem depender da conta do cartão', () => {
  const base = createDemoScenario();
  const facts = {
    ...base.facts,
    movements: base.facts.movements.map((m) =>
      m.kind === 'invoice-payment' ? { ...m, accountId: 'demo-b' } : m,
    ),
  };
  validateFacts(facts);
  assert.equal(accountBalanceAt(facts, 'demo-a', base.clock.today()).minorUnits, 276020);
  assert.equal(accountBalanceAt(facts, 'demo-b', base.clock.today()).minorUnits, 34000);
});

test('FIN-044/046 / C11/C22: repetição de origem e instantes inválidos não entram em fatos válidos', () => {
  const { facts } = createDemoScenario();
  const expense = facts.movements.find((m) => m.id === 'mov-uber-1');
  assert.throws(
    () =>
      validateFacts({
        ...facts,
        movements: [...facts.movements, { ...expense, id: 'outro-id-interno' }],
      }),
    /origem repetido/,
  );
  assert.throws(
    () =>
      validateFacts({
        ...facts,
        coverage: facts.coverage.map((c) => ({ ...c, lastAttemptAt: '2026-02-31T12:00:00.000Z' })),
      }),
    /ISO UTC/,
  );
  assert.throws(
    () =>
      validateFacts({
        ...facts,
        coverage: facts.coverage.map((c) => ({ ...c, lastAttemptAt: '2026-10-29T12:00:00' })),
      }),
    /ISO UTC/,
  );
});

test('FIN-039/048: vínculos, moedas, contrapartidas e precisão inválidos são recusados', () => {
  const { facts } = createDemoScenario();
  assert.throws(
    () =>
      validateFacts({ ...facts, movements: facts.movements.filter((m) => m.id !== 'mov-tr-b') }),
    /Transferência/,
  );
  assert.throws(
    () =>
      validateFacts({
        ...facts,
        movements: facts.movements.map((m) =>
          m.id === 'mov-tr-b' ? { ...m, delta: money(39999, 'BRL') } : m,
        ),
      }),
    /Transferência/,
  );
  assert.throws(
    () =>
      validateFacts({
        ...facts,
        invoiceItems: facts.invoiceItems.map((i) =>
          i.id === 'item-3x-1' ? { ...i, invoiceId: 'inexistente' } : i,
        ),
      }),
    /inexistente/,
  );
  assert.throws(
    () =>
      validateFacts({
        ...facts,
        movements: facts.movements.map((m) =>
          m.id === 'mov-merc' ? { ...m, delta: money(-18000, 'USD') } : m,
        ),
      }),
    /Moeda/,
  );
  assert.throws(
    () =>
      validateFacts({
        ...facts,
        coverage: facts.coverage.map((c) => ({ ...c, lastSuccessAt: '2026-10-30T12:00:00.000Z' })),
      }),
    /Instantes/,
  );
  assert.throws(() => invoiceKnownSubtotal(facts, 'inexistente'), /inexistente/);
});
