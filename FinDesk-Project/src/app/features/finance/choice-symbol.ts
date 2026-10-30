import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

export type ChoiceSymbol = 'nubank' | 'nomad' | 'wallet' | 'accounts' | 'brl' | 'usd' | 'original';
const IMAGES: Partial<Record<ChoiceSymbol, string>> = {
  nubank: 'institutions/nubank.ico',
  nomad: 'institutions/nomad.jpg',
  brl: 'flags/br.svg',
  usd: 'flags/us.svg',
};

@Component({
  selector: 'fd-choice-symbol',
  template: `
    @if (images[symbol()]; as source) {
      @if (!failed()) {
        <img [src]="source" alt="" (error)="failed.set(true)" draggable="false" />
      } @else {
        <i class="pi pi-wallet" aria-hidden="true"></i>
      }
    } @else {
      <i
        [class]="
          'pi ' +
          (symbol() === 'original'
            ? 'pi-globe'
            : symbol() === 'accounts'
              ? 'pi-building-columns'
              : 'pi-wallet')
        "
        aria-hidden="true"
      ></i>
    }
  `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      flex: 0 0 42px;
      border-radius: 50%;
      overflow: hidden;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    i {
      color: var(--fd-accent);
      font-size: 19px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoiceSymbolView {
  readonly symbol = input.required<ChoiceSymbol>();
  readonly failed = signal(false);
  readonly images = IMAGES;
}
