import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

// Preserva o PNG original. Os SVGs apenas enquadram as duas versões presentes nele;
// não são vetorização, redesenho ou limpeza da imagem.
// Conversão para os formatos do aplicativo; não faz parte do build comum.
const brandDirectory = new URL('../public/brand/', import.meta.url);
const source = await readFile(new URL('logo-original.png', brandDirectory));
const image = `<image width="1774" height="887" href="data:image/png;base64,${source.toString('base64')}"/>`;
const whiteViewport = '97 145 705 633';
const blackViewport = '978 145 710 633';
const symbol = (viewport) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewport}" role="img" aria-label="Símbolo FinDesk">${image}</svg>`;
const lockup = (viewport, color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 40" role="img" aria-label="FinDesk"><svg width="40" height="40" viewBox="${viewport}">${image}</svg><text x="48" y="29" fill="${color}" font-family="Segoe UI, sans-serif" font-size="28" font-weight="600" letter-spacing="-.8">FinDesk</text></svg>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Ícone FinDesk"><rect width="64" height="64" rx="14" fill="#19211d"/><svg x="6" y="6" width="52" height="52" viewBox="${whiteViewport}">${image}</svg></svg>`;
for (const [fileName, contents] of [
  ['symbol.svg', symbol(whiteViewport)],
  ['symbol-on-light.svg', symbol(blackViewport)],
  ['lockup-dark.svg', lockup(whiteViewport, '#f2f5f1')],
  ['lockup-light.svg', lockup(blackViewport, '#17201b')],
  ['app-icon.svg', svg],
]) {
  await writeFile(new URL(fileName, brandDirectory), contents + '\n');
}

// O Edge apenas renderiza os assets para os formatos PNG/ICO exigidos pelo app.
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 256, height: 256 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>html,body{margin:0;width:256px;height:256px}body>svg{width:256px;height:256px;display:block}</style>${svg}`,
  );
  const png = await page.locator('body > svg').screenshot({ omitBackground: true });
  await writeFile(new URL('../public/brand/app-icon.png', import.meta.url), png);

  // ICO com uma imagem PNG de 256 × 256, suportada pelo Windows 10/11.
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  await writeFile(
    new URL('../public/brand/app-icon.ico', import.meta.url),
    Buffer.concat([header, png]),
  );
  console.log('Logo original aplicada aos SVGs de apresentação e aos ícones PNG/ICO.');
} finally {
  await browser.close();
}
