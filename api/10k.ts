export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://yorrcazqfkpqtsziyyqx.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcnJjYXpxZmtwcXRzeml5eXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTcwNTksImV4cCI6MjA4OTE5MzA1OX0.TpOf5GO8NKxQjT327S4fzWKD9s-NtYJHSv3YQyxvYS8';
const APP_STORE_URL = 'https://apps.apple.com/us/app/sportin-rise-to-the-challenge/id6762152651';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Person = {
  user_id?: string | null;
  name?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  title?: string | null;
  organization?: string | null;
  country_code?: string | null;
  country_flag_url?: string | null;
  steps?: number | null;
  eligible_steps?: number | null;
  completed_at?: string | null;
  verified?: boolean | null;
};

type LandingData = {
  challenge_name?: string | null;
  goal_steps?: number | null;
  available_slots?: number | null;
  campaign_open?: boolean | null;
  inviter?: Person | null;
  impact?: {
    verified_completions?: number | null;
    amount_eur?: number | null;
    target_eur?: number | null;
    target_people?: number | null;
    progress_percent?: number | null;
  } | null;
  amount_raised?: number | null;
  raised_euros?: number | null;
  completion_count?: number | null;
  completed_count?: number | null;
  impact_target?: number | null;
  target_euros?: number | null;
  latest_finishers?: Person[] | null;
  finishers?: Person[] | null;
  sponsor_logos?: Array<string | null> | null;
  sponsors?: Array<{ logo_url?: string | null; name?: string | null } | null> | null;
};

const IOS_FLAG_CODES = new Set('ae,af,al,am,ar,at,au,az,bd,be,bg,br,by,ca,ch,cl,cn,co,cy,cz,de,dk,dz,ec,ee,eg,es,et,fi,fr,gb,ge,gh,gr,hk,hr,hu,id,ie,il,in,iq,ir,is,it,jm,jo,jp,ke,kr,kw,kz,lb,lk,lt,lu,lv,ma,md,mx,my,ng,nl,no,nz,pa,pe,ph,pk,pl,pt,qa,ro,rs,ru,sa,se,sg,si,sk,th,tr,tw,ua,us,uy,uz,ve,vn,za'.split(','));

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value ?? ''));
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function dots(value: number): string {
  return Math.round(value).toLocaleString('de-DE');
}

