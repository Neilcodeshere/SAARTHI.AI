// Connect-style middleware for the AI endpoints, mounted on the Vite dev/preview server.
//   GET  /api/ai/status                       → { configured, model, message }  (never the key)
//   POST /api/conflicts/:conflictId/predictions  body { central, force? }
//   GET  /api/ai/log                          → recent request log (no secrets, no payloads)

import { createPredictionService, PredictionError } from './predictionService.js';

const MAX_BODY = 2 * 1024 * 1024;
const PREDICT_ROUTE = /^\/api\/conflicts\/([^/]+)\/predictions$/;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new PredictionError('INVALID_REQUEST', 'Request body too large.', 413));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new PredictionError('INVALID_REQUEST', 'Body must be JSON.', 400)); }
    });
    req.on('error', reject);
  });
}

export function createAiMiddleware(options) {
  const service = createPredictionService(options);

  return async function aiMiddleware(req, res, next) {
    const url = (req.url || '').split('?')[0];
    if (!url.startsWith('/api/')) return next();
    try {
      if (url === '/api/ai/status' && req.method === 'GET') return send(res, 200, service.status());
      if (url === '/api/ai/log' && req.method === 'GET') return send(res, 200, { entries: service.log() });
      const m = PREDICT_ROUTE.exec(url);
      if (m && req.method === 'POST') {
        const body = await readJson(req);
        const result = await service.predict(body.central, decodeURIComponent(m[1]), { force: body.force === true });
        return send(res, 200, result);
      }
      return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Unknown API route.' } });
    } catch (e) {
      if (e instanceof PredictionError) return send(res, e.httpStatus, { error: { code: e.code, message: e.message } });
      console.error('[ai] unexpected error', e?.name || 'Error');
      return send(res, 500, { error: { code: 'INTERNAL', message: 'Unexpected server error.' } });
    }
  };
}

/** Vite plugin: serves the AI API from the existing `npm run dev` / `npm run preview` server. */
export function saarthiAiApi(env) {
  const mount = server => { server.middlewares.use(createAiMiddleware({ env })); };
  return { name: 'saarthi-ai-api', configureServer: mount, configurePreviewServer: mount };
}
