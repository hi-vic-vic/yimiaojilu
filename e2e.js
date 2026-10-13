// 使用模拟 Supabase 验证真实页面，绝不访问生产账号或发送登录邮件。
const puppeteer=require('puppeteer-core'),fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
const session=id=>({access_token:'test-token-'+id,refresh_token:'test-refresh',expires_at:Date.now()+3600000,user:{id,email:id+'@example.com'}});
const empty=()=>({children:[],cur:null});
const child=(id,name)=>({id,name,birth:'2026-04-01',sex:'F',records:[],selfPaid:{}});
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(__dirname+'/index.html'))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||['/usr/bin/chromium','/usr/bin/google-chrome'].find(fs.existsSync),args:['--no-sandbox']});
 let passed=0;const check=msg=>{passed++;console.log('✓ '+msg)};
 try{
 const pg=await browser.newPage(),errors=[];pg.on('pageerror',e=>errors.push(e.message));
 const remote={a:empty(),b:{children:[child('b1','云端小蓝')],cur:'b1'}},requests=[];
 let failRead=false,failWrite=false,delayWrite=null,failRefresh=false;
 await pg.exposeFunction('mockCloud',async(url,opts={})=>{
  requests.push({url,opts});
  if(url.includes('/auth/v1/token'))return failRefresh?{status:401,body:{}}:{status:200,body:{access_token:'new-token',refresh_token:'new-refresh',expires_in:3600,user:session('a').user}};
  if(url.includes('/auth/v1/verify'))return {status:200,body:{access_token:'test-token-a',refresh_token:'test-refresh',expires_in:3600,user:session('a').user}};
  if(opts.method==='POST'){
   if(delayWrite)await delayWrite;
   if(failWrite)return {status:500,body:{}};
   const payload=JSON.parse(opts.body);remote[payload.user_id]=payload.data;return {status:201,body:null};
  }
  if(failRead)return {status:503,body:{}};
  const id=new URL(url).searchParams.get('user_id').slice(3);
  return {status:200,body:remote[id]?.children.length?[{data:remote[id]}]:[]};
 });
 await pg.evaluateOnNewDocument(()=>{window.fetch=async(url,opts)=>{const result=await window.mockCloud(String(url),opts);return {ok:result.status<300,status:result.status,json:async()=>result.body}}});
 const url='http://127.0.0.1:'+server.address().port;
 const waitReady=()=>pg.waitForFunction(()=>cloudReady&&!syncBusy);
 const writeCount=()=>requests.filter(r=>r.url.includes('/rest/')&&r.opts.method==='POST').length;
 await pg.goto(url);await pg.waitForSelector('#main button');
 assert.match(await pg.$eval('#main',e=>e.innerText),/请先邮箱登录/);
 assert.equal(await pg.$eval('.picker button',e=>e.disabled),true);
 await pg.evaluate(()=>{editChild()});assert.equal(writeCount(),0);assert(await pg.$('input[name=email]'));await pg.evaluate(()=>document.getElementById('dlg').close());
 check('未登录无法编辑或写入远端');
 // 登录验证码流程，同时保留旧本机数据，确认不被自动上传。
 const legacy={children:[child('old','旧版小红')],cur:'old'};
 await pg.evaluate(data=>localStorage.setItem('vt_data_v1',JSON.stringify(data)),legacy);
 await pg.click('#syncBtn');await pg.type('input[name=email]','a@example.com');await pg.type('input[name=otp]','123456');await pg.evaluate(()=>verifyOtp(document.querySelector('#dform button[type=button]:last-of-type')));await waitReady();
 assert.equal(writeCount(),0);assert.equal(await pg.evaluate(()=>S.children.length),0);assert.match(await pg.$eval('#main',e=>e.innerText),/导出旧版记录/);
 check('验证码登录读取云端，空云端不会上传旧本机记录');
 await pg.click('#addFirst');await pg.type('input[name=name]','云端小红');await pg.$eval('input[name=birth]',e=>e.value='2026-04-01');await pg.click('#dform button.p');await pg.waitForFunction(()=>S.children.length===1&&!syncBusy);
 assert.equal(remote.a.children[0].name,'云端小红');assert.deepEqual(await pg.evaluate(()=>JSON.parse(localStorage.getItem('vt_data_v1'))),legacy);
 assert.equal(await pg.$eval('.picker button',e=>e.disabled),false);
 await pg.reload();await waitReady();assert.match(await pg.$eval('#main',e=>e.innerText),/云端小红/);
 check('添加孩子仅写远端，刷新从远端恢复，旧本机数据不变');
 await pg.evaluate(()=>addRec('hepb'));await pg.$eval('input[name=date]',e=>e.value='2026-04-01');await pg.click('#dform button.p');await pg.waitForFunction(()=>S.children[0].records.length===1&&!syncBusy);
 assert.equal(remote.a.children[0].records[0].vid,'hepb');
 await pg.evaluate(()=>addRec(null,0));await pg.type('input[name=note]','门诊记录');await pg.click('#dform button.p');await pg.waitForFunction(()=>S.children[0].records[0].note==='门诊记录'&&!syncBusy);
 check('接种记录新增、编辑均保存至远端');
 await pg.evaluate(()=>toggleSP('penta',true));assert.equal(remote.a.children[0].selfPaid.penta,true);
 const rows=await pg.$$eval('#upNip .v .n',els=>els.map(e=>e.textContent).join('|'));assert(!rows.includes('脊灰'));
 await pg.evaluate(()=>toggleSP('rv5',true));await pg.evaluate(()=>toggleSP('rv3',true));assert.equal(remote.a.children[0].selfPaid.rv5,false);
 check('五联覆盖和轮状互斥在远端保存后正常工作');
 failWrite=true;const before=JSON.stringify(remote.a);
 await pg.evaluate(()=>toggleSP('mcv4',true));assert.equal(JSON.stringify(remote.a),before);assert.equal(await pg.evaluate(()=>!!S.children[0].selfPaid.mcv4),false);assert.match(await pg.$eval('#toast',e=>e.innerText),/修改未保存/);
 const fixture=fs.readFileSync(__dirname+'/test/fixtures/xunbao-export.json','utf8');
 await pg.evaluate(text=>importJSON({files:[{text:async()=>text}],value:'fixture'}),fixture);assert.equal(JSON.stringify(remote.a),before);assert.equal(await pg.evaluate(()=>S.children.length),1);
 check('远端写入失败不确认修改，导入失败不替换当前记录');
 failWrite=false;const beforeOffline=writeCount();await pg.setOfflineMode(true);await pg.evaluate(()=>toggleSP('mcv4',true));assert.equal(writeCount(),beforeOffline);assert.match(await pg.$eval('#toast',e=>e.innerText),/离线/);await pg.setOfflineMode(false);
 check('断网阻止修改，不产生本机回退或待上传队列');
 await pg.evaluate(text=>importJSON({files:[{text:async()=>text}],value:'fixture'}),fixture);assert.equal(remote.a.children.length,2);
 assert.deepEqual(await pg.evaluate(()=>JSON.parse(localStorage.getItem('vt_data_v1'))),legacy);
 check('登录后导入旧档案，上传成功才更新页面');
 // 保存期间不允许重叠修改。
 let release;delayWrite=new Promise(r=>release=r);const first=pg.evaluate(()=>toggleSP('mcv4',true));await pg.waitForFunction(()=>syncBusy);
 const count=writeCount();await pg.evaluate(()=>toggleSP('hib',true));assert.equal(writeCount(),count);release();await first;delayWrite=null;
 check('保存期间阻止重叠写入');
 pg.on('dialog',d=>d.accept());await pg.evaluate(()=>syncAction());assert.equal(await pg.evaluate(()=>S.children.length),0);assert.equal(await pg.evaluate(()=>localStorage.getItem('vt_auth_v1')),null);
 await pg.reload();assert.match(await pg.$eval('#main',e=>e.innerText),/请先邮箱登录/);
 check('退出清空页面数据和登录会话，刷新不会恢复账号记录');
 await pg.evaluate(s=>localStorage.setItem('vt_auth_v1',JSON.stringify(s)),session('b'));await pg.reload();await waitReady();assert.equal(await pg.evaluate(()=>S.children[0].name),'云端小蓝');assert.equal(remote.a.children.length,2);
 check('切换账号仅显示该账号远端记录');
 failRead=true;const writes=writeCount();await pg.reload();await pg.waitForFunction(()=>syncStatus==='err');assert.equal(await pg.evaluate(()=>cloudReady),false);assert.equal(await pg.evaluate(()=>S.children.length),0);assert.equal(writeCount(),writes);await pg.evaluate(()=>editChild());assert.equal(writeCount(),writes);
 failRead=false;await pg.evaluate(()=>reconcileAfterLogin());await waitReady();
 check('读取失败锁定编辑，不上传空状态；重试恢复');
 // 失效登录不可回退到本机；成功刷新 token 后重新读取。
 failRefresh=true;const expired={...session('a'),expires_at:1};await pg.evaluate(s=>localStorage.setItem('vt_auth_v1',JSON.stringify(s)),expired);await pg.reload();await pg.waitForFunction(()=>syncStatus==='err');assert.equal(await pg.evaluate(()=>cloudReady),false);
 failRefresh=false;await pg.evaluate(()=>reconcileAfterLogin());await waitReady();assert.equal(await pg.evaluate(()=>authSession.access_token),'new-token');
 check('登录过期时锁定记录，token 刷新后恢复云端读取');
 await pg.evaluate(()=>delRec(0)); // 当前导入的孩子有记录
 assert.equal(await pg.evaluate(()=>cur().records.length),remote.a.children.find(c=>c.id===remote.a.cur).records.length);
 await pg.evaluate(()=>delChild());assert.equal(remote.a.children.length,1);
 check('删除记录及孩子同步保存至远端');
 await pg.evaluate(()=>clearLegacy());assert.equal(await pg.evaluate(()=>localStorage.getItem('vt_data_v1')),null);
 await pg.evaluate(()=>toggleSP('mcv4',true));assert.equal(await pg.evaluate(()=>localStorage.getItem('vt_data_v1')),null);
 assert.deepEqual(await pg.evaluate(()=>Object.keys(localStorage)),['vt_auth_v1']);
 check('用户确认后清除旧版记录，后续修改不再创建本机业务存储');
 // 浏览器禁止 localStorage 时仍应显示登录页面，不使用内存业务存储回退。
 const sandbox=await browser.newPage();sandbox.on('pageerror',e=>errors.push(e.message));
 const html=fs.readFileSync(__dirname+'/index.html','utf8').replace(/&/g,'&amp;').replace(/"/g,'&quot;');await sandbox.setContent(`<iframe sandbox="allow-scripts" srcdoc="${html}"></iframe>`);
 const frame=sandbox.frames()[1];await frame.waitForSelector('#main button');assert.match(await frame.$eval('#main',e=>e.innerText),/请先邮箱登录/);
 check('禁用浏览器存储时无脚本错误，显示登录入口');
 assert.deepEqual(errors,[]);console.log(passed+' e2e tests passed');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
