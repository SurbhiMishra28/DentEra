// test/browsertest.js — one-off verification: landing image.png render,
// login page, and dashboard behind auth (cookie set via CDP).
'use strict';
const fs = require('fs');
const { execFile } = require('child_process');

const CHROME = 'C:\\Users\\DELL\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9223;
const BASE = 'http://localhost:8100';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getJson(url) {
  for (let i = 0; i < 20; i++) {
    try { return await (await fetch(url)).json(); } catch { await sleep(300); }
  }
  throw new Error('debugger never came up');
}

async function main() {
  // demo login → token for dashboard cookie
  const login = await (await fetch(BASE + '/api/auth/demo-login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ who: 'dentistA' })
  })).json();
  if (!login.token) throw new Error('demo login failed');
  const token = login.token;

  const profile = fs.mkdtempSync(require('os').tmpdir() + '/chrome-');
  const child = execFile(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run',
    `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`,
    'about:blank'
  ], () => {});
  try {
    // create a real page target (browser-level ws doesn't run page commands)
    let target = null;
    for (let i = 0; i < 25; i++) {
      try { target = await fetch(`http://127.0.0.1:${PORT}/json/new?url=${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then(r => r.json()); break; }
      catch { await sleep(400); }
    }
    if (!target?.webSocketDebuggerUrl) throw new Error('page target never came up');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let id = 0;
    const pending = new Map();
    const events = [];
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
      else if (d.method) events.push(d);
    };
    function cmd(method, params = {}) {
      const mid = ++id;
      return new Promise(res => { pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
    }
    const results = { errors: [] };
    await cmd('Runtime.enable');
    await cmd('Page.enable');
    await cmd('Network.enable');

    async function go(url, settleMs = 2500) {
      events.length = 0;
      await cmd('Page.navigate', { url });
      await sleep(settleMs);
      return events;
    }

    // 1) LANDING — image.png + general render
    let evs = await go(BASE + '/', 3500);
    const r1 = await cmd('Runtime.evaluate', {
      returnByValue: true, expression:
        `JSON.stringify({
           heroImg: (() => { const i = document.querySelector('img.hero-dna-image'); return i ? { ok: i.complete, w: i.naturalWidth, h: i.naturalHeight, src: i.currentSrc } : null; })(),
           brokenImgs: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.currentSrc),
           title: document.querySelector('.hero h1')?.textContent?.trim() || null
         })`
    });
    results.landing = r1.result?.result?.value;
    results.errors.push(...evs.filter(e => e.method === 'Log.entryAdded' && e.params.entry.level === 'error').map(e => e.params.entry.text));
    results.errors.push(...evs.filter(e => e.method === 'Runtime.exceptionThrown').map(e => JSON.stringify(e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text)));

    // 2) LOGIN — form + demo selector
    evs = await go(BASE + '/#/login', 2500);
    const r2 = await cmd('Runtime.evaluate', {
      returnByValue: true, expression:
        `JSON.stringify({
           form: !!document.querySelector('#loginF'),
           emailInput: !!document.querySelector('#login-email'),
           demoButton: [...document.querySelectorAll('button')].some(b => /Try demo/i.test(b.textContent)),
           heading: document.querySelector('.loginform h2')?.textContent || null
         })`
    });
    results.login = r2.result?.result?.value;
    results.errors.push(...evs.filter(e => e.method === 'Log.entryAdded' && e.params.entry.level === 'error').map(e => e.params.entry.text));

    // 3) DASHBOARD with auth cookie — about:blank pehle, fresh reload zaroori hai
    // (App sirf mount pe /api/auth/me fetch karta hai; hash-change stale me null rakhta hai)
    await cmd('Network.setCookie', { name: 'dent_token', value: token, url: BASE });
    await go('about:blank', 300);
    evs = await go(BASE + '/#/dashboard', 3500);
    const r3 = await cmd('Runtime.evaluate', {
      returnByValue: true, awaitPromise: true, expression:
        `fetch('/api/auth/me', { credentials: 'include' }).then(r => r.text()).then(t => JSON.stringify({
           me: t.slice(0, 80),
           pagehead: document.querySelector('.pagehead h1')?.textContent?.trim() || document.title,
           statCount: document.querySelectorAll('.stat').length,
           panels: document.querySelectorAll('.panel').length,
           apptRows: document.querySelectorAll('.list li').length,
           stillLogin: !!document.querySelector('#loginF')
         }))`
    });
    results.dashboard = r3.result?.result?.value;
    results.errors.push(...evs.filter(e => e.method === 'Log.entryAdded' && e.params.entry.level === 'error').map(e => e.params.entry.text));

    console.log(JSON.stringify(results, null, 2));
    ws.close();
  } finally { child.kill(); }
}

main().then(() => process.exit(0)).catch(e => { console.error('FAIL', e); process.exit(1); });
