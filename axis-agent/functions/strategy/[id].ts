const API_BASE = 'https://axis-api.yusukekikuta-05.workers.dev';

const CRAWLERS =
  /twitterbot|facebookexternalhit|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|applebot|googlebot|bingbot|yandex|pinterest|ogp/i;

export async function onRequest(
  context: EventContext<Record<string, unknown>, 'id', Record<string, unknown>>
) {
  const { request, params } = context;
  const ua = request.headers.get('user-agent') || '';

  // Regular users → serve SPA (index.html via _redirects)
  if (!CRAWLERS.test(ua)) {
    return context.next();
  }

  // Crawler → return dynamic OGP page
  const id = params.id as string;
  let name = 'Axis Strategy';
  let ticker = 'ETF';

  try {
    const res = await fetch(`${API_BASE}/strategies/id/${id}`);
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.success && data.strategy) {
        name = data.strategy.name || name;
        ticker = data.strategy.ticker || ticker;
      }
    }
  } catch {
    // use fallback values
  }

  const pageUrl = `https://axs.pizza/strategy/${id}`;
  const imageUrl = `${API_BASE}/share/strategy-image/${id}`;
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

  <meta http-equiv="refresh" content="0;url=${pageUrl}">
</head>
<body style="background:#0a0a09;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
  <p>Redirecting to Axis...</p>
  <script>window.location.href="${pageUrl}";</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
