import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface AreaDescription {
  title: string;
  description: string;
  icon: string;
  areas: readonly string[];
  emptyTitle: string;
  emptyDescription: string;
}

/** Composição provisória compartilhada pelas áreas ainda sem fluxos financeiros. */
@Component({
  selector: 'fd-planned-area-page',
  template: `
    <div class="page-heading">
      <div>
        <h1>{{ area.title }}<span class="heading-dot">.</span></h1>
        <p class="page-description">{{ area.description }}</p>
      </div>
      <span class="outline-tag">Em preparação</span>
    </div>
    <section class="empty-panel" [attr.aria-label]="area.title + ' — estrutura inicial'">
      <span class="empty-icon"><i [class]="'pi ' + area.icon" aria-hidden="true"></i></span>
      <h2>{{ area.emptyTitle }}</h2>
      <p>{{ area.emptyDescription }}</p>
      <div class="planned-list">
        @for (item of area.areas; track item) {
          <span><i class="pi pi-circle" aria-hidden="true"></i>{{ item }}</span>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannedAreaPage {
  readonly area = inject(ActivatedRoute).snapshot.data as AreaDescription;
}
