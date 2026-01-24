import { Hono } from 'hono';
import { Bindings } from '../config/env';
import * as VaultModel from '../models/vault';
import { STRICT_LIST } from '../config/constants';
// もし ../services/blockchain からのインポートでエラーが出る場合は、この行を一時的にコメントアウトしてください
import { JitoBundleService } from '../services/blockchain';

const app = new Hono<{ Bindings: Bindings }>();
const jitoService = new JitoBundleService();

app.get('/vaults', async (c) => {
  try {
    const vaults = await VaultModel.getAllVaults(c.env.axis_db);
    return c.json(vaults);
  } catch (e: any) {
    console.error("Fetch Vaults Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

app.get('/vaults/prepare-deployment', async (c) => {
    try {
        const tipAccount = await jitoService.getRandomTipAccount();
        return c.json({ success: true, tipAccount, minTip: 1000 });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

app.post('/vaults/deploy', async (c) => {
  try {
    const body = await c.req.json();
    const { signedTransaction, metadata, vaultId } = body;
    
    let bundleId;
    if (signedTransaction) {
        bundleId = await jitoService.sendBundle([signedTransaction]);
    } else {
        throw new Error("Missing signed transaction");
    }

    if (metadata) {
        const { name, symbol, description, creator, strategy, fee, minLiquidity, composition, imageUrl } = metadata;
        await VaultModel.createVault(c.env.axis_db, {
            id: vaultId || crypto.randomUUID(),
            name,
            symbol,
            description: description || "",
            creator,
            strategy_type: strategy || 'Weekly',
            management_fee: fee || 0.95,
            min_liquidity: minLiquidity || 1000,
            composition: composition,
            image_url: imageUrl || null,
        });
    }
    return c.json({ success: true, bundleId, vaultId });
  } catch (e: any) {
    console.error("Create Vault Error:", e);
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.post('/vaults', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await VaultModel.createVault(c.env.axis_db, { ...body, id });
    return c.json({ success: true, id });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.get('/tokens', (c) => {
    return c.json(STRICT_LIST);
});

// ★この行が確実に存在することを確認してください
export default app;