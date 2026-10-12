const VT=require('./schedule.js'),assert=require('assert'),fs=require('fs'),path=require('path');const T='2026-10-12';
const xunbao=JSON.parse(fs.readFileSync(path.join(__dirname,'test/fixtures/xunbao-export.json'),'utf8'));
const g=(p,id)=>p.find(s=>s.id===id);
// 新生儿
let p=VT.seriesPlan({birth:'2026-10-10',records:[]},T);
assert.equal(g(p,'hepb').status,'overdue');assert.equal(g(p,'hepb').due,'2026-10-12');assert.equal(g(p,'hepb').given,0);assert.equal(g(p,'polio').due,'2026-12-10');assert.equal(g(p,'dtap').due,'2026-12-10');assert.equal(g(p,'dtap').total,5);assert.equal(g(p,'dt').status,'alt');
// 8月龄部分记录
p=VT.seriesPlan({birth:'2026-02-12',records:[{vid:'hepb',date:'2026-02-12'},{vid:'hepb',date:'2026-03-12'},{vid:'bcg',date:'2026-02-12'},{vid:'polio',date:'2026-04-12'},{vid:'polio',date:'2026-05-12'},{vid:'dtap',date:'2026-05-12'}]},T);
assert.equal(g(p,'bcg').status,'done');assert.equal(g(p,'hepb').status,'overdue');assert.equal(g(p,'dtap').status,'overdue');
assert.equal(g(p,'mmr').due,'2026-10-12');
// 五联替代
p=VT.seriesPlan({birth:'2026-02-12',records:[{vid:'penta',date:'2026-04-12'},{vid:'penta',date:'2026-05-12'}]},T);
assert.equal(g(p,'dtap').given,2);assert.equal(g(p,'polio').given,2);assert.equal(g(p,'hib').given,2);
// 逾期3岁
p=VT.seriesPlan({birth:'2023-09-01',records:[{vid:'hepb',date:'2023-09-01'}]},T);
assert.equal(g(p,'hepb').status,'overdue');assert.equal(g(p,'hepb').due,T);assert.equal(g(p,'bcg').status,'overdue');assert.equal(g(p,'mpsva').status,'expired');
assert.equal(g(p,'rv5').status,'unselected');assert.equal(VT.seriesPlan({birth:'2023-09-01',records:[],selfPaid:{rv5:true}},T).find(s=>s.id==='rv5').status,'expired');
p=VT.seriesPlan({birth:'2023-09-01',records:[{vid:'mpsva',date:'2026-06-01'}]},T);assert.equal(g(p,'mpsvac').due,'2026-10-12');
assert.ok(VT.ics({id:'x',name:'测试',birth:'2023-09-01',records:[]},T).includes('BEGIN:VEVENT'));
// 2026版新增/修正
p=VT.seriesPlan({birth:'2026-02-12',records:[{vid:'jei',date:'2026-10-12'},{vid:'jei',date:'2026-10-19'}]},T);assert.equal(g(p,'jei').due,'2028-02-12');
p=VT.seriesPlan({birth:'2019-01-01',records:[{vid:'dtap',date:'2019-03-01'},{vid:'dtap',date:'2019-04-01'},{vid:'dtap',date:'2019-05-01'},{vid:'dtap',date:'2020-07-01'}]},T);assert.equal(g(p,'dtap').status,'expired');assert.equal(g(p,'dt').status,'overdue');
p=VT.seriesPlan({birth:'2013-05-01',sex:'F',records:[]},T);assert.equal(g(p,'hpv2').status,'overdue');
p=VT.seriesPlan({birth:'2013-05-01',sex:'M',records:[]},T);assert.ok(!g(p,'hpv2'));
p=VT.seriesPlan({birth:'2024-01-01',records:[{vid:'mpsva',date:'2024-07-01'}]},T);assert.equal(g(p,'mpsvac').status,'overdue');
// ===== 自费计划 + 五联覆盖 =====
const ids=L=>L.map(s=>s.id);
// 未选择的自费疫苗不进入提醒
let c={id:'k',name:'测',birth:'2026-08-01',records:[]};
assert.ok(!ids(VT.upcoming(c,T)).some(id=>['pcv13','penta','hib','rv5','rv3','flu'].includes(id)));
assert.ok(!VT.ics(c,T).includes('13价'));
// 选择五联（尚无记录）：百白破/脊灰/Hib 被覆盖，第5剂百白破仍在
c.selfPaid={penta:true,hib:true};p=VT.seriesPlan(c,T);
['dtap','polio','hib'].forEach(id=>{assert.equal(g(p,id).status,'covered');assert.equal(g(p,id).due,null)});
assert.equal(g(p,'penta').status,'overdue');assert.equal(g(p,'penta').nextLabel,'第1剂');
let up=VT.upcoming(c,T);assert.ok(!up.some(s=>s.id==='polio'||s.id==='hib'));
const d5=up.find(s=>s.id==='dtap');assert.ok(d5&&d5.later&&d5.due==='2032-08-01'&&d5.nextLabel.includes('第5剂'));
assert.ok(VT.ics(c,T).includes('五联'));
// 部分五联后取消选择：已打五联计入，其余回到单苗
c={birth:'2026-02-12',records:[{vid:'penta',date:'2026-04-12'},{vid:'penta',date:'2026-05-12'}],selfPaid:{penta:false}};p=VT.seriesPlan(c,T);
assert.equal(g(p,'penta').selected,false);assert.equal(g(p,'penta').status,'unselected');assert.equal(g(p,'dtap').given,2);assert.equal(g(p,'dtap').status,'overdue');assert.equal(g(p,'dtap').nextLabel,'第3剂');assert.equal(g(p,'polio').given,2);assert.ok(g(p,'polio').nextLabel.includes('bOPV'));assert.ok(VT.upcoming(c,T).some(s=>s.id==='dtap'));
c.records=[{vid:'dtap',date:'2026-04-12'},{vid:'polio',date:'2026-04-12'}];c.selfPaid={penta:false};p=VT.seriesPlan(c,T);assert.equal(g(p,'dtap').status,'overdue');
// 取消五联（有2剂记录）时，页面会保留记录：模拟历史五联 + 不再计划（coverer 有记录仍算已选 -> 用 covers 记录计数）
c={birth:'2026-02-12',records:[{vid:'penta',date:'2026-04-12'},{vid:'penta',date:'2026-05-12'}]};p=VT.seriesPlan(c,T);
assert.equal(g(p,'dtap').given,2);assert.equal(g(p,'polio').given,2);assert.equal(g(p,'penta').nextLabel,'第3剂');
// 中途切换：已打1剂百白破+1剂IPV，再选五联 -> 五联从第2剂开始，单苗不再提醒
c={birth:'2026-02-12',records:[{vid:'dtap',date:'2026-04-12'},{vid:'polio',date:'2026-04-12'}],selfPaid:{penta:true}};p=VT.seriesPlan(c,T);
assert.equal(g(p,'penta').nextLabel,'第2剂');assert.equal(g(p,'penta').due,'2026-10-12');assert.equal(g(p,'dtap').status,'covered');assert.equal(g(p,'polio').status,'covered');
// 五联4剂完成：脊灰全部完成(无需bOPV)，百白破只差第5剂
c={birth:'2024-02-12',records:['2024-04-12','2024-05-12','2024-06-12','2025-08-12'].map(d=>({vid:'penta',date:d}))};p=VT.seriesPlan(c,T);
assert.equal(g(p,'polio').status,'done');assert.equal(g(p,'dtap').given,4);assert.equal(g(p,'dtap').due,'2030-02-12');assert.equal(g(p,'penta').status,'done');
// 轮状二选一：rv3 有记录 -> rv3 已选；三价程序
c={birth:'2026-08-01',records:[{vid:'rv3',date:'2026-09-15'}],selfPaid:{rv5:false}};p=VT.seriesPlan(c,T);
assert.equal(g(p,'rv3').selected,true);assert.equal(g(p,'rv3').due,'2026-10-15');assert.equal(g(p,'rv5').status,'unselected');
// 旧备份（无 selfPaid）兼容
assert.doesNotThrow(()=>VT.seriesPlan({birth:'2026-01-01',records:[{vid:'pcv13',date:'2026-03-01'}]},T));
assert.equal(VT.seriesPlan({birth:'2026-01-01',records:[{vid:'pcv13',date:'2026-03-01'}]},T).find(s=>s.id==='pcv13').selected,true);
// 云同步 / 合并
assert.equal(VT.normalizeAppState(null),null);
assert.deepEqual(VT.normalizeAppState({children:[],cur:'x'}),{children:[],cur:null});
const A={children:[{id:'c1',name:'a',birth:'2020-01-01',records:[]}],cur:'c1'};
const B={children:[{id:'c2',name:'b',birth:'2021-01-01',records:[]}],cur:'c2'};
assert.ok(VT.isCloudEmpty({children:[],cur:null}));
assert.ok(!VT.isCloudEmpty(A));
assert.ok(!VT.appStatesEqual(A,B));
assert.ok(VT.appStatesEqual(A,{...A,cur:'c1'}));
assert.deepEqual(VT.pickAppState(A,B,'local'),A);
assert.deepEqual(VT.pickAppState(A,B,'cloud'),B);
const fakePayload=Buffer.from(JSON.stringify({sub:'u1',email:'t@e.com',exp:9999999999})).toString('base64url');
const tok='h.'+fakePayload+'.s';
assert.equal(VT.decodeJwtPayload(tok).sub,'u1');
const hash='#access_token='+encodeURIComponent(tok)+'&refresh_token=rr';
assert.equal(VT.parseAuthHash(hash).user.id,'u1');
assert.ok(VT.sessionFromAuthResponse({access_token:tok,refresh_token:'rr',expires_in:3600}).user.email==='t@e.com');
assert.ok(VT.needsTokenRefresh({expires_at:Date.now()+60e3}));
assert.ok(!VT.needsTokenRefresh({expires_at:Date.now()+600e3}));
// 单孩子 profile/records 导入（浔宝样例）
assert.equal(VT.detectImportFormat(xunbao).kind,'single');
const conv=VT.convertSingleChildExport(xunbao);assert.ok(conv.ok);
assert.equal(conv.imported,9);assert.equal(conv.skipped,0);
assert.equal(conv.child.records.length,9);
assert.equal(conv.child.selfPaid.penta,true);assert.equal(conv.child.selfPaid.rv3,true);
const imp=VT.importIntoState({children:[],cur:null},xunbao);assert.ok(imp.ok);
assert.equal(imp.state.children.length,1);assert.equal(imp.state.children[0].records.length,9);
const ch=imp.state.children[0];
let p=VT.seriesPlan(ch,T);
assert.equal(p.find(s=>s.id==='dtap').status,'covered');
assert.equal(p.find(s=>s.id==='polio').status,'covered');
assert.equal(p.find(s=>s.id==='hib').status,'covered');
assert.equal(p.find(s=>s.id==='penta').given,3);
const round=VT.exportSingleChild(ch);
assert.equal(round.profile.id,'baby-f61df079ea8b');
assert.equal(round.profile.addons.includes('pentavalent'),true);
assert.equal(round.profile.addons.includes('rotavirus3'),true);
assert.equal(Object.keys(round.records).length,9);
assert.ok(round.records['penta-1']&&round.records['rota3-3']);
const bad=VT.convertSingleChildExport({profile:{name:'x',birth:'2026-01-01',sex:'boy',id:'t',addons:[]},records:{'not-a-dose-1':{date:'2026-01-02',clinic:'',note:''},'hepb-1':{date:'bad',clinic:'',note:''}}});
assert.equal(bad.imported,0);assert.equal(bad.skipped,2);
assert.equal(VT.importIntoState({children:[],cur:null},[{profile:xunbao.profile,records:xunbao.records}]).state.children.length,1);
console.log('All tests passed');
