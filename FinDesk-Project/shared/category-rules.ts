export interface CategoryRule {
  readonly merchantId: string;
  readonly categoryId: string | null;
  readonly active: boolean;
  readonly revision: number;
}
export interface RuleAssignment {
  readonly movementId: string;
  readonly merchantId: string;
  readonly categoryId: string | null;
  readonly ruleRevision: number;
}
export interface RuleCatalogue {
  readonly version: 1;
  readonly rules: readonly CategoryRule[];
  readonly assignments: readonly RuleAssignment[];
}
/** Registro interno de entrada; não é uma data civil ou filtro de apresentação. */
export interface CategoryRuleState extends RuleCatalogue {
  readonly knownMovementIds: readonly string[];
}
export interface SaveCategoryRule {
  readonly merchantId: string;
  readonly categoryId: string | null;
  readonly active: boolean;
  readonly expectedRevision: number | null;
}
