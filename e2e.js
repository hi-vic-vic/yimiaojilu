// 无头浏览器测试：首次加载、沙箱iframe、添加孩子流程
const p=require('puppeteer-core'),fs=require('fs'),assert=require('assert');const F='file://'+__dirname+'/index.html';
(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});let ok=0;
const page=async()=>{const pg=await b.newPage();await pg.setViewport({width:420,height:1000});pg.errs=[];pg.on('pageerror',e=>pg.errs.push(e.message));return pg};
// 1 首次加载
let pg=await page();await pg.goto(F);let t=await pg.$eval('#main',e=>e.innerText);assert(t.includes('欢迎')&&await pg.$('#addFirst')&&await pg.$('#demoBtn'));assert.deepEqual(pg.errs,[]);
await pg.screenshot({path:__dirname+'/shot-empty.png',fullPage:true});console.log('✓ 首次加载显示欢迎页');ok++;
// 2 添加孩子流程
await pg.click('#addFirst');await pg.type('input[name=name]','小红');await pg.$eval('input[name=birth]',e=>e.value='2026-04-01');await pg.select('select[name=sex]','F');await pg.click('#dform button.p');await new Promise(r=>setTimeout(r,300));
t=await pg.$eval('#main',e=>e.innerText);assert(t.includes('小红')&&t.includes('乙肝疫苗')&&t.includes('待接种'),t);
assert((await pg.evaluate(()=>JSON.parse(localStorage.getItem('vt_data_v1')).children.length))===1);
await pg.screenshot({path:__dirname+'/shot-added.png',fullPage:true});console.log('✓ 添加孩子后概览显示疫苗，且已存入localStorage');ok++;
await pg.reload();await new Promise(r=>setTimeout(r,300));assert((await pg.$eval('#main',e=>e.innerText)).includes('小红'));console.log('✓ 刷新后数据仍在');ok++;
// 3 沙箱iframe（localStorage抛SecurityError）
pg=await page();const html=fs.readFileSync(__dirname+'/index.html','utf8').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
await pg.setContent(`<iframe sandbox="allow-scripts" style="width:400px;height:900px" srcdoc="${html}"></iframe>`);await new Promise(r=>setTimeout(r,800));
const fr=pg.frames()[1];t=await fr.$eval('#main',e=>e.innerText);assert(t.includes('欢迎'),t);assert(!(await fr.$eval('#persist',e=>e.hidden)));assert.deepEqual(pg.errs,[]);
await fr.click('#demoBtn');await new Promise(r=>setTimeout(r,200));assert((await fr.$eval('#main',e=>e.innerText)).includes('小禾'));console.log('✓ 沙箱iframe：无报错，显示欢迎页+不可保存提示，示例可加载');ok++;
// 4 五联：在界面勾选后，百白破/脊灰/Hib 提醒消失，第5剂百白破保留
{const ctx=await b.createBrowserContext();pg=await ctx.newPage();await pg.setViewport({width:1280,height:900});}await pg.goto(F);await pg.click('#addFirst');await pg.type('input[name=name]','周以安');await pg.$eval('input[name=birth]',e=>e.value='2026-08-01');await pg.click('#dform button.p');await new Promise(r=>setTimeout(r,300));
const upTxt=()=>pg.$eval('#upNip',e=>e.innerText);let u=await upTxt();assert(u.includes('百白破')&&u.includes('脊灰'),u);
await pg.click('input[data-sp=hib]');await new Promise(r=>setTimeout(r,200));assert((await pg.$eval('#upSelf',e=>e.innerText)).includes('Hib'));
await pg.click('input[data-sp=penta]');await new Promise(r=>setTimeout(r,200));
u=await upTxt();const self=await pg.$eval('#upSelf',e=>e.innerText);
const rows=await pg.$$eval('#upNip .v .n',L=>L.map(e=>e.textContent).join('|'));assert(!rows.includes('脊灰'),'脊灰仍在 '+rows);assert(u.includes('百白破')&&u.includes('第5剂')&&u.includes('前4剂由五联覆盖'),u);assert(!self.includes('Hib疫苗\n')||self.includes('五联'),self);assert(self.includes('五联疫苗'));
assert(!/Hib疫苗[^\n]*\n[^\n]*下一剂/.test(self),'Hib 仍有提醒');
// 轮状二选一
await pg.click('input[data-sp=rv5]');await new Promise(r=>setTimeout(r,200));await pg.click('input[data-sp=rv3]');await new Promise(r=>setTimeout(r,200));
assert(await pg.$eval('input[data-sp=rv3]',e=>e.checked)&&!(await pg.$eval('input[data-sp=rv5]',e=>e.checked)));
assert((await upTxt()).includes('由五联覆盖'));await pg.evaluate(()=>{document.getElementById('toast').style.display='none';scrollTo(0,0);document.querySelector('.top').style.position='static'});await pg.screenshot({path:__dirname+'/v3-penta.png',fullPage:true});
await pg.click('[data-add]').catch(()=>{});
console.log('✓ 勾选五联后脊灰/Hib提醒消失，百白破只剩第5剂；轮状5价/三价互斥');ok++;
await b.close();console.log(ok+' e2e tests passed');})().catch(e=>{console.error('FAIL',e);process.exit(1)});
