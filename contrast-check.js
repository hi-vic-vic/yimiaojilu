// Quick WCAG contrast sanity check for key UI pairs (AA normal text ≥ 4.5:1).
const pairs=[
 ['text on surface','#1a221e','#f8faf8'],
 ['muted on surface','#3f4f47','#f8faf8'],
 ['hero chip on accent','#f4f7f4','#2f6b58'],
 ['hero chip border context','#f4f7f4','#2f6b58'],
 ['late chip on surface','#9a382e','#f6e4e1'],
 ['soon chip on surface','#7a4e0c','#f5ecd9'],
 ['accent button ink','#f4f7f4','#2f6b58'],
];
function lin(c){const v=c/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}
function lum(hex){const n=hex.replace('#','');const r=parseInt(n.slice(0,2),16),g=parseInt(n.slice(2,4),16),b=parseInt(n.slice(4,6),16);return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)}
function ratio(fg,bg){const L1=Math.max(lum(fg),lum(bg))+0.05,L2=Math.min(lum(fg),lum(bg))+0.05;return L1/L2}
let ok=true;
for(const [name,fg,bg] of pairs){const r=ratio(fg,bg);const pass=r>=4.5;console.log(`${pass?'✓':'✗'} ${name}: ${r.toFixed(2)}:1`);if(!pass)ok=false}
if(!ok)process.exit(1);
