export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://yorrcazqfkpqtsziyyqx.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcnJjYXpxZmtwcXRzeml5eXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTcwNTksImV4cCI6MjA4OTE5MzA1OX0.TpOf5GO8NKxQjT327S4fzWKD9s-NtYJHSv3YQyxvYS8';

const ORIGIN = 'https://www.sportin.io';

// Cache the static landing template across warm invocations. We fetch the raw
// static file (it has a dot in its path, so the /ref/:code rewrite never catches
// it) and inject per-code OG meta tags.
let TEMPLATE: string | null = null;
async function template(): Promise<string> {
  if (TEMPLATE == null) {
    const r = await fetch(`${ORIGIN}/ref/index.html`, { headers: { 'x-og-template': '1' } });
    if (!r.ok) throw new Error('template fetch ' + r.status);
    TEMPLATE = await r.text();
  }
  return TEMPLATE;
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function fetchFirstName(code: string): Promise<string | null> {
  if (!code) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_referral_invite_card`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: 'Bearer ' + SUPABASE_ANON,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_code: code }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const p = Array.isArray(d) ? d[0] : d;
    const fn = (p && (p.first_name || p.display_name)) || null;
    return fn ? String(fn).trim() || null : null;
  } catch {
    return null;
  }
}

export default async function handler(req: Request): Promise<Response> {
  let code = '';
  try {
    const url = new URL(req.url);
    code = (url.searchParams.get('code') || '').trim().toLowerCase();
    if (!code) {
      code = decodeURIComponent(
        (url.pathname.replace(/^\/ref\/?/, '').split('/')[0] || '').trim().toLowerCase()
      );
    }
  } catch {
    code = '';
  }

  let html: string;
  try {
    html = await template();
  } catch {
    return new Response(null, { status: 302, headers: { Location: '/ref/index.html' } });
  }

  const ogImage = `${ORIGIN}/api/og?code=${encodeURIComponent(code)}`;
  const ogUrl = `https://sportin.io/ref/${encodeURIComponent(code)}`;

  let title = "You're invited to SportIn";
  if (code) {
    const firstName = await fetchFirstName(code);
    if (firstName) title = `${firstName} invited you to SportIn`;
  }
  const titleAttr = escAttr(title);

  // Replace ONLY the meta tags; body/JS untouched.
  html = html
    .replace(/<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${escAttr(ogImage)}" />`)
    .replace(/<meta property="og:image:secure_url" content="[^"]*"\s*\/>/, `<meta property="og:image:secure_url" content="${escAttr(ogImage)}" />`)
    .replace(/<meta name="twitter:image" content="[^"]*"\s*\/>/, `<meta name="twitter:image" content="${escAttr(ogImage)}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${escAttr(ogUrl)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${titleAttr}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${titleAttr}" />`)
    .replace(/<meta property="og:image:alt" content="[^"]*"\s*\/>/, `<meta property="og:image:alt" content="${titleAttr}" />`);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