function personName(person?: Person | null, fallback = 'A SportIn member'): string {
  return person?.name?.trim()
    || person?.full_name?.trim()
    || [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim()
    || fallback;
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

function sportInLogo(): string {
  return `<svg class="brand" viewBox="0 0 214 214" aria-label="SportIn" role="img"><defs><linearGradient id="sportinBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1378ff"/><stop offset="1" stop-color="#0055ed"/></linearGradient></defs><path fill="url(#sportinBlue)" d="M155.297 47.8312C155.938 49.2677 155.626 49.7109 150.183 55.0829C147.579 57.6532 142.511 62.6569 138.92 66.2021C135.329 69.7474 129.746 75.2193 126.514 78.3627C123.281 81.5057 118.823 85.8567 116.607 88.0315C106.819 97.6379 104.218 100.179 99.3649 104.877C96.5287 107.622 93.4131 110.631 92.441 111.563C91.469 112.495 89.1124 114.793 87.2037 116.67C85.2951 118.547 83.3868 120.347 82.9633 120.669C80.9692 122.188 78.2204 122.838 75.8853 122.342C74.2387 121.992 72.9096 121.165 71.1589 119.4C69.5809 117.809 63.7293 111.716 61.1661 108.995C60.4606 108.247 59.0457 106.76 58.0214 105.692C52.7126 100.154 52.1769 99.5037 51.2742 97.4912C49.6343 93.8367 49.5699 88.5379 51.124 85.1966C51.911 83.5046 52.7081 82.3827 56.6665 77.3948C58.9242 74.5499 60.9882 71.9554 61.2537 71.6292C62.3985 70.2237 66.5265 64.9722 67.3568 63.8655C67.8553 63.2009 68.8435 61.9246 69.5525 61.0299C70.2616 60.1346 71.748 58.2176 72.8561 56.7692C76.7062 51.7368 77.4736 50.9108 79.7049 49.4005C81.93 47.8944 84.1706 46.9066 86.6342 46.3455C87.6414 46.116 91.2379 46.0818 120.234 46.0274C150.255 45.9703 152.759 45.9861 153.43 46.2349C154.287 46.5524 154.997 47.1599 155.297 47.8312Z"/><path fill="url(#sportinBlue)" d="M164.939 120.107C165.215 121.663 164.467 126.811 163.832 127.718C163.694 127.914 163.582 128.186 163.582 128.321C163.58 128.823 161.967 131.165 159.057 134.889C157.411 136.995 155.221 139.807 154.19 141.136C151.512 144.593 145.017 152.833 142.611 155.828C141.958 156.64 140.592 158.381 139.576 159.695C137.302 162.637 136 163.968 134.336 165.055C132.304 166.381 130.443 167.151 127.807 167.754C126.683 168.011 124.392 168.027 95.0134 167.98C64.8062 167.932 63.4033 167.917 62.8489 167.636C61.3454 166.872 61.143 164.974 62.4074 163.497C63.1677 162.61 82.266 143.398 112.27 113.338C127.579 98.0007 133.512 92.1568 134.188 91.7478C134.812 91.3704 135.569 91.0945 136.498 90.9043C138.207 90.5547 138.857 90.5482 140.089 90.8673C141.787 91.3072 142.519 91.8313 144.689 94.1611C145.804 95.3581 147.483 97.1392 148.421 98.1189C150.559 100.353 152.099 101.983 154.96 105.042C156.201 106.367 157.728 107.997 158.352 108.663C162.019 112.572 162.765 113.483 163.394 114.823C164.129 116.39 164.468 117.406 164.7 118.737C164.792 119.269 164.899 119.885 164.939 120.107Z"/></svg>`;
}

function personRow(person: Person, goal: number): string {
  const name = personName(person, 'SportIn member');
  const avatarUrl = safeUrl(person.avatar_url);
  const avatar = avatarUrl
    ? `<img class="avatar" src="${esc(avatarUrl)}" alt="" loading="lazy">`
    : `<div class="avatar avatar-fallback">${esc(name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase())}</div>`;
  const countryCode = String(person.country_code || '').trim().toLowerCase();
  const flagUrl = IOS_FLAG_CODES.has(countryCode)
    ? `https://www.sportin.io/flags/${countryCode}.png`
    : safeUrl(person.country_flag_url);
  const flag = flagUrl
    ? `<img class="round-flag" src="${esc(flagUrl)}" alt="${esc(person.country_code || '')}" loading="lazy">`
    : '';
  const title = [person.title, person.organization].filter(Boolean).join(' · ');
  const steps = number(person.eligible_steps ?? person.steps, goal);
  return `<article class="leaderboard-row"><div class="avatar-wrap">${avatar}</div><div class="profile-info"><div class="profile-name-line">${flag}<span class="profile-name">${esc(name)}</span>${person.verified ? '<span class="verified" aria-label="Verified">✓</span>' : ''}</div>${title ? `<div class="profile-title">${esc(title)}</div>` : ''}</div><div class="row-value"><strong>${esc(dots(steps))}</strong><span>st</span></div></article>`;
}

function page(token: string, data: LandingData | null): string {
  const inviter = data?.inviter || null;
  const inviterName = personName(inviter);
  const challenge = data?.challenge_name?.trim() || '10K Challenge';
  const goal = number(data?.goal_steps, 10000) || 10000;
  const available = Math.max(0, number(data?.available_slots));
  const valid = Boolean(data);
  const closed = valid && data?.campaign_open === false;
  const full = valid && available === 0;
  const canAccept = valid && !closed && !full;
  const canonical = token ? `https://www.sportin.io/10k/${token}` : 'https://www.sportin.io/10k/';
  const title = valid ? `${inviterName} challenged you to ${challenge}` : 'SportIn invitation';
  const description = valid
    ? `${inviterName} challenged you to complete ${dots(goal)} steps in 24 hours.`
    : 'This invitation link is invalid or no longer available.';
  const completionCount = number(data?.impact?.verified_completions ?? data?.completion_count ?? data?.completed_count);
  const raised = number(data?.impact?.amount_eur ?? data?.amount_raised ?? data?.raised_euros, completionCount);
  const target = number(data?.impact?.target_eur ?? data?.impact_target ?? data?.target_euros, 10000) || 10000;
  const targetPeople = number(data?.impact?.target_people, 10000) || 10000;
  const projectedProgress = number(data?.impact?.progress_percent, -1);
  const progress = Math.min(100, projectedProgress >= 0 ? projectedProgress : target > 0 ? (raised / target) * 100 : 0);
  const finishers = (data?.latest_finishers || data?.finishers || [])
    .filter((person): person is Person => Boolean(person))
    .slice(0, 4);
  const sponsorUrls = [
    ...(data?.sponsor_logos || []),
    ...(data?.sponsors || []).map(sponsor => sponsor?.logo_url || null),
  ].map(safeUrl).filter((url): url is string => Boolean(url)).slice(0, 3);
  const status = !valid ? 'Invitation not found' : closed ? 'This campaign is closed' : full ? 'This invitation is full' : '';
  const intro = valid
    ? `${esc(inviterName)} has invited you to join the ${esc(challenge)}.<br>Together, let’s move more and make a difference.`
    : 'This invitation link is invalid or no longer available.';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:site_name" content="SportIn"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="https://www.sportin.io/ref/og.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="https://www.sportin.io/ref/og.png"><meta name="theme-color" content="#05070b"><link rel="canonical" href="${esc(canonical)}"><style>
:root{color-scheme:dark;--text:#f5f7fb;--muted:#929aab}*{box-sizing:border-box}html,body{min-height:100%}body{margin:0;display:grid;place-items:center;padding:58px 24px;overflow-x:hidden;background:radial-gradient(circle at 50% 44%,rgba(21,43,79,.11),transparent 35%),radial-gradient(circle at 12% 20%,rgba(28,36,54,.13),transparent 28%),linear-gradient(135deg,#070a0f 0%,#04060a 54%,#07090d 100%);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,Arial,sans-serif;-webkit-font-smoothing:antialiased}body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.16;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.2'/%3E%3C/svg%3E");mix-blend-mode:soft-light}.invitation{position:relative;width:min(840px,100%);padding:52px 78px 42px;overflow:hidden;text-align:center;border:1px solid rgba(144,160,191,.17);border-radius:52px;background:radial-gradient(circle at 50% 38%,rgba(13,50,110,.13),transparent 32%),linear-gradient(145deg,rgba(17,23,35,.97),rgba(7,10,16,.99) 72%);box-shadow:0 32px 80px rgba(0,0,0,.63),inset 0 1px 0 rgba(255,255,255,.025)}.brand{width:66px;height:72px;margin:0 auto 27px;filter:drop-shadow(0 8px 15px rgba(0,95,255,.28))}.eyebrow{margin:0 0 12px;color:#c6cad6;font-size:27px;font-weight:600;letter-spacing:-.02em}h1{margin:0;font-size:clamp(46px,5.1vw,64px);line-height:1.04;font-weight:700;letter-spacing:-.045em}.intro{max-width:620px;margin:20px auto 35px;color:var(--muted);font-size:22px;line-height:1.52;letter-spacing:-.012em}
.impact-total{position:relative;width:min(520px,100%);margin:0 auto 35px;padding:22px 24px 21px;overflow:hidden;text-align:left;border:1px solid rgba(76,137,255,.17);border-radius:22px;background:radial-gradient(circle at 92% 15%,rgba(18,104,255,.13),transparent 34%),linear-gradient(145deg,rgba(18,26,41,.72),rgba(8,12,19,.8));box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 16px 36px rgba(0,0,0,.2)}.impact-globe{position:absolute;top:-19px;right:-12px;width:116px;height:116px;color:#2780ff;opacity:.16;pointer-events:none}.impact-header{position:relative;z-index:1;display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:14px}.impact-kicker{color:#8290a7;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.impact-target{color:rgba(255,255,255,.42);font-size:13px;white-space:nowrap}.impact-target strong{color:#cbd2de}.impact-value{position:relative;z-index:1;display:flex;align-items:baseline;gap:9px;margin-bottom:17px}.impact-value strong{font-size:clamp(45px,5.4vw,60px);line-height:1;letter-spacing:-.05em}.impact-value span{color:#8993a6;font-size:15px;font-weight:600}.impact-progress{position:relative;z-index:1;height:8px;overflow:hidden;border:1px solid rgba(255,255,255,.055);border-radius:999px;background:rgba(255,255,255,.065)}.impact-progress span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#0751e8,#1676ff);box-shadow:0 0 12px rgba(20,111,255,.42)}.impact-progress-copy{position:relative;z-index:1;margin-top:9px;color:rgba(255,255,255,.43);font-size:12px}
.completed-preview{margin:0 0 28px;text-align:left}.completed-heading{display:flex;align-items:baseline;justify-content:space-between;margin:0 2px 14px}.completed-heading h2{margin:0;font-size:17px}.completed-heading span{color:rgba(255,255,255,.3);font-size:12px}.leaderboard-list{display:grid;gap:10px}.leaderboard-row{display:flex;align-items:center;min-width:0;padding:12px 14px;overflow:hidden;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.04);box-shadow:0 4px 8px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.025)}.avatar-wrap,.avatar{flex:0 0 44px;width:44px;height:44px}.avatar{display:grid;place-items:center;overflow:hidden;border:1px solid rgba(255,255,255,.16);border-radius:50%;object-fit:cover;background:linear-gradient(145deg,#315b9f,#182a4c);font-size:14px;font-weight:700}.profile-info{min-width:0;margin-left:12px}.profile-name-line{display:flex;align-items:center;min-width:0;gap:4px}.round-flag{flex:0 0 14.4px;width:14.4px;height:14.4px;border-radius:50%;object-fit:cover}.profile-name{overflow:hidden;font-size:15px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.verified{color:#2ecc71;font-size:11px}.profile-title{margin-top:3px;overflow:hidden;color:rgba(255,255,255,.3);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.row-value{flex:0 0 auto;margin-left:auto;padding-left:10px;white-space:nowrap}.row-value strong{font-family:ui-rounded,"SF Pro Rounded",sans-serif;font-size:15px}.row-value span{margin-left:2px;color:rgba(255,255,255,.5);font-size:9px;vertical-align:top}
.metrics{display:grid;grid-template-columns:repeat(3,1fr);min-height:126px;margin:0 0 28px;border:2px solid rgba(143,153,174,.34);border-radius:30px;background:rgba(15,19,28,.64)}.metric{position:relative;display:grid;align-content:center;gap:8px;padding:18px 12px}.metric+.metric:before{content:"";position:absolute;left:0;top:25px;bottom:25px;width:1px;background:rgba(151,158,174,.39)}.metric strong{font-size:29px;line-height:1;font-weight:500}.metric span{color:#979eae;font-size:21px;line-height:1.18}.sponsors{display:flex;justify-content:center;gap:42px;margin-bottom:36px}.sponsor{width:82px}.sponsor-icon{display:grid;place-items:center;width:72px;height:72px;margin:auto;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018))}.sponsor-icon img{width:80%;height:80%;object-fit:contain}.sponsor-icon.empty:before{content:"";width:22px;height:22px;border:1px dashed rgba(255,255,255,.16);border-radius:5px}.accept,.status{width:100%;min-height:90px;display:flex;align-items:center;justify-content:center;border:0;border-radius:17px;color:#fff;background:linear-gradient(100deg,#0763ff,#0d6bff 62%,#0964ff);box-shadow:0 14px 30px rgba(0,80,255,.17),inset 0 1px 0 rgba(255,255,255,.13);font:500 25px inherit}.accept{cursor:pointer}.accept:disabled{opacity:.7}.status{padding:20px;background:rgba(88,29,37,.55);color:#ffb8c1}.install{margin-top:18px;color:#71798b;font-size:12px}.install a{color:#87b6ff}.saved{min-height:18px;margin:10px 0 0;color:#61d890;font-size:12px}
@media(max-width:700px){body{padding:18px 12px;align-items:start}.invitation{padding:34px 20px 28px;border-radius:34px}.brand{width:52px;height:57px;margin-bottom:18px}.eyebrow{font-size:21px;margin-bottom:9px}h1{font-size:clamp(41px,12vw,53px)}.intro{margin:17px auto 28px;font-size:17px;line-height:1.43}.impact-total{margin-bottom:29px;padding:18px;border-radius:18px}.impact-value strong{font-size:clamp(39px,11vw,51px)}.metrics{min-height:100px;margin-bottom:25px;border-radius:22px}.metric{padding:14px 6px;gap:6px}.metric+.metric:before{top:20px;bottom:20px}.metric strong{font-size:21px}.metric span{font-size:14px}.sponsors{gap:16px;margin-bottom:29px}.sponsor{width:72px}.sponsor-icon{width:64px;height:64px}.accept,.status{min-height:68px;border-radius:14px;font-size:20px}.leaderboard-row{padding:12px 10px}}@media(max-width:370px){.invitation{padding-inline:15px}.intro br{display:none}.metric strong{font-size:18px}.metric span{font-size:12px}}
</style></head><body><main class="invitation" aria-label="SportIn 10K Challenge invitation">${sportInLogo()}<p class="eyebrow">You’re challenged</p><h1>10K Challenge</h1><p class="intro">${intro}</p>
${valid ? `<section class="impact-total" aria-label="Campaign impact: €${esc(dots(raised))} raised of €${esc(dots(target))} target"><div class="impact-header"><span class="impact-kicker">Campaign impact</span><span class="impact-target"><strong>€${esc(dots(target))}</strong> target</span></div><div class="impact-value"><strong>€${esc(dots(raised))}</strong><span>raised</span></div><div class="impact-progress" role="progressbar" aria-valuemin="0" aria-valuenow="${esc(Math.round(completionCount))}" aria-valuemax="${esc(Math.round(targetPeople))}"><span style="width:${progress.toFixed(2)}%"></span></div><div class="impact-progress-copy">${esc(dots(completionCount))} of ${esc(dots(targetPeople))} people completed</div><svg class="impact-globe" viewBox="0 0 96 96" fill="none" aria-hidden="true"><circle cx="48" cy="48" r="38" stroke="currentColor"/><path d="M10 48h76M48 10c11 10 17 23 17 38S59 76 48 86M48 10C37 20 31 33 31 48s6 28 17 38M17 29h62M17 67h62" stroke="currentColor"/></svg></section>` : ''}
${finishers.length ? `<section class="completed-preview" aria-labelledby="completed-title"><div class="completed-heading"><h2 id="completed-title">Latest finishers</h2><span>Latest ${finishers.length} verified individuals</span></div><div class="leaderboard-list">${finishers.map(person => personRow(person, goal)).join('')}</div></section>` : ''}
<section class="metrics" aria-label="Challenge details"><div class="metric"><strong>${esc(dots(goal))}</strong><span>steps</span></div><div class="metric"><strong>24</strong><span>hours</span></div><div class="metric"><strong>72</strong><span>hours to accept</span></div></section><section class="sponsors" aria-label="Campaign supporters">${[0,1,2].map(index => sponsorUrls[index] ? `<div class="sponsor"><div class="sponsor-icon"><img src="${esc(sponsorUrls[index])}" alt="Sponsor ${index + 1}" loading="lazy"></div></div>` : `<div class="sponsor"><div class="sponsor-icon empty" role="img" aria-label="Sponsor logo ${index + 1}"></div></div>`).join('')}</section>
${canAccept ? '<button class="accept" id="accept-invitation" type="button">Accept invitation</button><p class="saved" id="saved" aria-live="polite"></p><div class="install">Don’t have SportIn yet? <a href="'+APP_STORE_URL+'">Download on the App Store</a></div>' : `<div class="status">${esc(status)}</div>`}</main>
${canAccept ? `<script>(function(){var token=${JSON.stringify(token)};var canonical='https://www.sportin.io/10k/'+token;var store=${JSON.stringify(APP_STORE_URL)};var button=document.getElementById('accept-invitation');button.addEventListener('click',function(){button.disabled=true;var moved=false;function openApp(){if(moved)return;moved=true;document.getElementById('saved').textContent='Invitation saved for SportIn';window.location.href='sportin://10k/'+token;window.setTimeout(function(){if(!document.hidden)window.location.href=store},1400)}try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(canonical).then(openApp,openApp);window.setTimeout(openApp,400)}else openApp()}catch(e){openApp()}})})();</script>` : ''}</body></html>`;
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
      'Content-Security-Policy': "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
}
