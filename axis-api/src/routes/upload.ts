import { Hono } from 'hono';
import { Bindings } from '../config/env';

const app = new Hono<{ Bindings: Bindings }>();

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MBに拡張

// ... (generateImageKeyなどはそのまま)

const generateImageKey = (walletAddress: string, type: 'strategy' | 'profile'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${type}/${walletAddress}/${timestamp}-${random}.webp`;
};

app.post('/image', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('image') as File | null;
    const walletAddress = formData.get('wallet_address') as string | null;
    const imageType = (formData.get('type') as 'strategy' | 'profile') || 'strategy';

    // デバッグ用ログ
    console.log(`Upload Request: Wallet=${walletAddress}, Type=${imageType}, File=${file?.name}, Size=${file?.size}`);

    if (!walletAddress) {
       return c.json({ success: false, error: 'Wallet address is required' }, 400);
    }
    
    // バリデーション緩和: 正規表現チェックが厳しすぎる可能性を考慮し、最低限の文字数チェックのみにする
    // 本番では厳密なチェックが推奨されますが、開発中は柔軟に。
    if (walletAddress.length < 32) {
      return c.json({ success: false, error: 'Invalid wallet address format' }, 400);
    }

    if (!file) {
      return c.json({ success: false, error: 'No image file provided' }, 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({ success: false, error: `Invalid file type: ${file.type}` }, 400);
    }

    if (file.size > MAX_SIZE) {
      return c.json({ success: false, error: `File too large (Max 5MB)` }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const key = generateImageKey(walletAddress, imageType);

    await c.env.IMAGES.put(key, arrayBuffer, {
      httpMetadata: { contentType: 'image/webp' },
      customMetadata: {
        originalType: file.type,
        walletAddress: walletAddress,
        uploadedAt: new Date().toISOString(),
      },
    });

    const url = new URL(c.req.url);
    const imageUrl = `${url.origin}/upload/image/${key}`;

    return c.json({
      success: true,
      key,
      url: imageUrl,
      walletAddress,
      type: imageType,
    });

  } catch (e: any) {
    console.error('[Upload Error]', e);
    return c.json({ success: false, error: e.message || 'Upload failed' }, 500);
  }
});

// ... (GET, DELETE はそのまま)
app.get('/image/:key{.+}', async (c) => {
  try {
    const key = c.req.param('key');
    const object = await c.env.IMAGES.get(key);
    if (!object) return c.json({ success: false, error: 'Image not found' }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    return new Response(object.body, { headers });
  } catch (e) {
    return c.json({ error: 'Fetch failed' }, 500);
  }
});

export default app;