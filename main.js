'use strict';

const obsidian = require('obsidian');

/* Page preview asks for the modifier key per hover source: a source of our own,
 * registered with defaultMod false, opens the popover straight away. So nothing
 * here has to find links or build popovers. Everywhere in Obsidian that can
 * preview a link already fires hover-link on mouseover, and this waits that
 * same event out, then fires it again under our source. */
const SOURCE = 'linger-preview';

const DEFAULT_SETTINGS = {
  delayMs: 2000,
};

function hoverPayload(info, event) {
  return {
    event,
    source: SOURCE,
    hoverParent: info.hoverParent,
    targetEl: info.targetEl,
    linktext: info.linktext,
    sourcePath: info.sourcePath || '',
    state: info.state,
  };
}

function stillOver(el, target) {
  if (!el || !target) return false;
  return el === target || (typeof el.contains === 'function' && el.contains(target));
}

// Our own event comes back through the same handler, and a link with nothing to
// preview is not worth a timer.
function worthWaiting(info) {
  return !!info && info.source !== SOURCE && !!info.targetEl && !!info.linktext;
}

class LingerPreviewPlugin extends obsidian.Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.waiting = null;

    this.app.workspace.registerHoverLinkSource(SOURCE, {
      display: 'Linger preview',
      defaultMod: false,
    });

    this.registerEvent(this.app.workspace.on('hover-link', (info) => this.onHoverLink(info)));
    // capture, so a handler that stops the event does not strand a timer
    this.registerDomEvent(document, 'mousemove', (event) => this.onMouseMove(event), true);
    for (const type of ['mousedown', 'keydown', 'wheel']) {
      this.registerDomEvent(document, type, () => this.cancel(), true);
    }

    this.addSettingTab(new LingerPreviewSettingTab(this.app, this));
  }

  onunload() {
    this.cancel();
    this.app.workspace.unregisterHoverLinkSource(SOURCE);
  }

  onHoverLink(info) {
    if (!worthWaiting(info)) return;
    if (this.waiting && this.waiting.info.targetEl === info.targetEl) return;
    this.cancel();
    this.waiting = {
      info,
      event: info.event,
      timer: window.setTimeout(() => this.fire(), this.settings.delayMs),
    };
  }

  // The pointer has to stay on the link, and the popover wants a fresh event:
  // the one that opened the wait is stale by the time it fires.
  onMouseMove(event) {
    if (!this.waiting) return;
    if (stillOver(this.waiting.info.targetEl, event.target)) {
      this.waiting.event = event;
      return;
    }
    this.cancel();
  }

  fire() {
    const waiting = this.waiting;
    this.waiting = null;
    if (!waiting || !waiting.info.targetEl.isConnected) return;
    this.app.workspace.trigger('hover-link', hoverPayload(waiting.info, waiting.event));
  }

  cancel() {
    if (!this.waiting) return;
    window.clearTimeout(this.waiting.timer);
    this.waiting = null;
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class LingerPreviewSettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new obsidian.Setting(containerEl)
      .setName('Time on the link')
      .setDesc('Milliseconds the pointer has to rest on a link before its preview opens. Moving off the link starts the wait over.')
      .addText((text) =>
        text.setValue(String(this.plugin.settings.delayMs)).onChange(async (value) => {
          const parsed = Number.parseInt(value, 10);
          if (Number.isFinite(parsed) && parsed >= 100) {
            this.plugin.settings.delayMs = parsed;
            await this.plugin.saveSettings();
          }
        })
      );
  }
}

module.exports = LingerPreviewPlugin;
module.exports.__test = {
  SOURCE,
  DEFAULT_SETTINGS,
  hoverPayload,
  stillOver,
  worthWaiting,
  LingerPreviewPlugin,
};
