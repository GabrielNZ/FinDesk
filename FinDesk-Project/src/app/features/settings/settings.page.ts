import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'fd-settings-page',
  imports: [RouterLink],
  template: `
    <div class="page-heading">
      <div>
        <h1>Configurações<span class="heading-dot">.</span></h1>
        <p class="page-description">Integrações e preferências.</p>
      </div>
    </div>
    <section class="settings-section" aria-labelledby="integrations-title">
      <div class="settings-section-icon"><i class="pi pi-link" aria-hidden="true"></i></div>
      <div>
        <h2 id="integrations-title">Integrações</h2>
        <div class="settings-empty">
          <i class="pi pi-lock" aria-hidden="true"></i>
          <div>
            <strong>Nenhuma instituição conectada.</strong>
            <p>Integrações ainda não disponíveis nesta versão.</p>
          </div>
          <span class="outline-tag">Etapa futura</span>
        </div>
      </div>
    </section>
    <section class="settings-section" aria-labelledby="identity-title">
      <div class="settings-section-icon"><i class="pi pi-palette" aria-hidden="true"></i></div>
      <div>
        <h2 id="identity-title">Identidade do FinDesk</h2>
        <p>Logo original: moedas e seta ascendente.</p>
        <a class="text-link" routerLink="/configuracoes/identidade"
          >Ver logo <i class="pi pi-arrow-right" aria-hidden="true"></i
        ></a>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {}
