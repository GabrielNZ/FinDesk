import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'fd-identity-page',
  imports: [RouterLink],
  styles: ['.small-previews { grid-template-columns: 1fr; }'],
  template: `
    <a class="back-link" routerLink="/configuracoes"
      ><i class="pi pi-arrow-left" aria-hidden="true"></i> Configurações</a
    >
    <div class="page-heading">
      <div>
        <h1>Logo<span class="heading-dot">.</span></h1>
        <p class="page-description">Arquivo original fornecido por Gabriel.</p>
      </div>
    </div>
    <div class="identity-grid">
      <section class="identity-card" aria-labelledby="dark-logo-title">
        <div class="identity-card-heading"><h2 id="dark-logo-title">Fundo escuro</h2></div>
        <div class="brand-preview">
          <img
            src="brand/symbol.svg"
            alt="Logo original branca: moedas e seta ascendente"
            width="48"
            height="48"
          /><span>FinDesk</span>
        </div>
        <div class="small-previews">
          <div>
            <img
              src="brand/symbol.svg"
              alt="Logo branca em tamanho pequeno"
              width="20"
              height="20"
            /><span>20 px</span>
          </div>
        </div>
      </section>
      <section class="identity-card" aria-labelledby="light-logo-title">
        <div class="identity-card-heading"><h2 id="light-logo-title">Fundo claro</h2></div>
        <div class="brand-preview" style="background: #e8ede9; color: #17201b;">
          <img
            src="brand/symbol-on-light.svg"
            alt="Logo original preta: moedas e seta ascendente"
            width="48"
            height="48"
          /><span>FinDesk</span>
        </div>
        <div class="small-previews">
          <div class="light-preview">
            <img
              src="brand/symbol-on-light.svg"
              alt="Logo preta em tamanho pequeno"
              width="20"
              height="20"
            /><span>20 px</span>
          </div>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdentityPage {}
