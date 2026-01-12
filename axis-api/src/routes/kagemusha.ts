import { Hono } from 'hono';
import { Bindings } from '../config/env';
import { KagemushaService } from '../services/kagemusha';

const kagemusha = new Hono<{ Bindings: Bindings }>();

kagemusha.post('/analyze', async (c) => {
  const { directive, tags } = await c.req.json();
  const service = new KagemushaService(c.env);
  const tactics = await service.generateTactics(directive, tags);
  return c.json({ success: true, tactics });
});

kagemusha.post('/deploy', async (c) => {
  const { tactic, owner } = await c.req.json();
  const service = new KagemushaService(c.env);
  const result = await service.deployToChain(owner, tactic);
  return c.json(result);
});

kagemusha.get('/strategies/:pubkey', async (c) => {
  const pubkey = c.req.param('pubkey');
  const results = await c.env.axis_db.prepare(
    'SELECT * FROM strategies WHERE owner_pubkey = ? ORDER BY created_at DESC'
  ).bind(pubkey).all();
  return c.json({ success: true, data: results.results });
});

export default kagemusha;
