import { Hono } from 'hono';
import { Bindings } from '../config/env';
import * as VaultModel from '../models/vault';
import { STRICT_LIST } from '../config/constants';
import { JitoService } from '../services/jito';

const app = new Hono<{ Bindings: Bindings }>();
const jitoService = new JitoService();

app.get('/vaults', async (c) => {
  try {
    const vaults = await VaultModel.getAllVaults(c.env.axis_db);
    return c.json(vaults);
  } catch (e: any) {
    console.error("Fetch Vaults Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

// New Endpoint: Prepare for Deployment (Get Jito Tip Account)
app.get('/vaults/prepare-deployment', async (c) => {
    try {
        const tipAccount = await jitoService.getTipAccount();
        // Return tip account for frontend to include in the transaction
        return c.json({ 
            success: true, 
            tipAccount, 
            minTip: 1000 // 1000 lamports minimum
        });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

app.post('/vaults/deploy', async (c) => {
  try {
    const body = await c.req.json();
    const { signedTransaction, metadata, vaultId } = body;
    
    console.log(`[Jito] Received deployment request for ${metadata?.name}`);

    // 1. Submit to Jito as a Bundle (Atomicity)
    // Jito guarantees that this transaction + any others in the bundle are processed atomically.
    let bundleId;
    if (signedTransaction) {
        // Send as a single-transaction bundle (or user could have bundled multiple ops)
        bundleId = await jitoService.sendBundle([signedTransaction]);
    } else {
        throw new Error("Missing signed transaction");
    }

    // 2. Persist Metadata to DB
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
            // Track Jito Bundle ID for verification
        });
    }

    return c.json({ success: true, bundleId, vaultId });

  } catch (e: any) {
    console.error("Create Vault (Jito) Error:", e);
    return c.json({ success: false, error: e.message }, 500);
  }
});

// Legacy/Fallback endpoint
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
    console.log(`[Axis Internal] Returning ${STRICT_LIST.length} curated tokens.`);
    return c.json(STRICT_LIST);
});

export default app;
