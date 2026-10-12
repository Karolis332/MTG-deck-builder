// node sum.cjs model.json [...]: one-line summary per model output
for (const f of process.argv.slice(2)) {
  const x = require(require('path').resolve(f)); const d = x.deckScore || {};
  const c = Object.fromEntries((d.components || []).map(k => [k.key, Math.round(k.score * 10) / 10]));
  console.log(f.split(/[\/]/).pop(), '| opt', x.score, '| DS', d.score, (d.absoluteTotal||0).toFixed(2), 'rank', (typeof d.rank==='number'?d.rank:(d.rank?.value??0)).toFixed(1), '|', ['mana','curve','interaction','advantage','win','synergy'].map(k => k + ' ' + c[k]).join(' '), '| lands', x.landTarget && JSON.stringify(x.landTarget).slice(0, 80));
}
