/** Estrutura do agregado financeiro v1 no disco; não é parser de importação. */
type Rule = (value: unknown) => boolean;
const text: Rule = (value) => typeof value === 'string';
const nullable =
  (rule: Rule): Rule =>
  (value) =>
    value === null || rule(value);
const oneOf =
  (...values: unknown[]): Rule =>
  (value) =>
    values.includes(value);
const integer: Rule = (value) => typeof value === 'number' && Number.isSafeInteger(value);
const shape =
  (fields: Record<string, Rule>): Rule =>
  (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    return (
      Object.keys(record).sort().join(',') === Object.keys(fields).sort().join(',') &&
      Object.entries(fields).every(([key, rule]) => rule(record[key]))
    );
  };
const list =
  (rule: Rule): Rule =>
  (value) =>
    Array.isArray(value) && value.every(rule);
const money = shape({ minorUnits: integer, currency: oneOf('BRL', 'USD') });
const origin = shape({
  kind: oneOf('manual', 'file', 'integration'),
  sourceId: text,
  externalId: nullable(text),
});
const movementBase = {
  id: text,
  accountId: text,
  on: text,
  delta: money,
  description: text,
  origin,
};
const movement: Rule = (value) => {
  if (!value || typeof value !== 'object') return false;
  const kind = (value as Record<string, unknown>)['kind'];
  switch (kind) {
    case 'income':
      return shape({ ...movementBase, kind: oneOf(kind), salaryId: nullable(text) })(value);
    case 'expense':
      return shape({
        ...movementBase,
        kind: oneOf(kind),
        categoryId: nullable(text),
        merchantId: nullable(text),
        subscriptionId: nullable(text),
      })(value);
    case 'own-transfer':
      return shape({
        ...movementBase,
        kind: oneOf(kind),
        transferId: text,
        counterpartAccountId: text,
      })(value);
    case 'invoice-payment':
      return shape({ ...movementBase, kind: oneOf(kind), invoiceId: text })(value);
    case 'investment-contribution':
      return shape({ ...movementBase, kind: oneOf(kind), investmentId: text })(value);
    default:
      return false;
  }
};

export const snapshotShape: Rule = shape({
  formatVersion: oneOf(1),
  seedId: oneOf('demo-financas-v1'),
  seedVersion: oneOf(1),
  asOf: text,
  timezone: oneOf('America/Sao_Paulo'),
  facts: shape({
    accounts: list(shape({ id: text, name: text, openingOn: text, openingBalance: money })),
    movements: list(movement),
    cards: list(
      shape({
        id: text,
        accountId: text,
        lastDigits: text,
        totalLimit: money,
        usedLimit: money,
        availableLimit: money,
        limitSource: text,
      }),
    ),
    purchases: list(
      shape({
        id: text,
        cardId: text,
        purchasedOn: text,
        total: money,
        installmentCount: integer,
        scheduleCoverage: oneOf('complete', 'partial'),
        categoryId: nullable(text),
        merchantId: text,
        subscriptionId: nullable(text),
        origin,
      }),
    ),
    invoices: list(
      shape({
        id: text,
        cardId: text,
        closesOn: text,
        dueOn: text,
        status: oneOf('open', 'closed', 'paid', 'future'),
        confirmedTotal: nullable(money),
        paidByMovementId: nullable(text),
      }),
    ),
    invoiceItems: list(
      shape({
        id: text,
        nature: oneOf('observed'),
        invoiceId: text,
        purchaseId: text,
        installmentNumber: integer,
        amount: money,
      }),
    ),
    salaries: list(shape({ id: text, accountId: text, expectedOn: text, expectedAmount: money })),
    subscriptions: list(
      shape({
        id: text,
        periodicity: oneOf('monthly', 'annual'),
        billingAmount: money,
        nextExpectedOn: text,
      }),
    ),
    coverage: list(
      shape({
        accountId: text,
        sourceId: text,
        range: shape({ start: text, end: text }),
        lastAttemptAt: text,
        lastSuccessAt: text,
        status: oneOf('current', 'incomplete', 'failed'),
      }),
    ),
  }),
});
