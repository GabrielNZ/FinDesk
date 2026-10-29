import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  isTrustedPageUrl,
  resolveAssetPath,
  contentSecurityPolicy,
} = require('../out/desktop/security.js');
const root = resolve('dist/renderer/browser');

test('IPC aceita apenas a página local esperada, inclusive com navegação por hash', () => {
  assert.equal(isTrustedPageUrl('findesk://app/#/visao-geral', false), true);
  assert.equal(isTrustedPageUrl('findesk://app/index.html#/investimentos', false), true);
  for (const url of [
    'https://example.com',
    'file:///index.html',
    'findesk://outro/index.html',
    'findesk://app/other.html',
    'findesk://user@app/index.html',
    'findesk://app/index.html?external=1',
    'not a URL',
  ]) {
    assert.equal(isTrustedPageUrl(url, false), false, url);
  }
});

test('origem de desenvolvimento exige modo de desenvolvimento e endereço exato', () => {
  assert.equal(isTrustedPageUrl('http://127.0.0.1:4200/#/financas', true), true);
  for (const url of [
    'http://127.0.0.1:4200.evil.test/',
    'http://localhost:4200/',
    'http://127.0.0.1:4201/',
    'http://127.0.0.1:4200/evil',
    'https://127.0.0.1:4200/',
  ]) {
    assert.equal(isTrustedPageUrl(url, true), false, url);
  }
  assert.equal(isTrustedPageUrl('http://127.0.0.1:4200/', false), false);
});

test('protocolo serve somente arquivos contidos no build', () => {
  assert.equal(resolveAssetPath('findesk://app/index.html', root), resolve(root, 'index.html'));
  assert.equal(
    resolveAssetPath('findesk://app/media/font.woff2', root),
    resolve(root, 'media/font.woff2'),
  );
  for (const url of [
    'findesk://other/index.html',
    'file:///etc/passwd',
    'findesk://app/%2e%2e%2fprivate.db',
    'findesk://app/%2e%2e%5cprivate.db',
    'findesk://app/%00secret',
    'findesk://app/%E0%A4%A',
    'findesk://user@app/index.html',
  ]) {
    assert.equal(resolveAssetPath(url, root), null, url);
  }
});

test('CSP de produção bloqueia conexões e scripts inline; dev libera apenas a origem local', () => {
  const production = contentSecurityPolicy(false);
  assert.ok(production.includes("connect-src 'none'"));
  assert.ok(production.includes("script-src 'self';"));
  assert.ok(!production.includes('unsafe-eval'));
  assert.ok(!production.includes('http://'));
  assert.ok(contentSecurityPolicy(true).includes('ws://127.0.0.1:4200'));
});
