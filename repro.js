const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const mode of ['plain','sandbox']){const pg=await b.newPage();const errs=[];pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));pg.on('pageerror',e=>errs.push(e.message));
if(mode==='plain')await pg.goto('file://'+__dirname+'/index.html');else{const html=require('fs').readFileSync(__dirname+'/index.html','utf8');await pg.setContent(`<iframe sandbox="allow-scripts" style="width:400px;height:900px" srcdoc="${html.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></iframe>`);await new Promise(r=>setTimeout(r,800));}
const f=mode==='plain'?pg.mainFrame():pg.frames()[1];console.log(mode,'errors:',errs,'main:',(await f.$eval('#main',e=>e.innerText)).slice(0,80));await pg.close();}
await b.close();})();
