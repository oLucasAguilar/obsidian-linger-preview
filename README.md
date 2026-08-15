# Linger Preview

Rest the pointer on a link for two seconds and its preview opens, the same popover ctrl+hover gives you, without holding ctrl.

Ctrl+hover keeps working as it always did, and so does the wait: move off the link and nothing opens.

## How it works

Obsidian's Page preview plugin decides per hover source whether the modifier key is required. This plugin registers a source of its own that does not require it, waits out the `hover-link` event Obsidian already fires on every previewable link, and fires it again under that source.

Nothing here parses links or builds popovers, so it works wherever previews already work: the editor, reading view, the file explorer, search results, backlinks, the graph, tab headers.

## Settings

How long the pointer has to rest on the link. Two seconds by default.

## Install

Copy `main.js` and `manifest.json` into `<vault>/.obsidian/plugins/linger-preview/`, or point [BRAT](https://github.com/TfTHacker/obsidian42-brat) at this repo. Page preview has to be on, since this plugin only feeds it.

## Tests

`node test/test.js` covers what starts a wait, what calls it off, and what is fired at the end. Obsidian is stubbed and the clock is hand cranked, so no vault is needed.
