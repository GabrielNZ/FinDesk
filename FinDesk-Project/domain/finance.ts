import { civilDate, dateRange, type CivilDate } from './civil-date';
import { addMoney, money, sumMoney, type Money } from './money';
import type { FinanceFacts, Origin } from './finance-facts';

function indexById<T extends { readonly id: string }>(values: readonly T[]): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    if (!value.id.trim() || result.has(value.id))
      throw new RangeError('Identificador vazio ou duplicado.');
    result.set(value.id, value);
  }
  return result;
}

function requireFact<T>(index: ReadonlyMap<string, T>, id: string): T {
  const fact = index.get(id);
  if (!fact) throw new RangeError(`Vínculo inexistente: ${id}`);
  return fact;
}

function nonnegative(value: Money): void {
  money(value.minorUnits, value.currency);
  if (value.minorUnits < 0) throw new RangeError('Magnitude financeira deve ser não negativa.');
}

function validateOrigin(origin: Origin): void {
  if (
    !['manual', 'file', 'integration'].includes(origin.kind) ||
    !origin.sourceId.trim() ||
    origin.externalId === ''
  ) {
    throw new RangeError('Origem financeira inválida.');
  }
}

function instantTimestamp(value: string): number {
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value)
    throw new RangeError('Instantes devem usar ISO UTC canônico.');
  return time;
}

