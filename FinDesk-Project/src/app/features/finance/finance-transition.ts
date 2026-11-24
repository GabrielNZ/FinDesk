import type { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';
import { FINANCE_SUBMENUS } from './finance-submenus';

function sectionIndex(root: ActivatedRouteSnapshot): number {
  const finance = root.children.find(
    (route) => route.outlet === 'primary' && route.routeConfig?.path === 'financas',
  );
  const section = finance?.children.find((route) => route.outlet === 'primary');
  return FINANCE_SUBMENUS.findIndex((entry) => entry.path === section?.routeConfig?.path);
}

/** Só a apresentação muda: seleção, foco e ciclo de vida continuam sob o Router. */
export function financeTransition({ transition, from, to }: ViewTransitionInfo): void {
  const previous = sectionIndex(from);
  const next = sectionIndex(to);
  if (
    previous < 0 ||
    next < 0 ||
    previous === next ||
    matchMedia('(prefers-reduced-motion: reduce)').matches ||
    !transition.types ||
    !CSS.supports('selector(:active-view-transition-type(finance-forward))')
  ) {
    transition.skipTransition();
    return;
  }
  transition.types.add(next > previous ? 'finance-forward' : 'finance-backward');
}
