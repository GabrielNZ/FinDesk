import type { CardLayout, FinanceCardId } from '../shared/card-layout';

export const CARD_GRID = Object.freeze({
  columns: 12,
  minColumns: 4,
  minRows: 3,
  maxRows: 12,
  rowHeight: 64,
  gap: 16,
  minWidth: 280,
});
const IDS: readonly FinanceCardId[] = ['categories', 'evolution', 'upcoming'];

export function defaultCardLayout(): CardLayout {
  return {
    version: 3,
    area: 'finance-general',
    priority: null,
    cards: [
      { id: 'categories', columns: 6, rows: 4.5 },
      { id: 'evolution', columns: 6, rows: 4.5 },
      { id: 'upcoming', columns: 12, rows: 4 },
    ],
  };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new RangeError('Layout inválido.');
  return value as Record<string, unknown>;
}

/** Contrato fechado, reutilizado na aplicação e nas fronteiras privilegiadas. */
export function parseCardLayout(value: unknown): CardLayout {
  const data = object(value);
  const legacy = data['version'] === 1;
  const current = data['version'] === 3;
  const hasRows = current && 'rowStarts' in data;
  if (
    Object.keys(data).sort().join(',') !==
      (legacy
        ? 'area,cards,version'
        : hasRows
          ? 'area,cards,priority,rowStarts,version'
          : 'area,cards,priority,version') ||
    (!legacy && !current && data['version'] !== 2) ||
    data['area'] !== 'finance-general' ||
    !Array.isArray(data['cards']) ||
    data['cards'].length !== IDS.length
  )
    throw new RangeError('Layout incompatível.');
  const seen = new Set<string>();
  const cards = data['cards'].map((value: unknown) => {
    const item = object(value);
    const id = item['id'] as FinanceCardId;
    const columns = item['columns'] as number;
    const rows = item['rows'] as number;
    if (
      !['columns,id,rows', ...(current ? ['align,columns,id,rows'] : [])].includes(
        Object.keys(item).sort().join(','),
      ) ||
      ('align' in item &&
        (!Number.isFinite(item['align']) ||
          (item['align'] as number) < 0 ||
          (item['align'] as number) > 1)) ||
      !IDS.includes(id) ||
      seen.has(id) ||
      !Number.isFinite(columns) ||
      (legacy && !Number.isInteger(columns)) ||
      columns < CARD_GRID.minColumns ||
      columns > CARD_GRID.columns ||
      !Number.isFinite(rows) ||
      (legacy && !Number.isInteger(rows)) ||
      rows < CARD_GRID.minRows ||
      rows > CARD_GRID.maxRows
    )
      throw new RangeError('Dimensões ou cards inválidos.');
    seen.add(id);
    return { id, columns, rows, ...('align' in item ? { align: item['align'] as number } : {}) };
  });
  const priority = legacy ? null : data['priority'];
  if (!(priority === null || IDS.includes(priority as FinanceCardId)))
    throw new RangeError('Prioridade inválida.');
  const rowStarts = data['rowStarts'];
  if (
    hasRows &&
    (!Array.isArray(rowStarts) ||
      !rowStarts.length ||
      rowStarts.length > cards.length ||
      rowStarts[0] !== cards[0]!.id ||
      rowStarts.some(
        (id, index) =>
          !IDS.includes(id) ||
          (index > 0 &&
            cards.findIndex((card) => card.id === id) <=
              cards.findIndex((card) => card.id === rowStarts[index - 1])),
      ))
  )
    throw new RangeError('Linhas inválidas.');
  return {
    version: 3,
    area: 'finance-general',
    priority: priority as FinanceCardId | null,
    cards,
    ...(hasRows ? { rowStarts: [...(rowStarts as FinanceCardId[])] } : {}),
  };
}

export function reorderCard(
  layout: CardLayout,
  id: FinanceCardId,
  target: number,
  releaseRows = false,
): CardLayout {
  const parsed = parseCardLayout(layout);
  if (!Number.isInteger(target) || target < 0 || target >= parsed.cards.length)
    throw new RangeError('Posição inválida.');
  const cards = [...parsed.cards];
  const from = cards.findIndex((card) => card.id === id);
  if (from < 0) throw new RangeError('Card indisponível.');
  if (from === target && !releaseRows) return parsed;
  const [moving] = cards.splice(from, 1);
  cards.splice(target, 0, moving!);
  return { version: parsed.version, area: parsed.area, priority: parsed.priority, cards };
}

