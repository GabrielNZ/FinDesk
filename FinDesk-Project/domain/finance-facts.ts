import type { CivilDate, DateRange } from './civil-date';
import type { Money } from './money';

export interface Origin {
  readonly kind: 'manual' | 'file' | 'integration';
  readonly sourceId: string;
  readonly externalId: string | null;
}

export interface Account {
  readonly id: string;
  readonly name: string;
  readonly openingOn: CivilDate;
  readonly openingBalance: Money;
}

interface MovementBase {
  readonly id: string;
  readonly accountId: string;
  readonly on: CivilDate;
  readonly delta: Money;
  readonly description: string;
  readonly origin: Origin;
}

export type CashMovement = MovementBase &
  (
    | { readonly kind: 'income'; readonly salaryId: string | null }
    | {
        readonly kind: 'expense';
        readonly categoryId: string | null;
        readonly merchantId: string | null;
        readonly subscriptionId: string | null;
      }
    | {
        readonly kind: 'own-transfer';
        readonly transferId: string;
        readonly counterpartAccountId: string;
      }
    | { readonly kind: 'invoice-payment'; readonly invoiceId: string }
    | { readonly kind: 'investment-contribution'; readonly investmentId: string }
  );

export interface Card {
  readonly id: string;
  readonly accountId: string;
  readonly lastDigits: string;
  readonly totalLimit: Money;
  readonly usedLimit: Money;
  readonly availableLimit: Money;
  readonly limitSource: string;
}

export interface Purchase {
  readonly id: string;
  readonly cardId: string;
  readonly purchasedOn: CivilDate;
  readonly total: Money;
  readonly installmentCount: number;
  readonly scheduleCoverage: 'complete' | 'partial';
  readonly categoryId: string | null;
  readonly merchantId: string;
  readonly subscriptionId: string | null;
  readonly origin: Origin;
}

export interface Invoice {
  readonly id: string;
  readonly cardId: string;
  readonly closesOn: CivilDate;
  readonly dueOn: CivilDate;
  readonly status: 'open' | 'closed' | 'paid' | 'future';
  readonly confirmedTotal: Money | null;
  readonly paidByMovementId: string | null;
}

export interface InvoiceItem {
  /** Agenda observada na fonte; não afirma que a fatura futura já foi cobrada. */
  readonly nature: 'observed';
  readonly id: string;
  readonly invoiceId: string;
  readonly purchaseId: string;
  readonly installmentNumber: number;
  readonly amount: Money;
}

export interface SalaryExpectation {
  readonly id: string;
  readonly accountId: string;
  readonly expectedOn: CivilDate;
  readonly expectedAmount: Money;
}

export interface SubscriptionFact {
  readonly id: string;
  readonly periodicity: 'monthly' | 'annual';
  readonly billingAmount: Money;
  readonly nextExpectedOn: CivilDate;
}

export interface SourceCoverage {
  readonly accountId: string;
  readonly sourceId: string;
  readonly range: DateRange;
  readonly lastAttemptAt: string;
  readonly lastSuccessAt: string;
  readonly status: 'current' | 'incomplete' | 'failed';
}

/** Fatos e vínculos locais. Não é esquema SQL nem API de importação. */
export interface FinanceFacts {
  readonly accounts: readonly Account[];
  readonly movements: readonly CashMovement[];
  readonly cards: readonly Card[];
  readonly purchases: readonly Purchase[];
  readonly invoices: readonly Invoice[];
  readonly invoiceItems: readonly InvoiceItem[];
  readonly salaries: readonly SalaryExpectation[];
  readonly subscriptions: readonly SubscriptionFact[];
  readonly coverage: readonly SourceCoverage[];
}
