import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";

const browserPath = process.env.BROWSER_PATH ?? [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
].find(existsSync);
assert.ok(browserPath, "Set BROWSER_PATH to an installed Chromium browser.");
const profile = await mkdtemp(join(tmpdir(), "matchpoint-browser-"));
const browser = spawn(browserPath, [
  "--headless=new", "--no-first-run", "--no-default-browser-check",
  "--disable-background-networking", "--remote-debugging-port=0",
  `--user-data-dir=${profile}`, "about:blank"
], { stdio: "ignore", windowsHide: true });
let launchError;
browser.on("error", (error) => { launchError = error; });
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
let socket;
let send;

try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (launchError) throw launchError;
    try { port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; }
    catch { await pause(100); }
  }
  assert.ok(port, "Browser debugging endpoint did not start.");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((done, reject) => {
    socket.addEventListener("open", done, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const pending = new Map();
  const errors = [];
  let sequence = 0;
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails);
    const request = pending.get(message.id);
    if (request) {
      pending.delete(message.id);
      clearTimeout(request.timeout);
      if (message.error) request.reject(new Error(JSON.stringify(message.error)));
      else request.done(message.result);
    }
  });
  send = (method, params = {}) => new Promise((done, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 10000);
    pending.set(id, { done, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const value = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails));
    return value.result.value;
  };
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 80; attempt++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await pause(100);
    }
    throw new Error(`Condition failed: ${expression}`);
  };
  const element = (selector) => `document.querySelector(${JSON.stringify(selector)})`;
  const button = (label, selector = "button") => `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(el => el.textContent.trim() === ${JSON.stringify(label)})`;
  const click = async (target) => {
    await waitFor(`(() => {
      const el = ${target};
      if (!el || el.disabled) return false;
      el.scrollIntoView({ block: 'center' });
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    })()`);
    const point = await evaluate(`(() => {
      const el = ${target};
      if (!el) throw new Error('Missing click target');
      el.scrollIntoView({ block: 'center' });
      const rect = el.getBoundingClientRect();
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!el.contains(hit)) throw new Error('Click target is covered: ' + JSON.stringify({ target: el.outerHTML, hit: hit?.outerHTML, x, y, width: window.innerWidth }));
      return { x, y };
    })()`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
    await pause(80);
  };
  const input = async (selector, value) => {
    await evaluate(`(() => {
      const el = ${element(selector)};
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await pause(80);
  };
  const nav = (label) => click(button(label, ".sidebar-nav button"));
  const screenshot = async (name) => {
    const directory = new URL("../.tmp/browser-checks/", import.meta.url);
    await mkdir(directory, { recursive: true });
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(new URL(`${name}.png`, directory), Buffer.from(data, "base64"));
  };
  const reload = async () => {
    await send("Page.reload");
    await waitFor("document.querySelector('h1')?.textContent === 'Competitions'");
  };
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setTimezoneOverride", { timezoneId: "Africa/Cairo" });
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: process.env.APP_URL ?? "http://127.0.0.1:5173/" });
  await waitFor("document.querySelector('h1')?.textContent === 'Competitions'");
  await waitFor("JSON.parse(localStorage.getItem('mp-friendly-matches-v2'))?.length === 4");
  console.log("PASS: desktop app renders starter data");

  await input('.search-box input', '   ');
  assert.equal(await evaluate("document.querySelector('.search-page') === null"), true);
  await input('.search-box input', '  aHmEd   HASSAN  ');
  await waitFor("document.querySelectorAll('.search-result[data-kind=player]').length === 1");
  assert.equal(await evaluate("document.querySelectorAll('.search-result[data-kind=match]').length"), 3);
  await screenshot("desktop-search");
  await click(element('.search-result[data-kind=player]'));
  await waitFor("document.activeElement.id === 'player-1'");
  await click(button('Points settings', '.tabs button'));
  assert.equal(await evaluate("document.querySelector('.points-banner') === null"), true);
  await input('.settings-grid input', '7');
  await input('.search-box input', 'Autumn');
  await click(element('[aria-label="Clear search"]'));
  assert.equal(await evaluate("document.querySelector('.settings-grid input').value"), '7');
  await input('.search-box input', '2026-09-13');
  await waitFor("document.querySelectorAll('.search-result[data-kind=match]').length === 1");
  await click(element('.search-result[data-kind=match]'));
  await waitFor("document.activeElement.id === 'match-2'");
  await input('.search-box input', 'round 2');
  await click(element('.search-result[data-kind=fixture]'));
  await waitFor("document.activeElement.id === 'fixture-3'");
  await input('.search-box input', 'Autumn');
  await click(element('.search-result[data-kind=competition]'));
  assert.equal(await evaluate("document.querySelector('h1').textContent"), 'Autumn Padel League');
  await input('.search-box input', 'no-such-player-xyz');
  await waitFor("document.querySelector('.search-page .empty-panel h2')?.textContent === 'No results found'");
  await click(element('[aria-label="Clear search"]'));
  assert.equal(await evaluate("document.querySelector('.search-page') === null"), true);
  console.log('PASS: global search finds players, matches, fixtures and competitions; destinations and clear work');

  await nav("Settings");
  await waitFor("document.querySelector('.settings-grid')");
  assert.equal(await evaluate("document.querySelector('.points-banner') === null"), true);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.settings-grid label')).fontSize"), '12px');
  await screenshot('desktop-settings');
  for (const invalid of ["-3", "1.5", ""]) {
    await input(".settings-grid input", invalid);
    assert.equal(await evaluate(`${button("Save points")}.disabled`), true);
    assert.equal(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-scoring-v2')).win"), 3);
  }
  await input(".settings-grid input", "5");
  await input(".settings-grid label:nth-child(2) input", "1");
  await click(button("Save points"));
  await waitFor("JSON.parse(localStorage.getItem('mp-friendly-scoring-v2')).win === 5");
  await nav("Overview");
  assert.match(await evaluate("document.querySelector('.competition-card.featured p').textContent"), /5 for a win, 1 for a loss/);
  console.log("PASS: invalid points rejected; saved scoring updates the overview");

  await nav("Friendly Group");
  await click(button("Add match"));
  await waitFor("document.querySelector('[role=dialog]')");
  await input(".score-grid label:first-child input", "2");
  await input(".score-grid label:last-child input", "2");
  assert.equal(await evaluate(`${button("Save result")}.disabled`), true);
  await input(".score-grid label:first-child input", "-1");
  assert.equal(await evaluate(`${button("Save result")}.disabled`), true);
  await input(".score-grid label:first-child input", "2");
  await input(".score-grid label:last-child input", "1");
  await evaluate(`(() => { const select = document.querySelector('[aria-label="Team B player 1"]'); select.value = '1'; select.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  await waitFor(`${button("Save result")}.disabled`);
  await evaluate(`(() => { const select = document.querySelector('[aria-label="Team B player 1"]'); select.value = '3'; select.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  await waitFor(`!${button("Save result")}.disabled`);
  await click(button("Save result"));
  await waitFor("!document.querySelector('[role=dialog]')");
  await waitFor("JSON.parse(localStorage.getItem('mp-friendly-matches-v2')).length === 5");
  assert.equal(await evaluate("document.querySelector('tbody tr .points-cell strong').textContent"), "20");
  await nav("Matches");
  assert.equal(await evaluate("document.querySelectorAll('.match-row').length"), 5);
  await reload();
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-matches-v2')).length"), 5);
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-scoring-v2')).win"), 5);
  console.log("PASS: result validation, standings, match history and persistence");

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 640, deviceScaleFactor: 1, mobile: true });
  await reload();
  await click(element(".mobile-menu"));
  await pause(300);
  await nav("League");
  assert.equal(await evaluate("document.querySelectorAll('.fixture-row').length"), 3);
  assert.equal(await evaluate("document.querySelector('.overlay') === null"), true);
  assert.equal(await evaluate(`${button("Add match")} === undefined`), true);
  await click(element(".mobile-menu"));
  await pause(300);
  await nav("Friendly Group");
  await click(button("Add match"));
  assert.ok(await evaluate("document.querySelector('.modal-card').getBoundingClientRect().height <= window.innerHeight - 36"));
  await click(button("Cancel"));
  await click(button("Add match"));
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await waitFor("!document.querySelector('[role=dialog]')");
  await input('.search-box input', 'Ahmed');
  await waitFor("document.querySelector('.search-result[data-kind=player]')");
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  await screenshot('mobile-search');
  await click(element('.search-result[data-kind=player]'));
  await waitFor("document.activeElement.id === 'player-1'");
  await click(button('Points settings', '.tabs button'));
  assert.equal(await evaluate("document.querySelector('.points-banner') === null"), true);
  await screenshot('mobile-settings');
  await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 640, deviceScaleFactor: 1, mobile: true });
  await pause(300);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  console.log("PASS: mobile navigation receives clicks; match dialog fits and closes");

  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await reload();
  await nav('Friendly Group');
  await click(button('Add player'));
  await waitFor("document.activeElement.id === 'player-name'");
  assert.equal(await evaluate(`${button('Save player')}.disabled`), true);
  await input('#player-name', '   ');
  assert.equal(await evaluate(`${button('Save player')}.disabled`), true);
  await input('#player-name', '  aHmEd   HASSAN  ');
  assert.equal(await evaluate(`${button('Save player')}.disabled`), true);
  await click(button('Cancel', '[role=dialog] button'));
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-players-v2')).length"), 6);
  await click(button('Add player'));
  await input('#player-name', '  علي   محمود  ');
  await click(button('Save player'));
  await waitFor("JSON.parse(localStorage.getItem('mp-friendly-players-v2')).length === 7");
  const addedPlayer = await evaluate("JSON.parse(localStorage.getItem('mp-friendly-players-v2')).find(player => player.name === 'علي محمود')");
  assert.equal(typeof addedPlayer.id, 'string');
  assert.equal(await evaluate(`document.getElementById(${JSON.stringify(`player-${addedPlayer.id}`)}).querySelector('.points-cell').textContent.trim()`), '0');
  await reload();
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-players-v2')).length"), 7);
  await nav('Friendly Group');
  await click(button('Add match'));
  await evaluate(`(() => { const select = document.querySelector('[aria-label="Team A player 1"]'); select.value = ${JSON.stringify(addedPlayer.id)}; select.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  await input('.score-grid label:first-child input', '2');
  await input('.score-grid label:last-child input', '0');
  await click(button('Save result'));
  await waitFor("JSON.parse(localStorage.getItem('mp-friendly-matches-v2')).length === 6");
  assert.equal(await evaluate(`document.getElementById(${JSON.stringify(`player-${addedPlayer.id}`)}).querySelector('.points-cell').textContent.trim()`), '5');
  const addedMatch = await evaluate("JSON.parse(localStorage.getItem('mp-friendly-matches-v2')).at(-1)");
  assert.equal(addedMatch.teamA[0], addedPlayer.id);
  await reload();
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-matches-v2')).length"), 6);
  await input('.search-box input', 'علي محمود');
  await waitFor("document.querySelectorAll('.search-result[data-kind=player]').length === 1");
  assert.equal(await evaluate("document.querySelectorAll('.search-result[data-kind=match]').length"), 1);
  await click(element('.search-result[data-kind=match]'));
  await waitFor(`document.activeElement.id === ${JSON.stringify(`match-${addedMatch.id}`)}`);
  console.log('PASS: player validation, Arabic names, saved roster, new-player matches and search');

  await nav('Friendly Group');
  await click(button('Delete all matches', '.group-actions button'));
  await waitFor("document.querySelector('[role=alertdialog]')");
  assert.match(await evaluate("document.querySelector('[role=alertdialog]').textContent"), /Are you sure you want to delete all previous matches\?/);
  assert.equal(await evaluate('document.activeElement.textContent'), 'Cancel');
  await click(button('Cancel', '[role=alertdialog] button'));
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-matches-v2')).length"), 6);
  await click(button('Delete all matches', '.group-actions button'));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor("!document.querySelector('[role=alertdialog]')");
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-matches-v2')).length"), 6);
  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 640, deviceScaleFactor: 1, mobile: true });
  await click(button('Delete all matches', '.group-actions button'));
  await screenshot('mobile-delete-confirmation');
  assert.equal(await evaluate("document.querySelector('.modal-card').scrollWidth <= document.querySelector('.modal-card').clientWidth"), true);
  await click(button('Delete all matches', '[role=alertdialog] button'));
  await waitFor("JSON.parse(localStorage.getItem('mp-friendly-matches-v2')).length === 0");
  assert.equal(await evaluate("document.querySelectorAll('tbody tr').length"), 7);
  assert.equal(await evaluate("Array.from(document.querySelectorAll('tbody tr')).every(row => [2,3,4,6].every(index => row.children[index].textContent.trim() === '0'))"), true);
  assert.equal(await evaluate(`${button('Delete all matches', '.group-actions button')}.disabled`), true);
  await click(button('Matches', '.tabs button'));
  assert.match(await evaluate("document.querySelector('.match-list').textContent"), /No matches yet/);
  await reload();
  assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-matches-v2'))"), []);
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-players-v2')).length"), 7);
  assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-scoring-v2'))"), { win: 5, loss: 1 });
  await click(element('.mobile-menu'));
  await nav('League');
  assert.equal(await evaluate("document.querySelectorAll('.fixture-row').length"), 3);
  console.log('PASS: delete confirmation, cancel/Escape, zeroed standings and persistent empty history; players/settings/league retained');

  await evaluate("localStorage.setItem('mp-friendly-matches-v2', 'null'); localStorage.setItem('mp-friendly-scoring-v2', '{\"win\":-3,\"loss\":1}');");
  await reload();
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-matches-v2')).length"), 4);
  assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-scoring-v2'))"), { win: 3, loss: 1 });
  await evaluate("localStorage.setItem('mp-friendly-matches-v2', JSON.stringify([JSON.parse(localStorage.getItem('mp-friendly-matches-v2'))[0], null]));");
  await reload();
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('mp-friendly-matches-v2')).length"), 1);
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: "Storage.prototype.setItem = function() { throw new DOMException('Storage full', 'QuotaExceededError'); };"
  });
  await reload();
  await waitFor("document.querySelector('.storage-warning')");
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log("PASS: corrupt data recovers; failed saves show a warning without crashing");
  console.log("All browser checks passed with no uncaught JavaScript errors.");
} finally {
  if (send && socket?.readyState === WebSocket.OPEN) {
    await send("Browser.close").catch(() => {});
    socket.close();
  }
  if (browser.exitCode === null) {
    await Promise.race([new Promise((done) => browser.once("exit", done)), pause(1500)]);
    if (browser.exitCode === null) browser.kill();
  }
  const target = resolve(profile);
  if (target.startsWith(resolve(tmpdir()) + sep) && basename(target).startsWith("matchpoint-browser-")) {
    await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => {});
  }
}
