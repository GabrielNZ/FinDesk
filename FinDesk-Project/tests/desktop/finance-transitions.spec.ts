import { test, expect, _electron as electron, type Page } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';

declare global {
  interface Window {
    financeMotionReview: { names: string[]; animations: CSSAnimation[] }[];
  }
}

async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-motion-')
  )
    throw new Error('Perfil temporário inválido.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
async function finish(page: Page) {
  await page.evaluate(() => {
    for (const animation of document.getAnimations())
      if (animation instanceof CSSAnimation && animation.animationName.startsWith('finance-slide'))
        animation.finish();
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.matches(':active-view-transition')))
    .toBe(false);
}

test('F02c: ida/volta, histórico, trocas rápidas, teclado, contexto, movimento reduzido e fallback', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-motion-'));
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  const app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0]!;
      window.setSize(1380, 960);
      window.show();
      window.focus();
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('link', { name: 'Finanças', exact: true }).click();
    await expect(page.locator('fd-card-board').first()).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter(
                (a) => a instanceof CSSAnimation && a.animationName.startsWith('finance-slide'),
              ).length,
        ),
      )
      .toBe(0);
    // Pausar capturas nativas permite inspecionar o quadro intermediário sem depender de tempo de máquina.
    await page.evaluate(() => {
      window.financeMotionReview = [];
      const start = document.startViewTransition.bind(document);
      document.startViewTransition = (update) => {
        const transition = start(update);
        void transition.ready.then(
          () => {
            const animations = document
              .getAnimations()
              .filter(
                (a): a is CSSAnimation =>
                  a instanceof CSSAnimation && a.animationName.startsWith('finance-slide'),
              );
            for (const animation of animations) {
              animation.pause();
              animation.currentTime = 96;
            }
            if (animations.length)
              window.financeMotionReview.push({
                names: animations.map((a) => a.animationName),
                animations,
              });
          },
          () => {},
        );
        return transition;
      };
    });
    const nav = page.getByRole('navigation', { name: 'Submenus de Finanças' });
    const header = page.getByRole('region', { name: 'Contexto financeiro' });
    const headerBox = await header.boundingBox();
    const before = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      layout: await window.finDesk!.storage.getCardLayout(),
      charts: await window.finDesk!.storage.getExpenseChartsLayout(),
      period: document.querySelector('fd-period-control')?.textContent,
    }));
    const names = () => page.evaluate(() => window.financeMotionReview.at(-1)?.names.sort());
    const count = () => page.evaluate(() => window.financeMotionReview.length);
    await nav.getByRole('link', { name: 'Cartão', exact: true }).click();
    await expect.poll(count).toBe(1);
    expect(await names()).toEqual(['finance-slide-in-right', 'finance-slide-out-left']);
    expect(await header.boundingBox()).toEqual(headerBox);
    expect(await page.locator('fd-finance-subpage').count()).toBe(1);
    const transforms = await page.evaluate(() => ({
      old: new DOMMatrix(
        getComputedStyle(document.documentElement, '::view-transition-old(finance-submenu)')
          .transform,
      ).m41,
      next: new DOMMatrix(
        getComputedStyle(document.documentElement, '::view-transition-new(finance-submenu)')
          .transform,
      ).m41,
    }));
    expect(transforms.old).toBeLessThan(0);
    expect(transforms.next).toBeGreaterThan(0);
    await page.screenshot({ path: 'test-results/f02c-slide-forward.png' });
    await finish(page);
    await page.getByRole('button', { name: 'Próxima fatura', exact: true }).click();
    await expect(page.locator('.invoice-summary')).toHaveAttribute('data-invoice-id', 'fat-dez');
    await page.goBack();
    await expect.poll(count).toBe(2);
    expect(await names()).toEqual(['finance-slide-in-left', 'finance-slide-out-right']);
    await page.screenshot({ path: 'test-results/f02c-slide-back.png' });
    await finish(page);
    await page.goForward();
    await expect.poll(count).toBe(3);
    await finish(page);
    await expect(page.locator('.invoice-summary')).toHaveAttribute('data-invoice-id', 'fat-dez');
    // Trocar novamente durante a captura pausada deve substituir o gesto, sem camada bloqueando links.
    await nav.getByRole('link', { name: 'Assinaturas', exact: true }).click();
    await expect.poll(count).toBe(4);
    await nav.getByRole('link', { name: 'Geral', exact: true }).click();
    await expect.poll(count).toBe(5);
    expect(await names()).toEqual(['finance-slide-in-left', 'finance-slide-out-right']);
    await finish(page);
    await nav.getByRole('link', { name: 'Movimentações', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(count).toBe(6);
    await finish(page);
    await expect(nav.getByRole('link', { name: 'Movimentações', exact: true })).toBeFocused();
    await page.getByRole('searchbox', { name: 'Buscar movimentações' }).fill('Netflix');
    await nav.getByRole('link', { name: 'Cartão', exact: true }).click();
    await expect.poll(count).toBe(7);
    await finish(page);
    await nav.getByRole('link', { name: 'Movimentações', exact: true }).click();
    await expect.poll(count).toBe(8);
    await finish(page);
    await expect(page.getByRole('searchbox', { name: 'Buscar movimentações' })).toHaveValue(
      'Netflix',
    );
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setSize(820, 920));
    await nav.getByRole('link', { name: 'Compromissos', exact: true }).click();
    await expect.poll(count).toBe(9);
    await page.screenshot({ path: 'test-results/f02c-slide-narrow.png' });
    expect(
      await page.locator('.workspace').evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await finish(page);
    await nav.getByRole('link', { name: 'Movimentações', exact: true }).click();
    await expect.poll(count).toBe(10);
    await finish(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await nav.getByRole('link', { name: 'Cartão', exact: true }).click();
    await expect(page.locator('.invoice-summary')).toHaveAttribute('data-invoice-id', 'fat-dez');
    await finish(page);
    expect(await count()).toBe(10);
    await nav.getByRole('link', { name: 'Cartão', exact: true }).click();
    expect(await count()).toBe(10);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('link', { name: 'Investimentos', exact: true }).click();
    await expect(page).toHaveURL(/investimentos/);
    await finish(page);
    expect(await count()).toBe(10);
    await page.evaluate(() =>
      Object.defineProperty(document, 'startViewTransition', {
        value: undefined,
        configurable: true,
      }),
    );
    await page.getByRole('link', { name: 'Finanças', exact: true }).click();
    await nav.getByRole('link', { name: 'Cartão', exact: true }).click();
    await expect(page.locator('.invoice-summary')).toHaveAttribute('data-invoice-id', 'fat-dez');
    expect(await count()).toBe(10);
    const after = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      layout: await window.finDesk!.storage.getCardLayout(),
      charts: await window.finDesk!.storage.getExpenseChartsLayout(),
      period: document.querySelector('fd-period-control')?.textContent,
    }));
    expect(after).toEqual(before);
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await clean(profile);
  }
});
