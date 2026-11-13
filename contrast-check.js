// Quick WCAG contrast sanity check for key UI pairs (AA normal text ≥ 4.5:1).
const pairs=[
 ['text on surface','#171717','#ffffff'],
 ['secondary on surface','#525252','#ffffff'],
 ['muted on surface','#737373','#ffffff'],
 ['text on page','#171717','#fafafa'],
 ['white on accent','#ffffff','#4a7d68'],
 ['white on accent deep','#ffffff','#3a6654'],
 ['accent ink on surface','#4a7d68','#ffffff'],
 ['late on surface','#9a382e','#ffffff'],
 ['soon on surface','#7a4e0c','#ffffff'],
 ['ok on surface','#356b58','#ffffff'],
 ['dark text on surface','#ededed','#19191b'],
 ['dark secondary on surface','#a1a1a6','#19191b'],
 ['dark muted on surface','#85858b','#19191b'],
 ['dark accent on surface','#8fbfa8','#19191b'],
 ['dark late on surface','#f0a196','#19191b'],
 ['dark soon on surface','#e2bd78','#19191b'],
 ['dark button text','#141415','#ededed'],
];
function lin(c){const v=c/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}
function lum(hex){const n=hex.replace('#','');const r=parseInt(n.slice(0,2),16),g=parseInt(n.slice(2,4),16),b=parseInt(n.slice(4,6),16);return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)}
function ratio(fg,bg){const L1=Math.max(lum(fg),lum(bg))+0.05,L2=Math.min(lum(fg),lum(bg))+0.05;return L1/L2}
let ok=true;
for(const [name,fg,bg] of pairs){const r=ratio(fg,bg);const pass=r>=4.5;console.log(`${pass?'✓':'✗'} ${name}: ${r.toFixed(2)}:1`);if(!pass)ok=false}
if(!ok)process.exit(1);
