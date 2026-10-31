import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  defaultCardLayout,
  parseCardLayout,
  reorderCard,
  resizeCard,
  resolveCardLayout,
  cardInsertionIndex,
  previewCardDrop,
  assistedCardHeight,
} = require('../../out/application/card-layout.js');

test('F03a / FIN-003: mover e redimensionar preserva todos os cards e não altera o layout anterior', () => {
  const original = defaultCardLayout();
  const before = JSON.stringify(original);
  const moved = reorderCard(original, 'upcoming', 0);
  assert.deepEqual(
    moved.cards.map((card) => card.id),
    ['upcoming', 'categories', 'evolution'],
  );
  const resized = resizeCard(moved, 'evolution', 4, 8);
  assert.deepEqual(resized.cards[2], { id: 'evolution', columns: 4, rows: 8 });
  assert.equal(JSON.stringify(original), before);
  assert.deepEqual(defaultCardLayout(), original);
});

test('F03a / FIN-003: contrato recusa IDs repetidos, dimensões excessivas, área desconhecida e dados arbitrários', () => {
  const base = defaultCardLayout();
  for (const bad of [
    null,
    { ...base, area: 'outra' },
    { ...base, version: 99 },
    { ...base, sql: 'privado' },
    { ...base, cards: [] },
    { ...base, cards: [base.cards[0], base.cards[0], base.cards[2]] },
    ...[
      { columns: 0 },
      { columns: 13 },
      { columns: NaN },
      { rows: 0 },
      { rows: 13 },
      { id: 'segredo' },
      { payload: {} },
    ].map((change) => ({
      ...base,
      cards: [{ ...base.cards[0], ...change }, ...base.cards.slice(1)],
    })),
  ])
    assert.throws(() => parseCardLayout(bad), RangeError);
  assert.throws(() => reorderCard(base, 'categories', 99));
  assert.throws(() => resizeCard(base, 'ausente', 6, 4));
  const parsed = parseCardLayout(base);
  parsed.cards[0].columns = 12;
  assert.equal(base.cards[0].columns, 6);
});

test('F03a: vizinho cede largura até o mínimo e recupera a preferência quando quebra linha', () => {
  const initial = defaultCardLayout();
  const original = resolveCardLayout(initial, 1000);
  const wider = resizeCard(initial, 'categories', 8, 4);
  const adapted = resolveCardLayout(wider, 1000);
  assert.equal(adapted.cards[0].y, adapted.cards[1].y);
  assert.ok(adapted.cards[0].width > original.cards[0].width);
  assert.ok(adapted.cards[1].width < original.cards[1].width);
  assert.ok(adapted.cards[1].width >= 280);
  assert.equal(wider.cards[1].columns, initial.cards[1].columns);
  const wrapped = resolveCardLayout(resizeCard(initial, 'categories', 9, 4), 1000);
  assert.ok(wrapped.cards[1].y >= wrapped.cards[0].y + wrapped.cards[0].height);
  assert.equal(wrapped.cards[1].width, original.cards[1].width);
  assert.deepEqual(
    resolveCardLayout(parseCardLayout(JSON.parse(JSON.stringify(wider))), 1000),
    adapted,
  );
  const reversed = resolveCardLayout(resizeCard(initial, 'evolution', 8, 4), 1000);
  assert.ok(reversed.cards[0].width < original.cards[0].width);
  assert.ok(reversed.cards[1].width > original.cards[1].width);
});

test('F03a: dimensões contínuas e apresentação estreita preservam preferências e não sobrepõem cards', () => {
  const base = defaultCardLayout();
  const a = resolveCardLayout(resizeCard(base, 'categories', 6.1, 4.1), 1000);
  const b = resolveCardLayout(resizeCard(base, 'categories', 6.11, 4.11), 1000);
  assert.ok(b.cards[0].width - a.cards[0].width > 0 && b.cards[0].width - a.cards[0].width < 1);
  assert.ok(b.cards[0].height - a.cards[0].height > 0 && b.cards[0].height - a.cards[0].height < 1);
  for (const width of [400, 576, 700, 1000, 1600]) {
    const resolved = resolveCardLayout(resizeCard(base, 'categories', 8.5, 5.3), width);
    for (const card of resolved.cards)
      assert.ok(card.x >= 0 && card.x + card.width <= width + 0.01);
    for (let i = 0; i < resolved.cards.length; i++)
      for (let j = i + 1; j < resolved.cards.length; j++) {
        const x = resolved.cards[i],
          y = resolved.cards[j];
        assert.ok(
          x.x + x.width <= y.x ||
            y.x + y.width <= x.x ||
            x.y + x.height <= y.y ||
            y.y + y.height <= x.y,
        );
      }
  }
  assert.deepEqual(defaultCardLayout(), base);
});

