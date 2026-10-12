const p=require('puppeteer-core');const F='file://'+__dirname+'/index.html';
(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const shot=async(url,w,h,out,dark)=>{const ctx=await b.createBrowserContext();const pg=await ctx.newPage();await pg.setViewport({width:w,height:h,deviceScaleFactor:w<500?2:1});if(dark)await pg.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);await pg.goto(url);await new Promise(r=>setTimeout(r,300));
 const t=await pg.evaluate(()=>document.body.innerText);const bad=(t.match(/[—–]/g)||[]).length,emoji=(t.match(/\p{Extended_Pictographic}/gu)||[]).filter(x=>!'✓'.includes(x)).length,wrap=await pg.evaluate(()=>[...document.querySelectorAll('.btn')].filter(b=>b.offsetHeight>48).map(b=>b.textContent));
 console.log(out,'emdash:',bad,'emoji:',emoji,'wrappedBtns:',wrap);await pg.screenshot({path:__dirname+'/'+out,fullPage:true});await ctx.close()};
await shot(F,1280,800,'v4-empty.png');await shot(F+'?demo',1280,900,'v4-dashboard.png');await shot(F+'?demo',390,844,'v4-mobile.png');await shot(F+'?demo',1280,900,'/tmp/v2-dark.png'.replace('/tmp/','../../tmp/'),true);
await b.close()})();
