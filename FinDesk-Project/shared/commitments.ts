export interface CommitmentPreferences {
  readonly version: 1;
  readonly period: 'finance' | 'next-30-days';
  readonly view: 'split' | 'list' | 'calendar';
}
