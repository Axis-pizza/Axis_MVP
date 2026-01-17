/**
 * Upload Routes - Image upload to Cloudflare R2
 * Security: Image ID is tied to Solana address
 */

import { Hono } from 'hono';
import { Bindings } from '../config/env';

const app = new Hono<{ Bindings: Bindings }>();

// Allowed mime types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

// Generate image key tied to solana address
const generateImageKey = (walletAddress: string, type: 'strategy' | 'profile'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${type}/${walletAddress}/${timestamp}-${random}.webp`;
};

// Validate Solana address format (basic check)
const isValidSolanaAddress = (address: string): boolean => {
  // Solana addresses are base58 encoded, 32-44 characters
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

/**
 * POST /upload/image
 * Upload an image to R2 storage
 * Requires: wallet_address in form data to bind image to user
 */
app.post('/image', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('image') as File | null;
    const walletAddress = formData.get('wallet_address') as string | null;
    const imageType = (formData.get('type') as 'strategy' | 'profile') || 'strategy';

    // Validate wallet address
    if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
      return c.json({ 
        success: false, 
        error: 'Valid Solana wallet address is required' 
      }, 400);
    }

    // Validate file
    if (!file) {
      return c.json({ success: false, error: 'No image file provided' }, 400);
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({ 
        success: false, 
        error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` 
      }, 400);
    }

    // Check file size
    if (file.size > MAX_SIZE) {
      return c.json({ 
        success: false, 
        error: `File too large. Maximum size: 2MB` 
      }, 400);
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Generate unique key tied to wallet address
    const key = generateImageKey(walletAddress, imageType);

    // Upload to R2
    await c.env.IMAGES.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: 'image/webp', // Store as WebP for consistency
      },
      customMetadata: {
        originalType: file.type,
        walletAddress: walletAddress,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate public URL
    // Use the API worker as a proxy since the R2 bucket might not be public
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

/**
 * GET /upload/image/:key
 * Serve image from R2
 */
app.get('/image/:key{.+}', async (c) => {
  try {
    const key = c.req.param('key');
    
    const object = await c.env.IMAGES.get(key);

    if (!object) {
      return c.json({ success: false, error: 'Image not found' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, {
      headers,
    });

  } catch (e: any) {
    console.error('[Serve Image Error]', e);
    return c.json({ success: false, error: 'Failed to fetch image' }, 500);
  }
});

/**
 * DELETE /upload/image/:key
 * Delete an image - only owner can delete
 */
app.delete('/image/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const walletAddress = c.req.query('wallet_address');

    if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
      return c.json({ success: false, error: 'Valid wallet address required' }, 400);
    }

    // Check if key belongs to this wallet
    if (!key.includes(`/${walletAddress}/`)) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }

    await c.env.IMAGES.delete(key);
    
    return c.json({ success: true, message: 'Image deleted' });

  } catch (e: any) {
    console.error('[Delete Error]', e);
    return c.json({ success: false, error: e.message || 'Delete failed' }, 500);
  }
});

export default app;
