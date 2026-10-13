export const config = { runtime: 'edge' };

const APP_STORE_URL = 'https://apps.apple.com/us/app/sportin-rise-to-the-challenge/id6762152651';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sportInLogo(): string {
  return `<svg class="brand" viewBox="0 0 214 214" aria-label="SportIn" role="img"><defs><linearGradient id="sportinBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1378ff"/><stop offset="1" stop-color="#0055ed"/></linearGradient></defs><path fill="url(#sportinBlue)" d="M155.297 47.8312C155.938 49.2677 155.626 49.7109 150.183 55.0829C147.579 57.6532 142.511 62.6569 138.92 66.2021C135.329 69.7474 129.746 75.2193 126.514 78.3627C123.281 81.5057 118.823 85.8567 116.607 88.0315C106.819 97.6379 104.218 100.179 99.3649 104.877C96.5287 107.622 93.4131 110.631 92.441 111.563C91.469 112.495 89.1124 114.793 87.2037 116.67C85.2951 118.547 83.3868 120.347 82.9633 120.669C80.9692 122.188 78.2204 122.838 75.8853 122.342C74.2387 121.992 72.9096 121.165 71.1589 119.4C69.5809 117.809 63.7293 111.716 61.1661 108.995C60.4606 108.247 59.0457 106.76 58.0214 105.692C52.7126 100.154 52.1769 99.5037 51.2742 97.4912C49.6343 93.8367 49.5699 88.5379 51.124 85.1966C51.911 83.5046 52.7081 82.3827 56.6665 77.3948C58.9242 74.5499 60.9882 71.9554 61.2537 71.6292C62.3985 70.2237 66.5265 64.9722 67.3568 63.8655C67.8553 63.2009 68.8435 61.9246 69.5525 61.0299C70.2616 60.1346 71.748 58.2176 72.8561 56.7692C76.7062 51.7368 77.4736 50.9108 79.7049 49.4005C81.93 47.8944 84.1706 46.9066 86.6342 46.3455C87.6414 46.116 91.2379 46.0818 120.234 46.0274C150.255 45.9703 152.759 45.9861 153.43 46.2349C154.287 46.5524 154.997 47.1599 155.297 47.8312Z"/><path fill="url(#sportinBlue)" d="M164.939 120.107C165.215 121.663 164.467 126.811 163.832 127.718C163.694 127.914 163.582 128.186 163.582 128.321C163.58 128.823 161.967 131.165 159.057 134.889C157.411 136.995 155.221 139.807 154.19 141.136C151.512 144.593 145.017 152.833 142.611 155.828C141.958 156.64 140.592 158.381 139.576 159.695C137.302 162.637 136 163.968 134.336 165.055C132.304 166.381 130.443 167.151 127.807 167.754C126.683 168.011 124.392 168.027 95.0134 167.98C64.8062 167.932 63.4033 167.917 62.8489 167.636C61.3454 166.872 61.143 164.974 62.4074 163.497C63.1677 162.61 82.266 143.398 112.27 113.338C127.579 98.0007 133.512 92.1568 134.188 91.7478C134.812 91.3704 135.569 91.0945 136.498 90.9043C138.207 90.5547 138.857 90.5482 140.089 90.8673C141.787 91.3072 142.519 91.8313 144.689 94.1611C145.804 95.3581 147.483 97.1392 148.421 98.1189C150.559 100.353 152.099 101.983 154.96 105.042C156.201 106.367 157.728 107.997 158.352 108.663C162.019 112.572 162.765 113.483 163.394 114.823C164.129 116.39 164.468 117.406 164.7 118.737C164.792 119.269 164.899 119.885 164.939 120.107Z"/></svg>`;
}

