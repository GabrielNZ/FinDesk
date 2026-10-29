import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter, withHashLocation } from '@angular/router';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';

registerLocaleData(localePt);

const FinDeskPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f0faf5',
      100: '#d5f1e3',
      200: '#ace2c8',
      300: '#7fcba8',
      400: '#6cbd9a',
      500: '#56a984',
      600: '#418968',
      700: '#346d54',
      800: '#2c5745',
      900: '#254839',
      950: '#10291e',
    },
    colorScheme: {
      dark: {
        primary: {
          color: '{primary.300}',
          inverseColor: '#10291e',
          hoverColor: '{primary.200}',
          activeColor: '{primary.400}',
        },
        surface: {
          0: '#ffffff',
          50: '#f3f5f4',
          100: '#dce1df',
          200: '#bbc5c0',
          300: '#99a8a0',
          400: '#86948d',
          500: '#65736b',
          600: '#46524b',
          700: '#313a35',
          800: '#252c28',
          900: '#191f1c',
          950: '#111416',
        },
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    providePrimeNG({
      theme: { preset: FinDeskPreset, options: { darkModeSelector: '.fd-dark', cssLayer: false } },
    }),
  ],
};
