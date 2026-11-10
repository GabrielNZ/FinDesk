import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { ExpenseStatementPreview } from '../../../../../application/expense-analysis';
import { formatCivilDate, formatMoney } from '../../../../../application/finance-context';
import { CategoryStore } from './category-store.service';

@Component({
  selector: 'fd-expense-statement-modal',
  host: { '(keydown)': '$event.stopPropagation()' },
  templateUrl: './expense-statement-modal.html',
  styleUrl: './expense-statement-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseStatementModal {
  readonly preview = input.required<ExpenseStatementPreview>();
  readonly closed = output<void>();
  readonly catalogue = inject(CategoryStore);
  readonly money = formatMoney;
  readonly date = formatCivilDate;
  readonly sources = { manual: 'Manual', file: 'Arquivo', integration: 'Integração' };
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    let workspace: HTMLElement | null = null;
    let nativeDialog: HTMLDialogElement | null = null;
    let overflow = '',
      scrollTop = 0;
    const returnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restore = () => {
      if (workspace) {
        workspace.style.overflowY = overflow;
        workspace.scrollTop = scrollTop;
      }
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    };
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      nativeDialog = dialog;
      workspace = dialog.closest<HTMLElement>('.workspace');
      if (workspace) {
        overflow = workspace.style.overflowY;
        scrollTop = workspace.scrollTop;
        workspace.style.overflowY = 'hidden';
      }
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('[data-close]')?.focus({ preventScroll: true });
    });
    inject(DestroyRef).onDestroy(() => {
      if (nativeDialog?.open) nativeDialog.close();
      restore();
    });
  }
  close(): void {
    this.dialog().nativeElement.close();
  }
}
