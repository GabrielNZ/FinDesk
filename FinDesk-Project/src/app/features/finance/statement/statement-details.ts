import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import type { StatementRow } from '../../../../../application/statement';
import { MOVEMENT_TYPES } from '../../../../../application/statement';
import { CategoryStore } from './category-store.service';
import { formatMoney, formatCivilDate } from '../../../../../application/finance-context';

@Component({
  selector: 'fd-statement-details',
  template: `
    @let item = row();
    <dl>
      <div>
        <dt>Data</dt>
        <dd>{{ date(item.movement.on) }}</dd>
      </div>
      <div>
        <dt>Tipo</dt>
        <dd>{{ types[item.movement.kind].label }}</dd>
      </div>
      <div>
        <dt>Conta</dt>
        <dd>{{ item.accountName }}</dd>
      </div>
      <div>
        <dt>Valor original</dt>
        <dd
          [class.fd-flow-in]="item.movement.delta.minorUnits > 0"
          [class.fd-flow-out]="item.movement.delta.minorUnits < 0"
        >
          {{ money(item.movement.delta) }}
        </dd>
      </div>
      @if (item.category) {
        <div>
          <dt>Categoria</dt>
          <dd>
            <button
              type="button"
              class="edit-category"
              [attr.aria-label]="'Alterar categoria de ' + item.description"
              (click)="categoryRequested.emit(item)"
            >
              {{ catalogue.label(item.category) }} <i class="pi pi-pencil" aria-hidden="true"></i>
            </button>
          </dd>
        </div>
      }
      <div>
        <dt>Origem</dt>
        <dd>{{ sources[item.movement.origin.kind] }}</dd>
      </div>
      @if (item.movement.kind === 'expense' && item.movement.merchantId) {
        <div>
          <dt>Estabelecimento</dt>
          <dd>{{ catalogue.merchantLabel(item.movement.merchantId) }}</dd>
        </div>
      }
      <div>
        <dt>{{ item.movement.origin.kind === 'manual' ? 'Descrição' : 'Descrição original' }}</dt>
        <dd>{{ item.movement.description }}</dd>
      </div>
      <div>
        <dt>Fonte</dt>
        <dd>{{ item.movement.origin.sourceId }}</dd>
      </div>
      <div>
        <dt>Identificador</dt>
        <dd>{{ item.movement.origin.externalId ?? item.movement.id }}</dd>
      </div>
      @if (item.movement.kind === 'own-transfer') {
        <div>
          <dt>Transferência</dt>
          <dd>{{ item.movement.transferId }}</dd>
        </div>
      }
      @if (item.movement.kind === 'invoice-payment') {
        <div>
          <dt>Fatura</dt>
          <dd>{{ item.movement.invoiceId }}</dd>
        </div>
      }
    </dl>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    dl {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(145px, 100%), 1fr));
      gap: 14px 12px;
      margin: 0;
    }
    dt {
      font-size: 11px;
      color: var(--fd-muted);
      margin-bottom: 4px;
    }
    dd {
      font-size: 12px;
      margin: 0;
      overflow-wrap: anywhere;
    }
    .edit-category {
      border: 0;
      background: transparent;
      color: var(--fd-text);
      font: inherit;
      padding: 0;
      cursor: pointer;
      text-align: left;
    }
    .edit-category .pi {
      color: var(--fd-muted);
      margin-left: 6px;
      font-size: 10px;
    }
    .edit-category:hover {
      color: var(--fd-accent);
    }
    .edit-category:focus-visible {
      outline: 2px solid var(--fd-accent);
      outline-offset: 3px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatementDetails {
  readonly row = input.required<StatementRow>();
  readonly date = formatCivilDate;
  readonly money = formatMoney;
  readonly catalogue = inject(CategoryStore);
  readonly categoryRequested = output<StatementRow>();
  readonly types = MOVEMENT_TYPES;
  readonly sources = { manual: 'Manual', file: 'Arquivo', integration: 'Integração' };
}
