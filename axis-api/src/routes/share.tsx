import { Hono } from 'hono';
import satori from 'satori';
import { Bindings } from '../config/env';
import React from 'react';

const app = new Hono<{ Bindings: Bindings }>();

// フォントデータを読み込む（Google Fonts等から取得するのが一般的だが、ここでは簡易的にシステムフォント等を指定するか、ArrayBufferで読み込む必要がある）
// Cloudflare Workersではfetchでフォントを取ってくるのが定石
const loadFont = async () => {
  const response = await fetch('https://github.com/google/fonts/raw/main/apache/robotoslab/RobotoSlab[wght].ttf');
  return await response.arrayBuffer();
};

// 1. OGP画像生成エンドポイント
app.get('/image', async (c) => {
  const address = c.req.query('address') || 'Unknown';
  const pnl = c.req.query('pnl') || '0';
  const netWorth = c.req.query('worth') || '0';
  const isPositive = parseFloat(pnl) >= 0;

  const fontData = await loadFont();

  const svg = await satori(
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        backgroundColor: '#000',
        backgroundImage: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
        color: 'white',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px',
        fontFamily: 'Roboto Slab',
      }}
    >
      {/* Background Decor */}
      <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: 'rgba(217,119,6,0.2)', borderRadius: '50%', filter: 'blur(80px)' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, background: isPositive ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)', borderRadius: '50%', filter: 'blur(80px)' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)' }}>
           <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#D97706', marginRight: 15 }} />
           <span style={{ fontSize: 24, fontWeight: 'bold' }}>{address.slice(0,4)}...{address.slice(-4)}</span>
        </div>
        <div style={{ fontSize: 30, fontWeight: 'bold', color: 'rgba(255,255,255,0.5)' }}>Axis Protocol</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.5)', marginBottom: 10, letterSpacing: '0.1em' }}>TOTAL NET WORTH</div>
        <div style={{ fontSize: 96, fontWeight: 'bold', lineHeight: 1 }}>${netWorth}</div>
        <div style={{ 
            display: 'flex', 
            marginTop: 20, 
            background: isPositive ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)', 
            color: isPositive ? '#4ADE80' : '#F87171',
            padding: '10px 30px', 
            borderRadius: '50px',
            fontSize: 32,
            fontWeight: 'bold',
            width: 'fit-content'
        }}>
            {isPositive ? '+' : ''}{pnl}%
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40 }}>
         <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)' }}>RANK</div>
            <div style={{ fontSize: 32, fontWeight: 'bold' }}>Novice</div>
         </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Roboto Slab',
          data: fontData,
          weight: 400,
          style: 'normal',
        },
      ],
    }
  );

  // SVGを返す (TwitterはSVG OGPを一部サポートしているが、完璧を期すならResvgでPNG化推奨。今回はMVPとしてSVGで返す)
  return c.body(svg, 200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=3600',
  });
});

// 2. シェア用クッションページ
app.get('/', async (c) => {
    const address = c.req.query('address') || '';
    const pnl = c.req.query('pnl') || '0';
    const worth = c.req.query('worth') || '0';
    
    const imageUrl = `${new URL(c.req.url).origin}/share/image?address=${address}&pnl=${pnl}&worth=${worth}`;
    const redirectUrl = `https://axis-agent.pages.dev/?ref=${address}`; // フロントエンドのURLに変更してください

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Axis Portfolio - ${address}</title>
        <meta name="description" content="Check out my portfolio on Axis Protocol.">
        
        <meta property="og:type" content="website">
        <meta property="og:url" content="${c.req.url}">
        <meta property="og:title" content="My Axis Portfolio">
        <meta property="og:description" content="Net Worth: $${worth} | PnL: ${pnl}%">
        <meta property="og:image" content="${imageUrl}">

        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="${c.req.url}">
        <meta property="twitter:title" content="My Axis Portfolio">
        <meta property="twitter:description" content="Net Worth: $${worth} | PnL: ${pnl}%">
        <meta property="twitter:image" content="${imageUrl}">
        
        <meta http-equiv="refresh" content="0;url=${redirectUrl}">
      </head>
      <body style="background: #000; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
        <p>Redirecting to Axis...</p>
        <script>window.location.href = "${redirectUrl}";</script>
      </body>
      </html>
    `;

    return c.html(html);
});

export default app;