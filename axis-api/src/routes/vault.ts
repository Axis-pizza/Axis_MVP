import { Hono } from 'hono';
import { Bindings } from '../config/env';
import * as VaultModel from '../models/vault';
import { STRICT_LIST } from '../config/constants';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/vaults', async (c) => {
  try {
    const vaults = await VaultModel.getAllVaults(c.env.axis_db);
    return c.json(vaults);
  } catch (e: any) {
    console.error("Fetch Vaults Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

app.post('/vaults', async (c) => {
  try {
    const body = await c.req.json();
    const { name, symbol, description, creator, strategy, fee, minLiquidity, composition, imageUrl } = body;

    if (!name || !creator || !composition) {
      return c.json({ success: false, error: "Missing required fields" }, 400);
    }

    const id = crypto.randomUUID();
    const vaultData = {
        id,
        name,
        symbol,
        description: description || "",
        creator,
        strategy_type: strategy || 'Weekly',
        management_fee: fee || 0.95,
        min_liquidity: minLiquidity || 1000,
        composition: composition,
        image_url: imageUrl || null
    };

    await VaultModel.createVault(c.env.axis_db, vaultData);
    return c.json({ success: true, id });

  } catch (e: any) {
    console.error("Create Vault Error:", e);
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.get('/tokens', (c) => {
    console.log(`[Axis Internal] Returning ${STRICT_LIST.length} curated tokens.`);
    return c.json(STRICT_LIST);
});

export default app;
