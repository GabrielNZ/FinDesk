import type { StatementLayout } from '../shared/statement-layout';

export function defaultStatementLayout(): StatementLayout {
  return { version: 1, area: 'finance-statement', listShare: 1.6 / 2.6, listHeight: null };
}

export function parseStatementLayout(value: unknown): StatementLayout {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new RangeError('Layout inválido.');
  const data = value as Record<string, unknown>;
  if (
    Object.keys(data).length !== 4 ||
    Object.keys(data).some(
      (key) => !['version', 'area', 'listShare', 'listHeight'].includes(key),
    ) ||
    data['version'] !== 1 ||
    data['area'] !== 'finance-statement' ||
    typeof data['listShare'] !== 'number' ||
    !Number.isFinite(data['listShare']) ||
    data['listShare'] < 0.2 ||
    data['listShare'] > 0.85 ||
    (data['listHeight'] !== null &&
      (typeof data['listHeight'] !== 'number' ||
        !Number.isFinite(data['listHeight']) ||
        data['listHeight'] < 160 ||
        data['listHeight'] > 1600))
  )
    throw new RangeError('Layout inválido.');
  return {
    version: 1,
    area: 'finance-statement',
    listShare: data['listShare'],
    listHeight: data['listHeight'] as number | null,
  };
}

export function resizeStatementLayout(
  layout: StatementLayout,
  initial: { width: number; height: number; available: number; gap: number; stacked: boolean },
  dx: number,
  dy: number,
): StatementLayout {
  parseStatementLayout(layout);
  if (
    ![initial.width, initial.height, initial.available, initial.gap, dx, dy].every(
      Number.isFinite,
    ) ||
    initial.available <= initial.gap
  )
    throw new RangeError('Dimensões inválidas.');
  const space = initial.available - initial.gap;
  const minimum = Math.min(280, Math.max(1, space - 240));
  const width = Math.max(minimum, Math.min(Math.max(minimum, space - 240), initial.width + dx));
  return {
    ...layout,
    listShare:
      initial.stacked || dx === 0 ? layout.listShare : Math.max(0.2, Math.min(0.85, width / space)),
    listHeight: dy === 0 ? layout.listHeight : Math.max(160, Math.min(1600, initial.height + dy)),
  };
}
