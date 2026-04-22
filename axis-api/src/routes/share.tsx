/** @jsxImportSource react */
import { Hono } from 'hono';
import satori from 'satori';
import { Bindings } from '../config/env';
import React from 'react';
// @ts-ignore
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

let resvgInitialized = false;
async function svgToPng(svg: string): Promise<Uint8Array> {
  if (!resvgInitialized) {
    await initWasm(resvgWasm);
    resvgInitialized = true;
  }
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return resvg.render().asPng();
}

const app = new Hono<{ Bindings: Bindings }>();


const loadFont = async () => {
  // Use old Firefox UA to get WOFF (v1) instead of WOFF2 — satori uses opentype.js which doesn't support WOFF2
  const css = await fetch(
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 5.1; rv:23.0) Gecko/20100101 Firefox/23.0' } }
  ).then(r => r.text());

  const fontUrl = css.match(/src: url\(([^)]+)\) format\('woff'\)/)?.[1]
    ?? css.match(/url\(([^)]+\.woff)\)/)?.[1];
  if (!fontUrl) throw new Error(`No WOFF font URL in CSS: ${css.slice(0, 200)}`);

  return fetch(fontUrl).then(r => r.arrayBuffer());
};

// Generate mock chart values from strategy id as seed.
// Returns { path, isPositive } — path is an SVG path string, isPositive based on first→last trend.
function generateLineChart(
  w: number,
  h: number,
  seed: string
): { path: string; isPositive: boolean } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const points = 40;
  const values: number[] = [];
  let val = 50;
  for (let i = 0; i < points; i++) {
    hash = ((hash << 5) - hash) + i * 13;
    hash |= 0;
    val = Math.max(5, Math.min(95, val + (((hash & 0xffff) / 0xffff) * 16 - 6)));
    values.push(val);
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 4;
  const pts = values.map((v, i) => {
    const x = (i / (points - 1)) * (w - pad * 2) + pad;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return {
    path: `M ${pts.join(' L ')}`,
    isPositive: values[values.length - 1] >= values[0],
  };
}


// 1. Strategy OGP image endpoint
app.get('/strategy-image/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const row = await c.env.axis_db.prepare(
      `SELECT name, ticker FROM strategies WHERE id = ? LIMIT 1`
    ).bind(id).first();

    const name = (row?.name as string) || 'Unknown Strategy';
    const ticker = (row?.ticker as string) || 'ETF';

    const chartW = 1080;
    const chartH = 160;
    const { path: chartPath, isPositive } = generateLineChart(chartW, chartH, id);
    const lineColor = isPositive ? '#4cc38a' : '#ff6369';

    const fontData = await loadFont();

    const svg = await satori(
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        // Recreate AxisOGPchart.png look: near-black bg with radial glow top-left
        background: 'radial-gradient(ellipse 70% 60% at 20% 30%, rgba(40,40,35,0.9) 0%, #080807 70%)',
        padding: '60px',
        fontFamily: 'Inter',
        justifyContent: 'space-between',
        position: 'relative',
      }}>
        {/* Ticker + Name — top left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 84, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>
            {`$${ticker.toUpperCase()}`}
          </span>
          <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.65)', fontWeight: 400 }}>
            {name}
          </span>
        </div>

        {/* Bottom row: chart + Axis branding */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Line chart */}
          <div style={{ display: 'flex', width: `${chartW}px`, height: `${chartH}px` }}>
            <svg width={chartW} height={chartH}>
              <path d={chartPath} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* Axis logo — bottom right, matches AxisOGPchart.png position */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.35)', fontWeight: 400, letterSpacing: '0.08em' }}>Axis</span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>©</span>
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        fonts: [{ name: 'Inter', data: fontData, weight: 400, style: 'normal' }],
      }
    );

    const png = await svgToPng(svg);
    return c.body(png, 200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    });
  } catch (e: any) {
    return c.json({ error: e?.message || String(e), stack: e?.stack?.slice(0, 300) }, 500);
  }
});

// 2. Strategy share cushion page (OGP meta tags + redirect)
app.get('/strategy/:id', async (c) => {
  const id = c.req.param('id');

  const row = await c.env.axis_db.prepare(
    `SELECT name, ticker FROM strategies WHERE id = ? LIMIT 1`
  ).bind(id).first();

  const name = (row?.name as string) || 'Axis Strategy';
  const ticker = (row?.ticker as string) || 'ETF';

  const origin = new URL(c.req.url).origin;
  const imageUrl = `${origin}/share/strategy-image/${id}`;
  const redirectUrl = `${c.env.FRONTEND_URL || 'https://axis-agent.pages.dev'}/strategy/${id}`;
  const pageUrl = c.req.url;

  const title = `$${ticker.toUpperCase()} — ${name} | Axis Protocol`;
  const description = `Check out the ${name} ($${ticker.toUpperCase()}) ETF strategy on Axis Protocol.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">

  <meta property="og:type" content="website">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${pageUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">

  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
</head>
<body style="background:#0a0a09;color:#eeeeec;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
  <p>Redirecting to Axis...</p>
  <script>window.location.href = "${redirectUrl}";</script>
</body>
</html>`;

  return c.html(html);
});

// 3. Portfolio OGP image endpoint (existing)
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
        fontFamily: 'Inter',
      }}
    >
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
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 'bold', lineHeight: 1 }}>{`$${netWorth}`}</div>
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
          name: 'Inter',
          data: fontData,
          weight: 400,
          style: 'normal',
        },
      ],
    }
  );

  const png = await svgToPng(svg);
  return c.body(png, 200, {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=3600',
  });
});

// 4. Portfolio share cushion page (existing)
app.get('/', async (c) => {
    const address = c.req.query('address') || '';
    const pnl = c.req.query('pnl') || '0';
    const worth = c.req.query('worth') || '0';

    const imageUrl = `${new URL(c.req.url).origin}/share/image?address=${address}&pnl=${pnl}&worth=${worth}`;
    const redirectUrl = `https://axis-agent.pages.dev/?ref=${address}`;

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