test('F03a: layout v1 é convertido em memória, sem perder ordem ou dimensões', () => {
  const legacy = {
    version: 1,
    area: 'finance-general',
    cards: [
      { id: 'upcoming', columns: 12, rows: 5 },
      { id: 'evolution', columns: 6, rows: 4 },
      { id: 'categories', columns: 6, rows: 4 },
    ],
  };
  const upgraded = parseCardLayout(legacy);
  assert.equal(upgraded.version, 3);
  assert.equal(upgraded.priority, null);
  assert.deepEqual(upgraded.cards, legacy.cards);
  assert.equal(legacy.version, 1);
  assert.throws(() => parseCardLayout({ ...upgraded, priority: 'ausente' }));
});

test('F03a: inserção aceita antes/depois, laterais vazias e extremos de linhas sem substituir cards', () => {
  const layout = defaultCardLayout();
  const boxes = resolveCardLayout(layout, 1000).cards;
  assert.equal(cardInsertionIndex('categories', boxes, 200, 70), 0);
  assert.equal(cardInsertionIndex('evolution', boxes, 750, 70), 1);
  assert.equal(cardInsertionIndex('categories', boxes, 530, 70), 0);
  assert.equal(cardInsertionIndex('categories', boxes, 1010, 70), 1);
  assert.equal(cardInsertionIndex('evolution', boxes, -10, 70), 0);
  assert.equal(cardInsertionIndex('upcoming', boxes, 510, 70), 1);
  assert.equal(cardInsertionIndex('categories', boxes, 400, 1000), 2);
  const inserted = reorderCard(layout, 'upcoming', cardInsertionIndex('upcoming', boxes, 510, 70));
  assert.deepEqual(
    inserted.cards.map((card) => card.id),
    ['categories', 'upcoming', 'evolution'],
  );
  assert.deepEqual(
    inserted.cards.find((card) => card.id === 'evolution'),
    layout.cards[1],
  );
  const narrow = resolveCardLayout(layout, 400).cards;
  assert.equal(cardInsertionIndex('upcoming', narrow, 200, 10), 0);
  assert.equal(cardInsertionIndex('categories', narrow, 200, 1100), 2);
});

test('F03a: sobrepor troca dois cards; atravessar o destino insere e empurra os intermediários', () => {
  const initial = defaultCardLayout();
  const layout = { ...initial, cards: initial.cards.map((card) => ({ ...card, columns: 4 })) };
  const boxes = resolveCardLayout(layout, 1200).cards;
  const last = boxes[2];
  const swapped = previewCardDrop(layout, 'categories', boxes, last.x + last.width / 2, 80);
  assert.equal(swapped.mode, 'swap');
  assert.deepEqual(
    swapped.layout.cards.map((card) => card.id),
    ['upcoming', 'evolution', 'categories'],
  );
  assert.deepEqual(swapped.layout.cards[1], layout.cards[1]);
  const inserted = previewCardDrop(layout, 'categories', boxes, last.x + last.width + 10, 80);
  assert.equal(inserted.mode, 'insert');
  assert.deepEqual(
    inserted.layout.cards.map((card) => card.id),
    ['evolution', 'upcoming', 'categories'],
  );
  assert.deepEqual(previewCardDrop(layout, 'categories', boxes, last.x + 10, 80), swapped);
  assert.deepEqual(previewCardDrop(layout, 'categories', boxes, 100, 80).layout, layout);
  const vertical = resolveCardLayout(initial, 400).cards;
  const below = vertical[2];
  assert.equal(previewCardDrop(initial, 'categories', vertical, 100, below.y + 40).mode, 'swap');
  assert.deepEqual(
    previewCardDrop(
      initial,
      'categories',
      vertical,
      100,
      below.y + below.height + 10,
    ).layout.cards.map((card) => card.id),
    ['evolution', 'upcoming', 'categories'],
  );
  assert.deepEqual(defaultCardLayout(), initial);
});

