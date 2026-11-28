import type { CommitmentPreferences } from '../shared/commitments';
export const DEFAULT_COMMITMENT_PREFERENCES: CommitmentPreferences = Object.freeze({
  version: 1,
  period: 'finance',
  view: 'split',
});
export function parseCommitmentPreferences(value: unknown): CommitmentPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new RangeError('Preferência inválida.');
  const data = value as Record<string, unknown>;
  if (
    Object.keys(data).sort().join(',') !== 'period,version,view' ||
    data['version'] !== 1 ||
    !['finance', 'next-30-days'].includes(data['period'] as string) ||
    !['split', 'list', 'calendar'].includes(data['view'] as string)
  )
    throw new RangeError('Preferência inválida.');
  return {
    version: 1,
    period: data['period'] as CommitmentPreferences['period'],
    view: data['view'] as CommitmentPreferences['view'],
  };
}
