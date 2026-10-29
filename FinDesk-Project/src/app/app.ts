import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Menu, MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';
import { PRODUCT } from '../../shared/product';
import { RuntimeService } from './core/runtime.service';
import { NavigationLayout } from './layout/navigation-layout.service';

@Component({
  selector: 'fd-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ButtonModule, DialogModule, MenuModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly product = PRODUCT;
  readonly runtime = inject(RuntimeService);
  readonly aboutOpen = signal(false);
  readonly layout = inject(NavigationLayout);
  readonly positionMenuOpen = signal(false);
  readonly positionItems: MenuItem[] = [
    { label: 'Esquerda', icon: 'pi pi-arrow-left', command: () => this.layout.moveTo('left') },
    { label: 'Direita', icon: 'pi pi-arrow-right', command: () => this.layout.moveTo('right') },
    { label: 'Em cima', icon: 'pi pi-arrow-up', command: () => this.layout.moveTo('top') },
    { label: 'Embaixo', icon: 'pi pi-arrow-down', command: () => this.layout.moveTo('bottom') },
  ];

  openPositionMenu(event: MouseEvent, menu: Menu): void {
    if (!this.layout.wasDragged()) menu.toggle(event);
  }
  readonly navigation = [
    { path: '/visao-geral', label: 'Visão geral', icon: 'pi-th-large' },
    { path: '/financas', label: 'Finanças', icon: 'pi-wallet' },
    { path: '/investimentos', label: 'Investimentos', icon: 'pi-chart-line' },
  ];
}
