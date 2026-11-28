export type FinanceCardId =
  | 'commitment-agenda'
  | 'commitment-calendar'
  | 'categories'
  | 'evolution'
  | 'upcoming'
  | 'largest'
  | 'increase'
  | 'decrease'
  | 'usual'
  | 'wallet'
  | 'invoice'
  | 'invoice-evolution'
  | 'invoice-purchases'
  | 'invoice-future';
export type CardArea =
  | 'finance-general'
  | 'finance-analysis'
  | 'finance-charts'
  | 'finance-invoices'
  | 'finance-commitments';

export interface CardPlacement {
  readonly id: FinanceCardId;
  readonly columns: number;
  readonly rows: number;
  /** Fração do espaço horizontal livre da linha; ausência equivale à esquerda. */
  readonly align?: number;
}

/** Ordem e dimensões lógicas; coordenadas livres não fazem parte do contrato. */
export interface CardLayout {
  readonly version: 3 | 4;
  readonly area: CardArea;
  readonly priority: FinanceCardId | null;
  /** Inícios das linhas preservadas pelo último ajuste de tamanho. */
  readonly rowStarts?: readonly FinanceCardId[];
  readonly cards: readonly CardPlacement[];
}