test('F03a: espaço vazio da própria linha permite esquerda, centro e direita sem alterar ordem ou outras linhas', () => {
  const layout = reorderCard(reorderCard(defaultCardLayout(), 'evolution', 0), 'upcoming', 1);
  const original = resolveCardLayout(layout, 1000).cards;
  for (const align of [0, 0.25, 0.5, 1]) {
    const left = (1000 - original[0].width) * align;
    const drop = previewCardDrop(layout, 'evolution', original, left + 100, 80, {
      left,
      width: 1000,
    });
    assert.equal(drop.mode, 'place');
    assert.deepEqual(
      drop.layout.cards.map((card) => card.id),
      layout.cards.map((card) => card.id),
    );
    const resolved = resolveCardLayout(drop.layout, 1000).cards;
    assert.ok(Math.abs(resolved[0].x - left) < 0.01);
    assert.deepEqual(resolved.slice(1), original.slice(1));
    const reopened = parseCardLayout(JSON.parse(JSON.stringify(drop.layout)));
    assert.deepEqual(resolveCardLayout(reopened, 1000), resolveCardLayout(drop.layout, 1000));
    assert.equal(resolveCardLayout(reopened, 400).cards[0].x, 0);
    assert.ok(
      Math.abs(
        resolveCardLayout(reopened, 1400).cards[0].x -
          (1400 - resolveCardLayout(reopened, 1400).cards[0].width) * align,
      ) < 0.01,
    );
  }
  const blocked = defaultCardLayout();
  const boxes = resolveCardLayout(blocked, 1000).cards;
  assert.equal(
    previewCardDrop(blocked, 'categories', boxes, 750, 80, { left: 500, width: 1000 }).mode,
    'swap',
  );
  assert.equal(
    previewCardDrop(layout, 'evolution', original, 100, original[1].y + 80, {
      left: 0,
      width: 1000,
    }).mode,
    'swap',
  );
  for (const align of [-1, 1.1, NaN])
    assert.throws(() =>
      parseCardLayout({
        ...layout,
        cards: [{ ...layout.cards[0], align }, ...layout.cards.slice(1)],
      }),
    );
});

test('F03a: diminuir só o card escolhido mantém vizinhos e não puxa outra linha, inclusive em tela ampla', () => {
  const initial = defaultCardLayout();
  for (const width of [1000, 1600, 2200]) {
    const before = resolveCardLayout(initial, width).cards;
    const shrunk = resizeCard(initial, 'categories', 5.8, 3, width);
    const after = resolveCardLayout(shrunk, width).cards;
    assert.ok(after[0].width < before[0].width);
    assert.ok(Math.abs(after[1].x - before[1].x) < 0.001);
    assert.deepEqual({ ...after[1], x: before[1].x }, before[1]);
    assert.deepEqual(after[2], before[2]);
    assert.equal(shrunk.priority, null);
    assert.deepEqual(
      resolveCardLayout(parseCardLayout(JSON.parse(JSON.stringify(shrunk))), width).cards,
      after,
    );
    const heightOnly = resizeCard(initial, 'categories', 6, 3, width, false);
    assert.deepEqual(resolveCardLayout(heightOnly, width).cards.slice(1), before.slice(1));
    const growing = resizeCard(initial, 'categories', 8, 4.5, width);
    const adapted = resolveCardLayout(growing, width).cards;
    assert.ok(adapted[1].width <= before[1].width);
    assert.equal(adapted[2].width, before[2].width);
    assert.ok(adapted[2].y > adapted[0].y);
    const nextShrink = resizeCard(growing, 'categories', 7.9, 4.5, width);
    assert.ok(resolveCardLayout(nextShrink, width).cards[2].y > 0);
  }
  const compact = resizeCard(initial, 'categories', 6, 4, 400, false);
  assert.equal(resolveCardLayout(compact, 1200).cards[1].y, 0);
  const three = { ...initial, cards: initial.cards.map((card) => ({ ...card, columns: 4 })) };
  const enlarged = resizeCard(three, 'categories', 4.2, 4.5, 1600);
  assert.ok(resolveCardLayout(enlarged, 1600).cards.every((card) => card.y === 0));
  assert.equal(
    reorderCard(resizeCard(initial, 'categories', 5.8, 4.5, 1600), 'upcoming', 1).rowStarts,
    undefined,
  );
  for (const rowStarts of [
    [],
    ['evolution'],
    ['categories', 'categories'],
    ['categories', 'upcoming', 'evolution'],
    ['categories', 'unknown'],
  ])
    assert.throws(() => parseCardLayout({ ...initial, rowStarts }));
});

