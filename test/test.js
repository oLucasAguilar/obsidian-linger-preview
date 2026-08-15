/* Checks the waiting behind the plugin. Obsidian's API is stubbed and time is
 * hand cranked, so this runs with plain node and needs no vault. */

const path = require('path');
const Module = require('module');

class Fake {
  constructor() {}
}
const fakeObsidian = { Plugin: Fake, PluginSettingTab: Fake, Setting: Fake, Notice: Fake };

const origLoad = Module._load;
Module._load = function (request) {
  if (request === 'obsidian') return fakeObsidian;
  return origLoad.apply(this, arguments);
};

/* one clock, run by hand */
const timers = new Map();
let nextTimer = 1;
global.window = {
  setTimeout(fn) {
    timers.set(nextTimer, fn);
    return nextTimer++;
  },
  clearTimeout(id) {
    timers.delete(id);
  },
};
function runTimers() {
  const due = Array.from(timers.values());
  timers.clear();
  due.forEach((fn) => fn());
}

const { __test: t } = require(path.join(__dirname, '..', 'main.js'));

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`      expected ${JSON.stringify(expected)}\n      actual   ${JSON.stringify(actual)}`);
}

/* ---- what deserves a wait ---- */
const link = { linktext: 'Recipes#Bread', source: 'editor', targetEl: { isConnected: true } };
check('an ordinary link is worth waiting for', t.worthWaiting(link), true);
check('our own event is not', t.worthWaiting(Object.assign({}, link, { source: t.SOURCE })), false);
check('nothing to point at is not', t.worthWaiting(Object.assign({}, link, { targetEl: null })), false);
check('nothing to preview is not', t.worthWaiting(Object.assign({}, link, { linktext: '' })), false);
check('no event at all is not', t.worthWaiting(null), false);

/* ---- staying on the link ---- */
const child = { name: 'child' };
const el = { isConnected: true, contains: (node) => node === child };
check('the link itself counts', t.stillOver(el, el), true);
check('a node inside it counts', t.stillOver(el, child), true);
check('anything else does not', t.stillOver(el, { name: 'elsewhere' }), false);
check('a gone element does not', t.stillOver(null, child), false);

/* ---- what is fired, once the wait is over ---- */
const fired = t.hoverPayload({ ...link, hoverParent: 'parent', sourcePath: undefined }, 'fresh event');
check('it goes out under our source', fired.source, t.SOURCE);
check('with the event that ended the wait', fired.event, 'fresh event');
check('the link is carried over', [fired.linktext, fired.hoverParent], ['Recipes#Bread', 'parent']);
check('a missing source path becomes empty', fired.sourcePath, '');

/* ---- the wait itself ---- */
function makePlugin() {
  const sent = [];
  const plugin = new t.LingerPreviewPlugin();
  plugin.settings = { delayMs: 2000 };
  plugin.waiting = null;
  plugin.app = { workspace: { trigger: (name, info) => sent.push([name, info]) } };
  return { plugin, sent };
}

let { plugin, sent } = makePlugin();
plugin.onHoverLink(Object.assign({ hoverParent: 'p', event: 'first' }, link));
plugin.onMouseMove({ target: link.targetEl });
runTimers();
check('resting on the link opens the preview', sent.length, 1);
check('under our source', sent[0][1].source, t.SOURCE);
check('nothing is left waiting after it fires', plugin.waiting, null);

({ plugin, sent } = makePlugin());
plugin.onHoverLink(Object.assign({ hoverParent: 'p', event: 'first' }, link));
plugin.onMouseMove({ target: { name: 'elsewhere' } });
runTimers();
check('leaving the link calls the wait off', sent.length, 0);

({ plugin, sent } = makePlugin());
plugin.onHoverLink(Object.assign({ hoverParent: 'p', event: 'first' }, link));
const firstTimer = plugin.waiting.timer;
plugin.onHoverLink(Object.assign({ hoverParent: 'p', event: 'again' }, link));
check('hovering the same link again does not restart it', plugin.waiting.timer, firstTimer);
plugin.onHoverLink({ linktext: 'Other', source: 'editor', targetEl: { isConnected: true }, event: 'other' });
check('another link takes the wait over', plugin.waiting.timer !== firstTimer, true);
runTimers();
check('and only that one opens', sent.map((s) => s[1].linktext), ['Other']);

({ plugin, sent } = makePlugin());
plugin.onHoverLink(Object.assign({ hoverParent: 'p', event: 'first' }, link));
plugin.cancel();
runTimers();
check('a keystroke or a click stops it', sent.length, 0);

({ plugin, sent } = makePlugin());
const gone = { linktext: 'Recipes#Bread', source: 'editor', targetEl: { isConnected: false }, event: 'e' };
plugin.onHoverLink(gone);
runTimers();
check('a link that left the document opens nothing', sent.length, 0);

console.log(`\n${failures === 0 ? 'all checks passed' : failures + ' FAILURES'}`);
process.exit(failures === 0 ? 0 : 1);
