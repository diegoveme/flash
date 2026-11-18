import { routes } from './routes.js';

const compiledRoutes = routes.map((route) => {
  const names = [];
  const pattern = route.path.replace(/\{(\w+)\}/g, (_, name) => {
    names.push(name);
    return '([^/]+)';
  });
  return { ...route, regex: new RegExp(`^${pattern}$`), names };
});

/**
 * Finds the route for a request and extracts its path parameters.
 * @param {string} method
 * @param {string} pathname
 * @returns {{ route: { method: string, path: string, handler: string }, params: Record<string, string> } | null}
 */
export function matchRoute(method, pathname) {
  for (const route of compiledRoutes) {
    if (route.method !== method) continue;
    const match = route.regex.exec(pathname);
    if (match) {
      const params = Object.fromEntries(
        route.names.map((name, index) => [name, decodeURIComponent(match[index + 1])]),
      );
      return { route, params };
    }
  }
  return null;
}
