export type FinanceCardId =
  'categories' | 'evolution' | 'upcoming' | 'largest' | 'increase' | 'decrease' | 'usual';
export type CardArea = 'finance-general' | 'finance-analysis';

export interface CardPlacement {
  readonly id: FinanceCardId;
  readonly columns: number;
  readonly rows: number;
  /** Fração do espaço horizontal livre da linha; ausência equivale à esquerda. */
  readonly align?: number;
}

/** Ordem e dimensões lógicas; coordenadas livres não fazem parte do contrato. */
export interface CardLayout {
  readonly version: 3;
  readonly area: CardArea;
  readonly priority: FinanceCardId | null;
  /** Inícios das linhas preservadas pelo último ajuste de tamanho. */
  readonly rowStarts?: readonly FinanceCardId[];
  readonly cards: readonly CardPlacement[];
}
