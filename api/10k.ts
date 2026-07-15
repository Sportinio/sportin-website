export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://yorrcazqfkpqtsziyyqx.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcnJjYXpxZmtwcXRzeml5eXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTcwNTksImV4cCI6MjA4OTE5MzA1OX0.TpOf5GO8NKxQjT327S4fzWKD9s-NtYJHSv3YQyxvYS8';
const APP_STORE_URL = 'https://apps.apple.com/us/app/sportin-rise-to-the-challenge/id6762152651';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type LandingData = {
  challenge_name?: string | null;
  goal_steps?: number | null;
  available_slots?: number | null;
  campaign_open?: boolean | null;
  inviter?: {
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    title?: string | null;
    organization?: string | null;
  } | null;
};

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function getLandingData(token: string): Promise<LandingData | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_invitation_challenge_link`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_public_token: token }),
    });
    if (!response.ok) return null;
    const result = await response.json();
    return (Array.isArray(result) ? result[0] : result) || null;
  } catch {
    return null;
  }
}

function page(token: string, data: LandingData | null): string {
  const inviter = data?.inviter || null;
  const name = inviter?.full_name?.trim()
    || [inviter?.first_name, inviter?.last_name].filter(Boolean).join(' ').trim()
    || 'A SportIn member';
  const detail = [inviter?.title, inviter?.organization].filter(Boolean).join(' · ');
  const challenge = data?.challenge_name?.trim() || '10K Invitation Challenge';
  const goal = Number(data?.goal_steps) || 10000;
  const available = Math.max(0, Number(data?.available_slots) || 0);
  const valid = Boolean(data);
  const closed = valid && data?.campaign_open === false;
  const full = valid && available === 0;
  const canAccept = valid && !closed && !full;
  const canonical = token ? `https://www.sportin.io/10k/${token}` : 'https://www.sportin.io/10k/';
  const title = valid ? `${name} invited you to ${challenge}` : 'SportIn invitation';
  const message = !valid
    ? 'This invitation link is invalid or no longer available.'
    : closed
      ? 'This campaign is closed.'
      : full
        ? 'This invitation already has three accepted participants.'
        : `Complete ${goal.toLocaleString('en-US')} steps in one challenge day and continue the chain.`;
  const avatar = inviter?.avatar_url
    ? `<img class="avatar" src="${esc(inviter.avatar_url)}" alt="" />`
    : `<div class="avatar fallback">${esc(name.slice(0, 1).toUpperCase())}</div>`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(message)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="SportIn" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(message)}" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:image" content="https://www.sportin.io/ref/og.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(message)}" />
<meta name="twitter:image" content="https://www.sportin.io/ref/og.png" />
<meta name="theme-color" content="#0751fb" />
<link rel="canonical" href="${esc(canonical)}" />
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#000f29}body{min-height:100vh;display:grid;place-items:center;padding:28px 20px;background:radial-gradient(circle at top,#ede9fe 0,#f7f8fb 52%)}
.card{width:min(100%,430px);overflow:hidden;border:1px solid rgba(226,228,233,.85);border-radius:28px;background:#fff;box-shadow:0 24px 60px rgba(0,15,41,.12)}.hero{height:144px;display:grid;place-items:center;background:linear-gradient(135deg,#7c3aed,#0751fb);color:#fff;font-size:46px}.body{padding:0 28px 28px;text-align:center}.avatar{display:block;width:72px;height:72px;margin:-36px auto 12px;border:4px solid #fff;border-radius:50%;object-fit:cover;background:#000f29}.fallback{display:grid;place-items:center;color:#fff;font-size:24px;font-weight:800}.eyebrow{margin:0;color:#7c3aed;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}h1{margin:9px 0 0;font-size:25px;line-height:1.18}.detail{margin:5px 0 0;color:#75777e;font-size:13px}.message{margin:20px 0 0;color:#44474d;font-size:15px;line-height:1.55}.stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}.stat{padding:13px;border-radius:16px;background:#f7f8fb}.stat strong{display:block;font-size:19px}.stat span{color:#75777e;font-size:11px}.cta{width:100%;border:0;border-radius:16px;padding:15px;background:#0751fb;color:#fff;font:700 15px inherit;cursor:pointer}.cta:disabled{background:#d8dbe2;cursor:default}.status{margin:20px 0 0;padding:15px;border-radius:16px;background:#fef2f2;color:#b91c1c;font-size:13px;font-weight:650}.install{margin-top:20px;padding-top:18px;border-top:1px solid #eceef2;color:#75777e;font-size:12px}.install a{color:#0751fb;font-weight:750;text-decoration:none}.saved{min-height:18px;margin:10px 0 0;color:#137333;font-size:12px}.brand{margin-top:18px;color:#a0a4ac;font-size:11px;letter-spacing:.16em;text-transform:uppercase}
</style></head><body>
<main class="card"><div class="hero" aria-hidden="true">↗</div><section class="body">
${avatar}<p class="eyebrow">Invitation Challenge</p><h1>${esc(valid ? `${name} invited you` : 'Invitation not found')}</h1>
${detail ? `<p class="detail">${esc(detail)}</p>` : ''}<p class="message">${esc(message)}</p>
${valid ? `<div class="stats"><div class="stat"><strong>${esc(available)}</strong><span>spots available</span></div><div class="stat"><strong>€1</strong><span>per completion</span></div></div>` : ''}
${canAccept ? '<button class="cta" id="accept" type="button">Accept invitation</button><p class="saved" id="saved" aria-live="polite"></p>' : `<div class="status">${esc(message)}</div>`}
${canAccept ? `<div class="install">Don’t have SportIn yet? <a href="${APP_STORE_URL}">Download on the App Store</a></div>` : ''}
<div class="brand">SportIn</div></section></main>
${canAccept ? `<script>
(function(){
  var token=${JSON.stringify(token)};
  var canonical='https://www.sportin.io/10k/'+token;
  var store=${JSON.stringify(APP_STORE_URL)};
  var button=document.getElementById('accept');
  button.addEventListener('click',function(){
    button.disabled=true;
    var moved=false;
    function openApp(){
      if(moved)return;moved=true;
      document.getElementById('saved').textContent='Invitation saved for SportIn';
      window.location.href='sportin://10k/'+token;
      window.setTimeout(function(){if(!document.hidden)window.location.href=store;},1400);
    }
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(canonical).then(openApp,openApp);
        window.setTimeout(openApp,400);
      }else openApp();
    }catch(e){openApp();}
  });
})();
</script>` : ''}</body></html>`;
}

export default async function handler(req: Request): Promise<Response> {
  let token = '';
  try {
    const url = new URL(req.url);
    token = (url.searchParams.get('token') || '').trim().toLowerCase();
  } catch {
    token = '';
  }
  const data = UUID.test(token) ? await getLandingData(token) : null;
  return new Response(page(token, data), {
    status: data ? 200 : 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
