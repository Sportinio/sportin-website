// Render the fan film (fan-film.html) to an MP4: step through every frame with renderAt(t),
// save each as a JPEG, then encode with the stadium crowd under it.
// Run from the repo root with the site served on :5241:
//   node proto/tools/render-fan-film.js <frames dir> <out.mp4>
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'); const path = require('path');
const [dir, out] = process.argv.slice(2);
const FPS = 30;
(async () => {
  fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('http://127.0.0.1:5241/proto/tools/fan-film.html', { waitUntil: 'load' });
  await p.evaluate(() => window.filmReady);
  const total = Math.round((await p.evaluate(() => window.DURATION)) * FPS);
  for (let f = 0; f < total; f++) {
    await p.evaluate((t) => window.renderAt(t), f / FPS);
    await p.screenshot({ path: path.join(dir, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    if (f % 150 === 0) console.log(`frame ${f}/${total}`);
  }
  await b.close();
  const dur = total / FPS;
  // Crowd: full at the open, under the middle, swelling again for the close, faded at both ends.
  const vol = `volume='if(lt(t,6),1,if(lt(t,7),1-0.65*(t-6),if(lt(t,50),0.35,if(lt(t,51.5),0.35+0.65*(t-50)/1.5,1))))':eval=frame`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.jpg'),
    '-ss', '12', '-t', String(dur), '-i', 'stadium_crowd.mp3',
    '-filter:a', `${vol},afade=t=in:d=0.8,afade=t=out:st=${dur - 2}:d=2`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', out], { stdio: 'inherit' });
  console.log('done', out);
})();