export function resizeCard(
  layout: CardLayout,
  id: FinanceCardId,
  columns: number,
  rows: number,
  width = 1200,
  widthChanged = true,
): CardLayout {
  if (!layout.cards.some((card) => card.id === id)) throw new RangeError('Card indisponível.');
  // Uma edição na apresentação estreita não transforma suas quebras responsivas em preferência.
  const before = resolveCardLayout(
    layout,
    width < 2 * CARD_GRID.minWidth + CARD_GRID.gap ? 1200 : width,
  ).cards;
  const origin = before.find((card) => card.id === id)!;
  const requestedWidth = Math.min(
    width,
    Math.max(
      Math.min(CARD_GRID.minWidth, width),
      ((width + CARD_GRID.gap) * columns) / CARD_GRID.columns - CARD_GRID.gap,
    ),
  );
  const growing = widthChanged && requestedWidth > origin.width + 0.1;
  const rowStarts = before
    .filter((card, index) => !index || card.y !== before[index - 1]!.y)
    .map((card) => card.id);
  const resized = parseCardLayout({
    ...layout,
    priority: growing ? id : layout.priority,
    rowStarts,
    cards: layout.cards.map((card) => (card.id === id ? { ...card, columns, rows } : card)),
  });
  if (growing || !widthChanged) return resized;
  const after = resolveCardLayout(resized, width).cards;
  const current = after.find((card) => card.id === id)!;
  const row = after.filter((card) => card.y === current.y);
  const slack =
    width - row.reduce((sum, card) => sum + card.width, 0) - CARD_GRID.gap * (row.length - 1);
  if (slack <= 0.5) return resized;
  const alignments = new Map<FinanceCardId, number>();
  let base = 0;
  for (const card of row) {
    const previous = before.find((item) => item.id === card.id)!;
    alignments.set(
      card.id,
      Math.max(0, Math.min(1, Math.round(((previous.x - base) / slack) * 1000000) / 1000000)),
    );
    base += card.width + CARD_GRID.gap;
  }
  return parseCardLayout({
    ...resized,
    cards: resized.cards.map((card) => {
      const align = alignments.get(card.id);
      return align === undefined || (align === 0 && card.align === undefined)
        ? card
        : { ...card, align };
    }),
  });
}

