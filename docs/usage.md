# Linger Preview: details

The README covers what you need to start. This is the rest, as it was written before the README was cut down.

## How it works

Obsidian's Page preview plugin decides per hover source whether the modifier key is required. This plugin registers a source of its own that does not require it, waits out the `hover-link` event Obsidian already fires on every previewable link, and fires it again under that source.

Nothing here parses links or builds popovers, so it works wherever previews already work: the editor, reading view, the file explorer, search results, backlinks, the graph, tab headers.



## Tests

`node test/test.js` covers what starts a wait, what calls it off, and what is fired at the end. Obsidian is stubbed and the clock is hand cranked, so no vault is needed.