function page(raceId: string, valid: boolean): string {
  const canonical = valid ? `https://www.sportin.io/race/${raceId}` : 'https://www.sportin.io/race/';
  const title = 'Join my virtual race on SportIn';
  const description = 'Race friends live on SportIn.';
  const intro = valid
    ? 'A friend invited you to a live virtual race on SportIn. Open the app to join.'
    : 'Ask your friend to share the race again.';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:site_name" content="SportIn"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="https://www.sportin.io/ref/og.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="https://www.sportin.io/ref/og.png"><meta name="theme-color" content="#05070b"><link rel="canonical" href="${esc(canonical)}"><style>
:root{color-scheme:dark;--text:#f5f7fb;--muted:#929aab}*{box-sizing:border-box}html,body{min-height:100%}body{margin:0;display:grid;place-items:center;padding:58px 24px;overflow-x:hidden;background:radial-gradient(circle at 50% 44%,rgba(21,43,79,.11),transparent 35%),radial-gradient(circle at 12% 20%,rgba(28,36,54,.13),transparent 28%),linear-gradient(135deg,#070a0f 0%,#04060a 54%,#07090d 100%);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,Arial,sans-serif;-webkit-font-smoothing:antialiased}.invitation{position:relative;width:min(560px,100%);padding:52px 48px 42px;overflow:hidden;text-align:center;border:1px solid rgba(144,160,191,.17);border-radius:40px;background:radial-gradient(circle at 50% 38%,rgba(13,50,110,.13),transparent 32%),linear-gradient(145deg,rgba(17,23,35,.97),rgba(7,10,16,.99) 72%);box-shadow:0 32px 80px rgba(0,0,0,.63),inset 0 1px 0 rgba(255,255,255,.025)}.brand{width:66px;height:72px;margin:0 auto 27px;filter:drop-shadow(0 8px 15px rgba(0,95,255,.28))}.eyebrow{margin:0 0 12px;color:#c6cad6;font-size:22px;font-weight:600;letter-spacing:-.02em}h1{margin:0;font-size:clamp(40px,5.5vw,56px);line-height:1.04;font-weight:700;letter-spacing:-.045em}.intro{max-width:440px;margin:20px auto 35px;color:var(--muted);font-size:19px;line-height:1.52;letter-spacing:-.012em}.accept,.status{width:100%;min-height:76px;display:flex;align-items:center;justify-content:center;border:0;border-radius:17px;color:#fff;background:linear-gradient(100deg,#0763ff,#0d6bff 62%,#0964ff);box-shadow:0 14px 30px rgba(0,80,255,.17),inset 0 1px 0 rgba(255,255,255,.13);font-family:inherit;font-size:21px;font-weight:500}.accept{cursor:pointer}.status{padding:20px;background:rgba(88,29,37,.55);color:#ffb8c1}.install{margin-top:18px;color:#71798b;font-size:12px}.install a{color:#87b6ff}
@media(max-width:700px){body{padding:18px 12px;align-items:start}.invitation{padding:34px 20px 28px;border-radius:30px}.brand{width:52px;height:57px;margin-bottom:18px}.eyebrow{font-size:18px;margin-bottom:9px}h1{font-size:clamp(34px,11vw,46px)}.intro{margin:17px auto 28px;font-size:16px;line-height:1.43}.accept,.status{min-height:60px;border-radius:14px;font-size:18px}}@media(max-width:370px){.invitation{padding-inline:15px}}
</style></head><body><main class="invitation" aria-label="SportIn virtual race invitation">${sportInLogo()}<p class="eyebrow">You’re invited</p><h1>Virtual Race</h1><p class="intro">${esc(intro)}</p>
${valid ? '<button class="accept" id="open-race" type="button">Open in SportIn</button><div class="install">Don’t have SportIn yet? <a href="'+APP_STORE_URL+'">Download on the App Store</a></div>' : `<div class="status">This race link is invalid.</div><div class="install">Don’t have SportIn yet? <a href="${APP_STORE_URL}">Download on the App Store</a></div>`}</main>
${valid ? `<script>(function(){var raceId=${JSON.stringify(raceId)};var store=${JSON.stringify(APP_STORE_URL)};var button=document.getElementById('open-race');var timer=null;function clearTimer(){if(timer){clearTimeout(timer);timer=null}}button.addEventListener('click',function(){clearTimer();window.location.href='sportin://race/'+raceId;timer=setTimeout(function(){if(!document.hidden)window.location.href=store},2500)});window.addEventListener('pagehide',clearTimer);document.addEventListener('visibilitychange',function(){if(document.hidden)clearTimer()});window.addEventListener('blur',clearTimer);window.addEventListener('pageshow',clearTimer)})();</script>` : ''}</body></html>`;
}

export default async function handler(req: Request): Promise<Response> {
  let raceId = '';
  try {
    const url = new URL(req.url);
    const raceIds = url.searchParams.getAll('raceId');
    raceId = raceIds.length === 1 ? raceIds[0].trim().toLowerCase() : '';
  } catch {
    raceId = '';
  }
  const valid = UUID.test(raceId);
  return new Response(page(raceId, valid), {
    status: valid ? 200 : 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
}
