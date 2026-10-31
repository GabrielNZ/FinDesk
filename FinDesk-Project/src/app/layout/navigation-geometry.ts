export type NavigationPosition = 'left' | 'right' | 'top' | 'bottom';

export function isHorizontal(position: NavigationPosition): boolean {
  return position === 'top' || position === 'bottom';
}

/** Só oferece encaixe nas bordas da janela; soltar no centro não reposiciona. */
export function dockTarget(
  x: number,
  y: number,
  frame: DOMRectReadOnly,
): NavigationPosition | null {
  if (x < frame.left || x > frame.right || y < frame.top || y > frame.bottom) return null;
  const edges: Array<[NavigationPosition, number]> = [
    ['left', x - frame.left],
    ['right', frame.right - x],
    ['top', y - frame.top],
    ['bottom', frame.bottom - y],
  ];
  edges.sort((a, b) => a[1] - b[1]);
  const nearest = edges[0];
  return nearest && nearest[1] <= 128 ? nearest[0] : null;
}
