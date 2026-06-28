import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

// ── Supabase (anon key inlined exactly as on the /ref landing page) ──────────
const SUPABASE_URL = 'https://yorrcazqfkpqtsziyyqx.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcnJjYXpxZmtwcXRzeml5eXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTcwNTksImV4cCI6MjA4OTE5MzA1OX0.TpOf5GO8NKxQjT327S4fzWKD9s-NtYJHSv3YQyxvYS8';

const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'];

const BRAND = '#1A8CFF';
const PINK = '#FF5CA8';
const GREY = '#AEB4BE';
const BG = '#08080a';

type Inviter = {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  gender?: string | null;
  tier?: string | null;
  mi?: number | null;
  avg_steps?: number | null;
};

const FONT_BASE = 'https://www.sportin.io/ogfonts';
const fontData = Promise.all([
  fetch(`${FONT_BASE}/BigShouldersDisplay-ExtraBold.ttf`).then((r) => r.arrayBuffer()),
  fetch(`${FONT_BASE}/MsMadi-Regular.ttf`).then((r) => r.arrayBuffer()),
  fetch(`${FONT_BASE}/Inter-Medium.ttf`).then((r) => r.arrayBuffer()),
  fetch(`${FONT_BASE}/Inter-Bold.ttf`).then((r) => r.arrayBuffer()),
]);

function fmtK(n: number): string {
  n = +n || 0;
  if (n >= 1000) {
    const k = n / 1000;
    return (k >= 10 ? Math.round(k) : Math.round(n / 100) / 10) + 'k';
  }
  return '' + n;
}

function nameColor(gender?: string | null): string {
  const g = (gender || '').toLowerCase().trim();
  if (['female', 'woman', 'f', 'girl'].includes(g)) return PINK;
  if (['male', 'man', 'm', 'boy'].includes(g)) return BRAND;
  return GREY;
}

async function fetchInviter(code: string): Promise<Inviter | null> {
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
    return p || null;
  } catch {
    return null;
  }
}

// LEVEL / MI / STEPS tile. children is either text or the tier badge <img>.
function StatTile({ label, children, withBorder }: { label: string; children: any; withBorder: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '28px 6px',
        ...(withBorder ? { borderLeft: '1px solid rgba(255,255,255,0.08)' } : {}),
      }}
    >
      <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 19, letterSpacing: 2, color: 'rgba(255,255,255,0.42)' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 50 }}>{children}</div>
    </div>
  );
}

const SIZE = 1080;

export default async function handler(req: Request) {
  let inviter: Inviter | null = null;
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get('code') || '').trim().toLowerCase();
    inviter = await fetchInviter(code);
  } catch {
    inviter = null;
  }

  const [bigShoulders, msMadi, interMedium, interBold] = await fontData;

  const firstName = (inviter?.first_name || '').trim();
  const lastName = (inviter?.last_name || '').trim();
  const displayFirst = firstName || 'Friend';
  const displayLast = (lastName || 'SPORTIN').toUpperCase();
  const fColor = nameColor(inviter?.gender);

  const tier = (inviter?.tier || '').toLowerCase().trim();
  const hasTier = TIERS.includes(tier);
  const mi = inviter?.mi != null ? String(Math.round(inviter.mi * 10) / 10) : '—';
  const steps = inviter?.avg_steps != null ? fmtK(inviter.avg_steps) : '—';
  const avatarUrl = inviter?.avatar_url || '';
  const valStyle = { fontFamily: 'Big Shoulders Display', fontWeight: 800, fontSize: 46, color: '#fff' } as const;

  const image = (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BG,
        fontFamily: 'Inter',
      }}
    >
      {/* THE CARD (only the card — title/description come from the link's meta tags) */}
      <div
        style={{
          width: 840,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 48,
          backgroundColor: '#0c0d12',
          border: '1px solid rgba(255,255,255,0.07)',
          padding: 56,
        }}
      >
        {/* avatar */}
        <div
          style={{
            width: 210,
            height: 210,
            borderRadius: 105,
            margin: '0 0 30px',
            display: 'flex',
            overflow: 'hidden',
            backgroundColor: '#2a2e36',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} width={210} height={210} style={{ width: 210, height: 210, objectFit: 'cover' }} />
          ) : null}
        </div>

        {/* name: script first overlapping uppercase last */}
        <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 54, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 4, fontFamily: 'Ms Madi', fontSize: 98, lineHeight: 1, color: fColor }}>
            {displayFirst}
          </div>
          <div style={{ fontFamily: 'Big Shoulders Display', fontWeight: 800, fontSize: 100, lineHeight: 0.9, letterSpacing: -2, color: '#fff' }}>
            {displayLast}
          </div>
        </div>

        {/* stats */}
        <div
          style={{
            display: 'flex',
            marginTop: 42,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 26,
            backgroundColor: 'rgba(255,255,255,0.03)',
          }}
        >
          <StatTile label="LEVEL" withBorder={false}>
            {hasTier ? (
              <img src={`https://www.sportin.io/levels/${tier}.png`} height={50} style={{ height: 50 }} />
            ) : (
              <div style={valStyle}>—</div>
            )}
          </StatTile>
          <StatTile label="MI" withBorder>
            <div style={valStyle}>{mi}</div>
          </StatTile>
          <StatTile label="STEPS" withBorder>
            <div style={valStyle}>{steps}</div>
          </StatTile>
        </div>

        {/* tagline — centered, blue bleed, big grey quote mark behind-right */}
        <div style={{ display: 'flex', position: 'relative', marginTop: 46, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: -70, display: 'flex', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 270, lineHeight: 1, color: 'rgba(91,168,255,0.32)' }}>&ldquo;</div>
          </div>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 39,
              lineHeight: 1.4,
              color: '#fff',
              textAlign: 'center',
              maxWidth: 640,
            }}
          >
            Walk beside me if you can, outrun me if you dare
          </div>
        </div>
      </div>
    </div>
  );

  try {
    return new ImageResponse(image, {
      width: SIZE,
      height: SIZE,
      fonts: [
        { name: 'Big Shoulders Display', data: bigShoulders, weight: 800, style: 'normal' },
        { name: 'Ms Madi', data: msMadi, weight: 400, style: 'normal' },
        { name: 'Inter', data: interMedium, weight: 500, style: 'normal' },
        { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
      ],
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new ImageResponse(
      (
        <div
          style={{
            width: SIZE,
            height: SIZE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: BG,
            color: '#fff',
            fontFamily: 'Inter',
            fontSize: 56,
            fontWeight: 700,
          }}
        >
          You're invited to SportIn
        </div>
      ),
      {
        width: SIZE,
        height: SIZE,
        fonts: [{ name: 'Inter', data: interBold, weight: 700, style: 'normal' }],
        headers: { 'Cache-Control': 'public, max-age=300' },
      }
    );
  }
}
