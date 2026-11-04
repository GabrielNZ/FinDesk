export interface StatementLayout {
  readonly version: 1;
  readonly area: 'finance-statement';
  readonly listShare: number;
  /** null mantém a altura natural dos registros, sem limite artificial. */
  readonly listHeight: number | null;
}