/** Verifica os vínculos suportados; não reconcilia fontes nem cria pagamentos. */
export function validateFacts(facts: FinanceFacts): void {
  const accounts = indexById(facts.accounts);
  const movements = indexById(facts.movements);
  const cards = indexById(facts.cards);
  const purchases = indexById(facts.purchases);
  const invoices = indexById(facts.invoices);
  indexById(facts.invoiceItems);
  const refunds = indexById(facts.cardRefunds ?? []);
  const salaries = indexById(facts.salaries);
  const subscriptions = indexById(facts.subscriptions);
  const commitments = indexById(facts.commitments ?? []);
  const series = indexById(facts.commitmentSeries ?? []);

  for (const account of accounts.values()) {
    civilDate(account.openingOn);
    money(account.openingBalance.minorUnits, account.openingBalance.currency);
  }
  for (const card of cards.values()) {
    const currency = requireFact(accounts, card.accountId).openingBalance.currency;
    for (const limit of [card.totalLimit, card.usedLimit, card.availableLimit]) {
      nonnegative(limit);
      if (limit.currency !== currency) throw new RangeError('Moeda do limite incompatível.');
    }
    if (!card.limitSource.trim()) throw new RangeError('Limite sem fonte.');
  }
  for (const salary of salaries.values()) {
    civilDate(salary.expectedOn);
    nonnegative(salary.expectedAmount);
    if (
      salary.expectedAmount.currency !==
      requireFact(accounts, salary.accountId).openingBalance.currency
    )
      throw new RangeError('Moeda do salário incompatível.');
  }
  for (const subscription of subscriptions.values()) {
    civilDate(subscription.nextExpectedOn);
    nonnegative(subscription.billingAmount);
  }
  for (const purchase of purchases.values()) {
    validateOrigin(purchase.origin);
    civilDate(purchase.purchasedOn);
    nonnegative(purchase.total);
    const card = requireFact(cards, purchase.cardId);
    if (purchase.total.currency !== card.totalLimit.currency)
      throw new RangeError('Moeda da compra incompatível.');
    if (!Number.isSafeInteger(purchase.installmentCount) || purchase.installmentCount < 1)
      throw new RangeError('Quantidade de parcelas inválida.');
    if (purchase.subscriptionId) requireFact(subscriptions, purchase.subscriptionId);
  }
  for (const invoice of invoices.values()) {
    const card = requireFact(cards, invoice.cardId);
    civilDate(invoice.closesOn);
    civilDate(invoice.dueOn);
    if (invoice.confirmedTotal) {
      money(invoice.confirmedTotal.minorUnits, invoice.confirmedTotal.currency);
      if (invoice.confirmedTotal.currency !== card.totalLimit.currency)
        throw new RangeError('Moeda da fatura incompatível.');
    }
    if (invoice.status === 'paid') {
      if (!invoice.paidByMovementId || !invoice.confirmedTotal)
        throw new RangeError('Fatura paga sem valor e pagamento.');
      if (invoice.confirmedTotal.minorUnits < 0)
        throw new RangeError('Liquidação de crédito exige tratamento próprio da fonte.');
      const payment = requireFact(movements, invoice.paidByMovementId);
      if (
        payment.kind !== 'invoice-payment' ||
        payment.invoiceId !== invoice.id ||
        payment.delta.currency !== invoice.confirmedTotal.currency ||
        payment.delta.minorUnits !== -invoice.confirmedTotal.minorUnits
      )
        throw new RangeError('Pagamento integral incompatível com a fatura.');
    } else if (invoice.paidByMovementId)
      throw new RangeError('Fatura não paga contém pagamento vinculado.');
  }
  const installmentNumbers = new Map<string, Set<number>>();
  for (const item of facts.invoiceItems) {
    if (item.nature !== 'observed')
      throw new RangeError('Este contrato exige parcela observada, não estimativa.');
    const purchase = requireFact(purchases, item.purchaseId);
    const invoice = requireFact(invoices, item.invoiceId);
    nonnegative(item.amount);
    const seen = installmentNumbers.get(purchase.id) ?? new Set<number>();
    if (
      invoice.cardId !== purchase.cardId ||
      item.amount.currency !== purchase.total.currency ||
      !Number.isSafeInteger(item.installmentNumber) ||
      item.installmentNumber < 1 ||
      item.installmentNumber > purchase.installmentCount ||
      seen.has(item.installmentNumber)
    )
      throw new RangeError('Parcela repetida ou incompatível.');
    seen.add(item.installmentNumber);
    installmentNumbers.set(purchase.id, seen);
  }
  for (const purchase of purchases.values()) {
    const items = facts.invoiceItems.filter((item) => item.purchaseId === purchase.id);
    const total = sumMoney(
      purchase.total.currency,
      items.map((item) => item.amount),
    );
    if (
      total.minorUnits > purchase.total.minorUnits ||
      (purchase.scheduleCoverage === 'complete' &&
        (items.length !== purchase.installmentCount ||
          total.minorUnits !== purchase.total.minorUnits))
    )
      throw new RangeError('Agenda de parcelas não corresponde à compra.');
  }
  const refunded = new Map<string, bigint>();
  const refundOrigins = new Set<string>();
  for (const refund of refunds.values()) {
    const purchase = requireFact(purchases, refund.purchaseId);
    const invoice = requireFact(invoices, refund.invoiceId);
    validateOrigin(refund.origin);
    civilDate(refund.on);
    nonnegative(refund.amount);
    if (
      refund.nature !== 'observed' ||
      refund.amount.minorUnits === 0 ||
      refund.amount.currency !== purchase.total.currency ||
      invoice.cardId !== purchase.cardId ||
      refund.on < purchase.purchasedOn
    )
      throw new RangeError('Estorno incompatível com a compra ou fatura.');
    const total = (refunded.get(purchase.id) ?? 0n) + BigInt(refund.amount.minorUnits);
    if (total > BigInt(purchase.total.minorUnits))
      throw new RangeError('Estornos de principal excedem o valor da compra.');
    refunded.set(purchase.id, total);
    if (refund.origin.externalId !== null) {
      const key = JSON.stringify([
        purchase.cardId,
        refund.origin.sourceId,
        refund.origin.externalId,
      ]);
      if (refundOrigins.has(key)) throw new RangeError('Origem de estorno duplicada no cartão.');
      refundOrigins.add(key);
    }
  }
  const externalKeys = new Set<string>();
  for (const movement of movements.values()) {
    validateOrigin(movement.origin);
    if (movement.origin.externalId !== null) {
      const key = JSON.stringify([
        movement.accountId,
        movement.origin.sourceId,
        movement.origin.externalId,
      ]);
      if (externalKeys.has(key))
        throw new RangeError('Identificador de origem repetido na mesma conta/fonte.');
      externalKeys.add(key);
    }
    civilDate(movement.on);
    money(movement.delta.minorUnits, movement.delta.currency);
    const account = requireFact(accounts, movement.accountId);
    if (movement.delta.currency !== account.openingBalance.currency)
      throw new RangeError('Moeda da movimentação incompatível.');
    if (movement.kind === 'income') {
      if (movement.delta.minorUnits < 0) throw new RangeError('Entrada com sinal negativo.');
      if (movement.salaryId && requireFact(salaries, movement.salaryId).accountId !== account.id)
        throw new RangeError('Salário vinculado à conta errada.');
    } else if (movement.kind === 'own-transfer') {
      requireFact(accounts, movement.counterpartAccountId);
      const pair = facts.movements.filter(
        (other) => other.kind === 'own-transfer' && other.transferId === movement.transferId,
      );
      const other = pair.find((other) => other.id !== movement.id);
      if (
        pair.length !== 2 ||
        !other ||
        other.kind !== 'own-transfer' ||
        other.accountId === movement.accountId ||
        other.accountId !== movement.counterpartAccountId ||
        other.counterpartAccountId !== movement.accountId ||
        other.delta.currency !== movement.delta.currency ||
        other.delta.minorUnits !== -movement.delta.minorUnits
      )
        throw new RangeError('Transferência própria sem contrapartida compatível.');
    } else {
      if (movement.delta.minorUnits > 0) throw new RangeError('Saída com sinal positivo.');
      if (movement.kind === 'expense' && movement.subscriptionId)
        requireFact(subscriptions, movement.subscriptionId);
      if (movement.kind === 'invoice-payment') {
        const invoice = requireFact(invoices, movement.invoiceId);
        if (invoice.paidByMovementId !== movement.id)
          throw new RangeError('Pagamento duplicado ou sem vínculo recíproco.');
      }
    }
  }
  const commitmentPayments = new Set<string>();
  const commitmentOrigins = new Set<string>();
  const historyIds = new Set<string>();
  for (const item of series.values()) {
    const account = requireFact(accounts, item.accountId);
    validateOrigin(item.origin);
    if (
      !item.destination.trim() ||
      !['monthly', 'annual'].includes(item.frequency) ||
      item.categoryId === ''
    )
      throw new RangeError('Série de compromisso inválida.');
    for (const record of item.priorHistory) {
      civilDate(record.dueOn);
      validateOrigin(record.origin);
      if (
        !record.id.trim() ||
        historyIds.has(record.id) ||
        record.nature !== 'observed' ||
        record.dueOn >= account.openingOn
      )
        throw new RangeError('Histórico anterior inválido ou duplicado.');
      historyIds.add(record.id);
      if (record.amount !== null) {
        nonnegative(record.amount);
        if (record.amount.currency !== account.openingBalance.currency)
          throw new RangeError('Moeda histórica incompatível.');
      }
      if (record.paidOn !== null) {
        civilDate(record.paidOn);
        if (record.paidOn >= account.openingOn)
          throw new RangeError('Pagamento histórico fora da abertura.');
      }
      if (record.origin.externalId !== null) {
        const key = JSON.stringify([
          item.accountId,
          record.origin.sourceId,
          record.origin.externalId,
        ]);
        if (commitmentOrigins.has(key)) throw new RangeError('Origem histórica duplicada.');
        commitmentOrigins.add(key);
      }
    }
  }
  for (const occurrence of commitments.values()) {
    const account = requireFact(accounts, occurrence.accountId);
    civilDate(occurrence.dueOn);
    validateOrigin(occurrence.origin);
    if (occurrence.seriesId != null) {
      if (
        requireFact(series, occurrence.seriesId).accountId !== occurrence.accountId ||
        occurrence.dueOn < account.openingOn
      )
        throw new RangeError('Série vinculada à ocorrência incompatível.');
    }
    if (!occurrence.name.trim()) throw new RangeError('Compromisso sem nome.');
    if (occurrence.amount !== null) {
      nonnegative(occurrence.amount);
      if (occurrence.amount.currency !== account.openingBalance.currency)
        throw new RangeError('Moeda do compromisso incompatível.');
    }
    if (occurrence.origin.externalId !== null) {
      const key = JSON.stringify([
        occurrence.accountId,
        occurrence.origin.sourceId,
        occurrence.origin.externalId,
      ]);
      if (commitmentOrigins.has(key)) throw new RangeError('Origem de compromisso duplicada.');
      commitmentOrigins.add(key);
    }
    if (occurrence.paymentMovementId !== null) {
      const payment = requireFact(movements, occurrence.paymentMovementId);
      if (
        commitmentPayments.has(payment.id) ||
        payment.kind !== 'expense' ||
        payment.accountId !== occurrence.accountId ||
        occurrence.amount === null ||
        payment.delta.currency !== occurrence.amount.currency ||
        payment.delta.minorUnits !== -occurrence.amount.minorUnits
      )
        throw new RangeError('Pagamento do compromisso incompatível ou duplicado.');
      commitmentPayments.add(payment.id);
    }
  }
  for (const coverage of facts.coverage) {
    requireFact(accounts, coverage.accountId);
    dateRange(coverage.range.start, coverage.range.end);
    const attempted = instantTimestamp(coverage.lastAttemptAt);
    const succeeded = instantTimestamp(coverage.lastSuccessAt);
    if (!Number.isFinite(attempted) || !Number.isFinite(succeeded) || succeeded > attempted)
      throw new RangeError('Instantes de atualização inválidos.');
  }
}

