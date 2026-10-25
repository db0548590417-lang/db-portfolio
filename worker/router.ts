// Fetch adapter for this application's existing JSON-only Express routes.
type Handler = (req: any, res: any, next: () => Promise<void>) => any;
function express() {
  const routes: { method: string; path: string; handler: Handler }[] = [];
  const middleware: { prefix: string; handler: Handler }[] = [];
  const app = {
    use(prefix: string | Handler, handler?: Handler) {
      middleware.push(typeof prefix === 'string' ? { prefix, handler: handler! } : { prefix: '/', handler: prefix });
    },
    get(path: string, handler: Handler) { routes.push({ method: 'GET', path, handler }); },
    post(path: string, handler: Handler) { routes.push({ method: 'POST', path, handler }); },
    async handle(request: Request) {
      const url = new URL(request.url);
      const route = routes.find(route => route.method === request.method && route.path === url.pathname);
      if (!route) return Response.json({ error: 'הכתובת לא נמצאה' }, { status: 404 });
      let body = {};
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        if (Number(request.headers.get('content-length') || 0) > 50 * 1024 * 1024)
          return Response.json({ error: 'הקובץ גדול מדי' }, { status: 413 });
        const text = await request.text();
        if (text.length > 50 * 1024 * 1024) return Response.json({ error: 'הקובץ גדול מדי' }, { status: 413 });
        try { body = text ? JSON.parse(text) : {}; } catch { return Response.json({ error: 'בקשה לא תקינה' }, { status: 400 }); }
      }
      const req = { body, query: Object.fromEntries(url.searchParams), headers: Object.fromEntries(request.headers) };
      let status = 200;
      let response: Response | undefined;
      const res = {
        status(value: number) { status = value; return res; },
        json(value: any) { response = Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } }); return res; },
        send(value: Response) { response = value; return res; },
      };
      const handlers = [...middleware.filter(item => url.pathname.startsWith(item.prefix)).map(item => item.handler), route.handler];
      async function dispatch(index: number): Promise<void> {
        if (index >= handlers.length || response) return;
        let downstream: Promise<void> | undefined;
        await handlers[index](req, res, () => (downstream = dispatch(index + 1)));
        if (downstream) await downstream;
      }
      try { await dispatch(0); }
      catch { return Response.json({ error: 'הפעולה נכשלה. בדוק את המפתח ואת החיבור בהגדרות.' }, { status: 500 }); }
      return response || Response.json({ error: 'לא התקבלה תשובה מהשרת' }, { status: 500 });
    },
  };
  return app;
}
express.json = (..._args: any[]) => (_req: any, _res: any, next: any) => next();
express.urlencoded = express.json;
export default express;