export interface CardBox {
  readonly id: FinanceCardId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export interface ResolvedCardLayout {
  readonly cards: readonly CardBox[];
  readonly height: number;
}

/** Encaixe curto na altura de um vizinho da mesma linha, com saída suave. */
export function assistedCardHeight(
  id: FinanceCardId,
  height: number,
  boxes: readonly CardBox[],
  current: number | null = null,
): number | null {
  const origin = boxes.find((box) => box.id === id);
  if (!origin) return null;
  const targets = boxes
    .filter((box) => box.id !== id && Math.abs(box.y - origin.y) < 1)
    .map((box) => box.height);
  if (current !== null && targets.includes(current) && Math.abs(height - current) <= 12)
    return current;
  return (
    targets
      .filter((target) => Math.abs(height - target) <= 8)
      .sort((a, b) => Math.abs(a - height) - Math.abs(b - height))[0] ?? null
  );
}

/** Inserção nas duas metades de cada destino, usando caixas estáveis do início do gesto. */
export function cardInsertionIndex(
  id: FinanceCardId,
  boxes: readonly CardBox[],
  x: number,
  y: number,
): number {
  const origin = boxes.find((box) => box.id === id);
  if (
    origin &&
    x >= origin.x &&
    x <= origin.x + origin.width &&
    y >= origin.y &&
    y <= origin.y + origin.height
  )
    return boxes.indexOf(origin);
  const remaining = boxes.filter((box) => box.id !== id);
  if (!remaining.length) return 0;
  const rows: CardBox[][] = [];
  for (const box of boxes) {
    const row = rows.at(-1);
    if (row && Math.abs(row[0]!.y - box.y) < 1) row.push(box);
    else rows.push([box]);
  }
  let destination = rows[0]!;
  let distance = Infinity;
  // Um espaço à esquerda/direita pertence à linha sob o ponteiro, mesmo que
  // um card largo de outra linha fique mais perto pela distância euclidiana.
  for (const row of rows) {
    const top = row[0]!.y;
    const bottom = Math.max(...row.map((box) => box.y + box.height));
    const next = Math.max(top - y, 0, y - bottom);
    if (next < distance) {
      destination = row;
      distance = next;
    }
  }
  const candidates = destination.filter((box) => box.id !== id);
  if (!candidates.length) return boxes.findIndex((box) => box.id === id);
  let nearest = candidates[0]!;
  distance = Infinity;
  for (const box of candidates) {
    const next = Math.max(box.x - x, 0, x - box.x - box.width);
    if (next < distance) {
      nearest = box;
      distance = next;
    }
  }
  const horizontal = destination.length > 1;
  const after =
    horizontal || x < nearest.x || x > nearest.x + nearest.width
      ? x >= nearest.x + nearest.width / 2
      : y >= nearest.y + nearest.height / 2;
  return remaining.indexOf(nearest) + (after ? 1 : 0);
}

export interface CardDropPreview {
  readonly mode: 'origin' | 'swap' | 'insert' | 'place';
  readonly layout: CardLayout;
}

/** Sobrepor troca; ultrapassar a borda insere, sem alterar os demais na troca. */
export function previewCardDrop(
  layout: CardLayout,
  id: FinanceCardId,
  boxes: readonly CardBox[],
  x: number,
  y: number,
  horizontal?: { readonly left: number; readonly width: number },
): CardDropPreview {
  const target = boxes.find(
    (box) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height,
  );
  if (!target || target.id === id) {
    const origin = boxes.find((box) => box.id === id);
    if (origin && horizontal && y >= origin.y && y <= origin.y + origin.height) {
      const row = boxes.filter((box) => Math.abs(box.y - origin.y) < 1);
      const index = row.indexOf(origin);
      const slack =
        horizontal.width -
        row.reduce((sum, box) => sum + box.width, 0) -
        CARD_GRID.gap * (row.length - 1);
      const before = row[index - 1];
      const after = row[index + 1];
      const min = before ? before.x + before.width + CARD_GRID.gap : 0;
      const max = after ? after.x - CARD_GRID.gap - origin.width : horizontal.width - origin.width;
      const desired = Math.max(0, Math.min(horizontal.width - origin.width, horizontal.left));
      if (slack > 0.5 && desired >= min - 0.5 && desired <= max + 0.5) {
        const base = row.slice(0, index).reduce((sum, box) => sum + box.width + CARD_GRID.gap, 0);
        const align = Math.max(
          0,
          Math.min(1, Math.round(((desired - base) / slack) * 1000000) / 1000000),
        );
        return {
          mode: 'place',
          layout: parseCardLayout({
            ...layout,
            cards: layout.cards.map((card) => (card.id === id ? { ...card, align } : card)),
          }),
        };
      }
    }
    if (target?.id === id) return { mode: 'origin', layout };
  }
  if (target) {
    const parsed = parseCardLayout(layout);
    const from = parsed.cards.findIndex((card) => card.id === id);
    const to = parsed.cards.findIndex((card) => card.id === target.id);
    if (from < 0 || to < 0) throw new RangeError('Card indisponível.');
    const cards = [...parsed.cards];
    [cards[from], cards[to]] = [cards[to]!, cards[from]!];
    return {
      mode: 'swap',
      layout: { version: parsed.version, area: parsed.area, priority: parsed.priority, cards },
    };
  }
  return {
    mode: 'insert',
    layout: reorderCard(layout, id, cardInsertionIndex(id, boxes, x, y), true),
  };
}

/** Dimensões preferidas nunca são sobrescritas pela compressão de um vizinho. */
export function resolveCardLayout(layout: CardLayout, width: number): ResolvedCardLayout {
  if (!Number.isFinite(width) || width <= 0) return { cards: [], height: 0 };
  const gap = CARD_GRID.gap;
  const min = Math.min(CARD_GRID.minWidth, width);
  const vertical = width < 2 * min + gap;
  const preferred = (card: CardLayout['cards'][number]) =>
    vertical
      ? width
      : Math.min(width, Math.max(min, ((width + gap) * card.columns) / CARD_GRID.columns - gap));
  const boxes: CardBox[] = [];
  let y = 0;
  let row: CardLayout['cards'][number][] = [];
  const fits = (candidate: typeof row): boolean => {
    const total =
      candidate.reduce((sum, card) => sum + preferred(card), 0) + gap * (candidate.length - 1);
    if (total <= width + 0.01) return true;
    // Um card de largura completa não pode ser comprimido para subir de linha.
    if (candidate.some((card) => card.id !== layout.priority && card.columns === CARD_GRID.columns))
      return false;
    const priority = candidate.find((card) => card.id === layout.priority);
    return (
      !vertical &&
      !!priority &&
      preferred(priority) + (candidate.length - 1) * (min + gap) <= width + 0.01
    );
  };
  const flush = () => {
    if (!row.length) return;
    const sizes = row.map(preferred);
    let excess = sizes.reduce((sum, value) => sum + value, 0) + gap * (row.length - 1) - width;
    // Retirar espaço de quem não está sendo redimensionado, até o seu mínimo.
    for (let index = row.length - 1; index >= 0 && excess > 0.001; index--) {
      if (row[index]!.id === layout.priority) continue;
      const reduction = Math.min(excess, sizes[index]! - min);
      sizes[index]! -= reduction;
      excess -= reduction;
    }
    const slack = Math.max(
      0,
      width - sizes.reduce((sum, size) => sum + size, 0) - gap * (row.length - 1),
    );
    let x = 0,
      alignment = 0,
      height = 0;
    row.forEach((card, index) => {
      alignment = Math.max(alignment, card.align ?? 0);
      const cardHeight = card.rows * (CARD_GRID.rowHeight + gap) - gap;
      boxes.push({
        id: card.id,
        x: x + slack * alignment,
        y,
        width: sizes[index]!,
        height: cardHeight,
      });
      x += sizes[index]! + gap;
      height = Math.max(height, cardHeight);
    });
    y += height + gap;
    row = [];
  };
  for (const card of layout.cards) {
    if (row.length && layout.rowStarts?.includes(card.id)) flush();
    if (row.length && !fits([...row, card])) flush();
    row.push(card);
  }
  flush();
  return { cards: boxes, height: Math.max(0, y - gap) };
}