test('F03a: espaço vazio seleciona a linha correta e permite reagrupar sem mudar a ordem dos IDs', () => {
  const layout = {
    version: 3,
    area: 'finance-general',
    priority: 'categories',
    rowStarts: ['categories', 'evolution', 'upcoming'],
    cards: [
      { id: 'categories', columns: 4, rows: 4.563, align: 0.024297 },
      { id: 'evolution', columns: 4, rows: 4.575, align: 0.785892 },
      { id: 'upcoming', columns: 12, rows: 4 },
    ],
  };
  const boxes = resolveCardLayout(layout, 1600).cards;
  const drop = previewCardDrop(layout, 'categories', boxes, 80, boxes[1].y + 70);
  assert.equal(drop.mode, 'insert');
  assert.deepEqual(
    drop.layout.cards.map((card) => card.id),
    layout.cards.map((card) => card.id),
  );
  assert.equal(drop.layout.rowStarts, undefined);
  const after = resolveCardLayout(drop.layout, 1600).cards;
  assert.equal(after[0].y, after[1].y);
  assert.ok(after[0].x < after[1].x);
});

test('F03a: combinações de ordens, alinhamentos, tamanhos e destinos produzem layouts válidos sem sobreposição', () => {
  const ids = ['categories', 'evolution', 'upcoming'];
  const orders = ids.flatMap((first) =>
    ids
      .filter((id) => id !== first)
      .map((second) => [first, second, ids.find((id) => id !== first && id !== second)]),
  );
  for (const order of orders)
    for (const columns of [
      [6, 6, 12],
      [4, 4, 12],
      [4, 4, 4],
      [8, 6, 4],
      [11.5, 4, 12],
    ])
      for (const split of [false, true])
        for (const width of [400, 800, 1200, 1800]) {
          const layout = {
            version: 3,
            area: 'finance-general',
            priority: order[0],
            cards: order.map((id, index) => ({
              id,
              columns: columns[index],
              rows: 3 + index,
              align: index / 2,
            })),
            ...(split ? { rowStarts: order } : {}),
          };
          const boxes = resolveCardLayout(layout, width).cards;
          for (const id of ids)
            for (const target of boxes)
              for (const [x, y] of [
                [target.x + target.width / 2, target.y + target.height / 2],
                [target.x - 10, target.y + 30],
                [target.x + target.width + 10, target.y + 30],
                [target.x + 40, target.y + target.height + 10],
              ]) {
                const drop = previewCardDrop(layout, id, boxes, x, y, { left: x - 100, width });
                assert.deepEqual(parseCardLayout(drop.layout), drop.layout);
                assert.deepEqual(
                  [...drop.layout.cards.map((card) => card.id)].sort(),
                  [...ids].sort(),
                );
                const resolved = resolveCardLayout(drop.layout, width).cards;
                for (const box of resolved)
                  assert.ok(box.x >= -0.01 && box.x + box.width <= width + 0.01);
                for (let a = 0; a < resolved.length; a++)
                  for (let b = a + 1; b < resolved.length; b++) {
                    const first = resolved[a],
                      second = resolved[b];
                    assert.ok(
                      first.x + first.width <= second.x + 0.01 ||
                        second.x + second.width <= first.x + 0.01 ||
                        first.y + first.height <= second.y + 0.01 ||
                        second.y + second.height <= first.y + 0.01,
                    );
                  }
              }
        }
});

test('F03a: assistência de altura capta só vizinhos da mesma linha e libera ao continuar o arraste', () => {
  const boxes = resolveCardLayout(defaultCardLayout(), 1200).cards;
  assert.equal(assistedCardHeight('categories', 350, boxes), 344);
  assert.equal(assistedCardHeight('categories', 355, boxes, 344), 344);
  assert.equal(assistedCardHeight('categories', 357, boxes, 344), null);
  assert.equal(assistedCardHeight('categories', 335, boxes), null);
  assert.equal(assistedCardHeight('categories', 304, boxes), null);
  assert.equal(assistedCardHeight('upcoming', 344, boxes), null);
  const vertical = resolveCardLayout(defaultCardLayout(), 400).cards;
  assert.equal(assistedCardHeight('categories', 344, vertical), null);
});
