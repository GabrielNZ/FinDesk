import { isAbsolute, relative, resolve } from 'node:path';

export const APP_ORIGIN = 'findesk://app';
export const APP_PAGE = `${APP_ORIGIN}/`;
export const DEVELOPMENT_ORIGIN = 'http://127.0.0.1:4200';

export function isTrustedPageUrl(rawUrl: string, development: boolean): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.username || url.password || url.search) return false;

    if (development) {
      return url.origin === DEVELOPMENT_ORIGIN && ['/', '/index.html'].includes(url.pathname);
    }

    return (
      url.protocol === 'findesk:' &&
      url.hostname === 'app' &&
      url.port === '' &&
      ['/', '/index.html'].includes(url.pathname)
    );
  } catch {
    return false;
  }
}

/** Restringe o protocolo do app aos arquivos do build, inclusive no Windows. */
export function resolveAssetPath(rawUrl: string, rendererRoot: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (
      url.protocol !== 'findesk:' ||
      url.hostname !== 'app' ||
      url.port ||
      url.username ||
      url.password
    ) {
      return null;
    }

    const pathname = decodeURIComponent(url.pathname).replaceAll('\\', '/');
    if (pathname.includes('\0') || pathname.split('/').includes('..')) return null;

    const target = resolve(rendererRoot, pathname === '/' ? 'index.html' : `.${pathname}`);
    const pathWithinRoot = relative(rendererRoot, target);
    if (pathWithinRoot.startsWith('..') || isAbsolute(pathWithinRoot)) return null;
    return target;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy(development: boolean): string {
  return [
    "default-src 'none'",
    "script-src 'self'",
    // Angular e PrimeNG inserem estilos em tempo de execução. Scripts inline continuam bloqueados.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    development ? `connect-src ${DEVELOPMENT_ORIGIN} ws://127.0.0.1:4200` : "connect-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-src 'none'",
    "object-src 'none'",
  ].join('; ');
}
