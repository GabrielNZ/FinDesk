import { Injectable, signal } from '@angular/core';

/** Consulta da execução, independente do cartão de referência e do período global. */
@Injectable({ providedIn: 'root' })
export class CardConsultation {
  readonly cards = signal<Readonly<Record<string, string>>>({});
  readonly invoices = signal<Readonly<Record<string, string>>>({});
  selectCard(account: string, card: string): void {
    this.cards.update((value) => ({ ...value, [account]: card }));
  }
  selectInvoice(card: string, invoice: string): void {
    this.invoices.update((value) => ({ ...value, [card]: invoice }));
  }
}
