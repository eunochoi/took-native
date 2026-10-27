// Keep installed widgets' existing URLs working for both cold and warm launches.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path, 'took-local://');
    if (url.protocol !== 'took-local:') return path;
    const pathname = `${url.host ? `/${url.host}` : ''}${url.pathname}`.replace(/\/$/, '');
    const match = /^\/sober(?:\/(\d+))?$/.exec(pathname);
    if (!match) return path;
    const id = Number(match[1]);
    return Number.isSafeInteger(id) && id > 0 ? `/widget?soberId=${id}` : '/widget';
  } catch {
    return path;
  }
}
