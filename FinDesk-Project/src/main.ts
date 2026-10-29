import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch(() => {
  // Sem detalhes de ambiente ou dados pessoais nos logs da interface.
  console.error('Não foi possível iniciar a interface do FinDesk.');
});
