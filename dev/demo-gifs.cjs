const { open, sleep } = require('./obsidian-demo.cjs');
const P = require('path').resolve(__dirname, '..'), T = process.env.THEME, O = process.env.OUTDIR || require('path').resolve(__dirname, '../docs');
(async () => {
  const d = await open({ id: 'linger-preview', pluginDir: P, files: ['main.js', 'manifest.json'], theme: T, width: 760, height: 400,
    notes: { 'Recipes.md': '## Bread\n\nFlour, water, salt.\nBake at 230 °C.\n\n## Soup\n\nLeeks and potatoes.\n', 'Today.md': 'Tonight I bake from [[Recipes]].\n\nNo ctrl held.\n' }, openNote: 'Today' });
  await d.cursor(2, 0); await d.js(() => document.activeElement.blur()); await sleep(500); await d.hold(800);
  const l = await d.box('.cm-hmd-internal-link, .internal-link');
  await d.pointer(l.x + l.width / 2, l.y + l.height / 2, { steps: 14 });
  await d.badge('resting on the link'); await d.live(2600); await d.badge(''); await d.hold(2500);
  console.log(await d.gif(`${O}/linger-${T}.gif`)); await d.close();
})().catch(e => { console.error(e); process.exit(1); });
