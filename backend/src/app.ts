import { randomUUID } from 'crypto';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { ApiError } from './utils/ApiError';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

export const createApp = (): Express => {
  const app = express();

  // Required for correct client IPs / rate limiting behind a proxy.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // TRD-16: secure headers.
  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // TRD-16: restricted CORS - never a wildcard.
  //
  // Browsers send an `Origin` header on every non-GET request, including
  // same-origin ones behind a reverse proxy (e.g. nginx forwarding /api to this
  // service). Requests are therefore also allowed when the origin matches the
  // host the request was made to, in addition to the explicit allow-list.
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header: curl, server-to-server, native clients.
        if (!origin) return callback(null, true);
        if (env.security.corsOrigins.includes(origin)) return callback(null, true);
        // Not allowed: omit the CORS headers. The check below then produces a
        // clean 403 instead of an opaque 500 from inside the CORS library.
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['Content-Disposition'],
      maxAge: 600,
    }),
  );

  // Same-origin requests carry the public host, which may differ from the internal
  // one when this API sits behind a reverse proxy.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || req.method === 'GET' || req.method === 'HEAD') {
      next();
      return;
    }

    const requestHost = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host;
    let isSameOrigin = false;
    try {
      isSameOrigin = Boolean(requestHost) && new URL(origin).host === requestHost;
    } catch {
      isSameOrigin = false;
    }

    if (isSameOrigin || env.security.corsOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      next();
      return;
    }

    next(ApiError.forbidden(`Origin ${origin} is not allowed by this API.`, { code: 'CORS_ORIGIN_DENIED' }));
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  app.use((req, res, next) => {
    req.requestId = req.get('X-Request-Id') ?? randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  });

  app.use(env.apiPrefix, apiLimiter, routes);

  // Convenience alias for load balancers.
  app.get('/health', (_req, res) => res.redirect(`${env.apiPrefix}/health`));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
