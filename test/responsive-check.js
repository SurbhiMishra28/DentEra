// test/responsive-check.js — one-off mobile audit: renders a page at a phone viewport
// (390×844) and reports horizontal overflow, tiny text, small tap targets and overlap.
// Usage: node test/responsive-check.js [url] [w] [h]
'use strict';
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const CHROME = 'C:\\Users\\DELL\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9224;
const URL = process.argv[2] || 'http://localhost:8100/#/login';
const W = +(process.argv[3] || 390), H = +(process.argv[4] || 844);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const profile = fs.mkdtempSync(require('os').tmpdir() + '/chrome-m-');
  const child = execFile(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run',
    `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`,
    `--window-size=${W},${H}`, 'about:blank'
  ], () => {});
  try {
    let target = null;
    for (let i = 0; i < 25; i++) {
      try { target = await fetch(`http://127.0.0.1:${PORT}/json/new?url=${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then(r => r.json()); break; }
      catch { await sleep(400); }
    }
    if (!target?.webSocketDebuggerUrl) throw new Error('no page target');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pending = new Map();
    ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
    const cmd = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });

    await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
    await cmd('Runtime.enable'); await cmd('Page.enable');
    // signed-in dashboard: demo login → cookie (no cookie → the app shows the landing page)
    const anon = process.env.ANON === '1';
    if (!anon) try {
      const login = await (await fetch('http://localhost:8100/api/auth/demo-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ who: 'dentistA' })
      })).json();
      if (login.token) await cmd('Network.setCookie', { name: 'dent_token', value: login.token, url: 'http://localhost:8100' });
    } catch { /* anonymous is fine — the landing page is still audited */ }
    await cmd('Page.navigate', { url: URL });
    await sleep(3200);

    const r = await cmd('Runtime.evaluate', {
      returnByValue: true, awaitPromise: true, expression: `(() => {
        const de = document.documentElement;
        const vw = de.clientWidth;
        const overflow = de.scrollWidth - vw;
        const offenders = [];
        for (const el of document.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.width > vw + 4 && r.height > 0) {
            const cs = getComputedStyle(el);
            if (cs.position === 'fixed' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
            offenders.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 40), w: Math.round(r.width), right: Math.round(r.right) });
          }
        }
        const tiny = [];
        for (const el of document.querySelectorAll('p,span,small,b,label,li,h1,h2,h3,h4,button,a,input,select')) {
          const t = (el.textContent || '').trim();
          if (!t || el.children.length) continue;
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < 11.5) tiny.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 30), fs: fs, text: t.slice(0, 30) });
        }
        const smallTaps = [];
        for (const el of document.querySelectorAll('button,a[href],input,select')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (getComputedStyle(el).position === 'fixed') continue;
          if (r.height < 36 || r.width < 36) smallTaps.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), text: (el.textContent || el.placeholder || '').trim().slice(0, 24) });
        }
        const bodyText = (document.body.innerText || '');
        return JSON.stringify({
          url: location.hash || location.pathname,
          viewport: { vw, scrollW: de.scrollWidth, scrollH: de.scrollHeight },
          overflow,
          offenders: offenders.slice(0, 12),
          tinyText: tiny.slice(0, 10),
          smallTaps: smallTaps.slice(0, 12),
          textSample: bodyText.slice(0, 160)
        }, null, 1);
      })()`
    });
    console.log(r.result?.result?.value || JSON.stringify(r));
    // also save a full-page screenshot so the layout can be eyeballed
    const shot = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    if (shot.result?.data) {
      const name = URL.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'page';
      fs.writeFileSync(path.join(__dirname, `shot-${name}-${W}.png`), Buffer.from(shot.result.data, 'base64'));
      console.log('screenshot: test/shot-' + name + '-' + W + '.png');
    }
    ws.close();
  } finally { child.kill(); }
}
main().then(() => process.exit(0)).catch(e => { console.error('FAIL', e); process.exit(1); });
