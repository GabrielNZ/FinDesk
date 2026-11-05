import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { GroupingRow, StatementGroup } from '../../../../../application/statement-grouping';
import { formatMoney } from '../../../../../application/finance-context';
import { MOVEMENT_TYPES } from '../../../../../application/statement';

export function groupToggleId(id: string): string {
  return `statement-group-toggle-${encodeURIComponent(id)}`;
}

export function statementGroupIcon(group: StatementGroup): string {
  if (group.filter.level === 'kind') return MOVEMENT_TYPES[group.filter.kind].icon;
  const icons: Readonly<Record<string, string>> = {
    alimentacao: 'pi-shopping-cart',
    casa: 'pi-home',
    entretenimento: 'pi-ticket',
    transporte: 'pi-car',
  };
  const key = group.filter.categoryId;
  return key && Object.hasOwn(icons, key) ? icons[key]! : 'pi-tag';
}

@Component({
  selector: 'fd-statement-groups',
  imports: [NgTemplateOutlet],
  templateUrl: './statement-groups.html',
  styleUrl: './statement-groups.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatementGroups {
  readonly groups = input.required<readonly StatementGroup[]>();
  readonly openId = input<string | null>(null);
  readonly expandedHeight = input(400);
  readonly dragId = input<string | null>(null);
  readonly expandedGroup = computed(() =>
    this.groups().find((group) => group.id === this.openId()),
  );
  readonly movementTemplate = input.required<TemplateRef<{ $implicit: GroupingRow }>>();
  readonly groupToggled = output<string>();
  readonly groupDragStarted = output<{ event: PointerEvent; id: string }>();
  readonly groupSelected = output<string>();
  readonly formatMoney = formatMoney;
  readonly toggleId = groupToggleId;
  readonly icon = statementGroupIcon;

  contentId(id: string): string {
    return `statement-group-content-${encodeURIComponent(id)}`;
  }
  startDrag(event: PointerEvent, id: string): void {
    const target = event.target as HTMLElement;
    const control = target.closest('button, input, a, select, textarea');
    if (target.closest('.movement') || (control && !control.classList.contains('group-summary')))
      return;
    this.groupDragStarted.emit({ event, id });
  }
}