/** Snapshot de abertura + fatos de caixa posteriores até a data explícita. */
export function accountBalanceAt(facts: FinanceFacts, accountId: string, asOf: CivilDate): Money {
  validateFacts(facts);
  civilDate(asOf);
  const account = requireFact(indexById(facts.accounts), accountId);
  if (asOf < account.openingOn)
    throw new RangeError('Saldo histórico anterior à abertura é desconhecido.');
  return facts.movements
    .filter(
      (movement) =>
        movement.accountId === accountId && movement.on > account.openingOn && movement.on <= asOf,
    )
    .reduce((balance, movement) => addMoney(balance, movement.delta), account.openingBalance);
}

/** Subtotal dos itens conhecidos, sem afirmar total final de fatura em formação. */
export function invoiceKnownSubtotal(facts: FinanceFacts, invoiceId: string): Money {
  validateFacts(facts);
  const invoice = requireFact(indexById(facts.invoices), invoiceId);
  const card = requireFact(indexById(facts.cards), invoice.cardId);
  return sumMoney(card.totalLimit.currency, [
    ...facts.invoiceItems.filter((item) => item.invoiceId === invoiceId).map((item) => item.amount),
    ...(facts.cardRefunds ?? [])
      .filter((refund) => refund.invoiceId === invoiceId)
      .map((refund) => money(-refund.amount.minorUnits, refund.amount.currency)),
  ]);
}
