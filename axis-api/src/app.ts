import { Buffer } from 'node:buffer';
globalThis.Buffer = Buffer;
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from './config/env';

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import vaultRoutes from './routes/vault';
import miscRoutes from './routes/misc';
import kagemushaRoutes from './routes/kagemusha';

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}))

app.onError((err, c) => {
  console.error(`[Global Error] ${err.message}`, err);
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message }, err.status);
  }
  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

// Mount Routes
app.route('/auth', authRoutes);
app.route('/', userRoutes);
app.route('/', vaultRoutes);
app.route('/', miscRoutes);
app.route('/kagemusha', kagemushaRoutes);

export default app
