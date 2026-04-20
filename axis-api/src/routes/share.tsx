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

// Mock chart data generator — returns normalized SVG path points
function generateChartPath(width: number, height: number, seed: string): string {
  // Deterministic pseudo-random from seed (strategy id)
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }

  const points = 20;
  const values: number[] = [];
  let val = 100;
  for (let i = 0; i < points; i++) {
    hash = ((hash << 5) - hash) + i * 7;
    hash |= 0;
    const rand = ((hash & 0xffff) / 0xffff) * 0.14 - 0.05;
    val = val * (1 + rand);
    values.push(val);
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pad = 8;
  const pts = values.map((v, i) => {
    const x = pad + (i / (points - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M ${pts.join(' L ')}`;
}

// Gradient avatar color from pubkey
function pubkeyToColor(pubkey: string): string {
  const colors = ['#c9a84c', '#30a46c', '#6e56cf', '#e54d2e', '#0090ff', '#e93d82'];
  let h = 0;
  for (let i = 0; i < pubkey.length; i++) {
    h = ((h << 5) - h) + pubkey.charCodeAt(i);
    h |= 0;
  }
  return colors[Math.abs(h) % colors.length];
}

// 1. Strategy OGP image endpoint
app.get('/strategy-image/:id', async (c) => {
  try {
  const id = c.req.param('id');

  const row = await c.env.axis_db.prepare(
    `SELECT name, ticker, type, owner_pubkey, tvl FROM strategies WHERE id = ? LIMIT 1`
  ).bind(id).first();

  const name = (row?.name as string) || 'Unknown Strategy';
  const ticker = (row?.ticker as string) || 'ETF';
  const stratType = (row?.type as string) || 'BALANCED';
  const ownerPubkey = (row?.owner_pubkey as string) || '';
  const tvl = (row?.tvl as number) || 0;

  const isPositive = true; // mock: always positive for new strategies

  const typeColor: Record<string, string> = {
    AGGRESSIVE: '#e54d2e',
    BALANCED: '#0090ff',
    CONSERVATIVE: '#30a46c',
  };
  const accentColor = typeColor[stratType] || '#c9a84c';

  const avatarColor = ownerPubkey ? pubkeyToColor(ownerPubkey) : '#c9a84c';
  const shortAddr = ownerPubkey
    ? `${ownerPubkey.slice(0, 4)}...${ownerPubkey.slice(-4)}`
    : 'Anonymous';

  const chartW = 1060;
  const chartH = 140;
  const chartPath = generateChartPath(chartW, chartH, id);

  const fontData = await loadFont();

  const svg = await satori(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0a09',
        backgroundImage: 'linear-gradient(135deg, #0a0a09 0%, #111110 100%)',
        color: '#eeeeec',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 70px',
        fontFamily: 'Inter',
        position: 'relative',
      }}
    >
      {/* Background glow blobs */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 360, height: 360, background: 'rgba(201,168,76,0.12)', borderRadius: '50%', filter: 'blur(90px)' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 280, height: 280, background: `${accentColor}22`, borderRadius: '50%', filter: 'blur(80px)' }} />

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #c9a84c, #7a5c18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          <span style={{ fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.08em' }}>AXIS PROTOCOL</span>
        </div>
        <div style={{
          display: 'flex',
          background: `${accentColor}22`,
          border: `1px solid ${accentColor}55`,
          borderRadius: 20,
          padding: '6px 18px',
          fontSize: 16,
          fontWeight: 700,
          color: accentColor,
          letterSpacing: '0.12em',
        }}>
          {stratType}
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 22, color: '#b5b3ad', letterSpacing: '0.06em' }}>ETF STRATEGY</div>
        <div style={{ fontSize: 80, fontWeight: 700, color: '#c9a84c', lineHeight: 1, letterSpacing: '-0.01em' }}>
          ${ticker.toUpperCase()}
        </div>
        <div style={{ fontSize: 30, color: '#eeeeec', fontWeight: 400, marginTop: 4 }}>{name}</div>
      </div>

      {/* Chart */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative', width: chartW, height: chartH }}>
          <svg
            width={chartW}
            height={chartH}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="1" />
              </linearGradient>
            </defs>
            <path
              d={chartPath}
              fill="none"
              stroke={`url(#chartLine)`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Footer row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColor }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, color: '#b5b3ad', letterSpacing: '0.05em' }}>CREATED BY</span>
              <span style={{ fontSize: 18, fontWeight: 600 }}>{shortAddr}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {tvl > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: 13, color: '#b5b3ad', letterSpacing: '0.05em' }}>TVL</span>
                <span style={{ fontSize: 22, fontWeight: 700 }}>${tvl.toLocaleString()}</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              background: isPositive ? 'rgba(48,164,108,0.2)' : 'rgba(229,77,46,0.2)',
              color: isPositive ? '#4cc38a' : '#ff6369',
              borderRadius: 20,
              padding: '8px 20px',
              fontSize: 22,
              fontWeight: 700,
            }}>
              {isPositive ? '▲' : '▼'} Live
            </div>
          </div>
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
