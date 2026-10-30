import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { FinancePreferences } from '../../../../shared/storage-api';

@Component({
  selector: 'fd-period-symbol',
  template: `
    @if (mode() === 'salary-cycle') {
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="3" r="2" />
        <path
          d="M11 5v3m-1.5-1.5L11 8l1.5-1.5M9 10h4M5 12c1-2 3-3 6-3h3l3-2v4l2 2h2v5h-3l-1 3h-3l-.5-2h-5L8 21H5l-1-4c-2-1-2-3-1-4M3 13c-2 0-2-2-1-2"
        />
        <circle cx="16" cy="13" r=".7" fill="currentColor" stroke="none" />
      </svg>
    } @else {
      <i
        [class]="'pi ' + (mode() === 'calendar-month' ? 'pi-calendar' : 'pi-credit-card')"
        aria-hidden="true"
      ></i>
    }
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      width: 24px;
      height: 24px;
      flex: 0 0 24px;
    }
    svg {
      width: 24px;
      height: 24px;
    }
    .pi {
      font-size: 19px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodSymbol {
  readonly mode = input.required<FinancePreferences['periodMode']>();
}
