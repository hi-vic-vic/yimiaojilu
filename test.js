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
{const plan=VT.seriesPlan(ch,T);
assert.equal(plan.find(s=>s.id==='dtap').status,'covered');
assert.equal(plan.find(s=>s.id==='polio').status,'covered');
assert.equal(plan.find(s=>s.id==='hib').given,3);
assert.equal(plan.find(s=>s.id==='penta').given,3);}
const round=VT.exportSingleChild(ch);
assert.equal(round.profile.id,'baby-f61df079ea8b');
assert.equal(round.profile.addons.includes('pentavalent'),true);
assert.equal(round.profile.addons.includes('rotavirus3'),true);
assert.equal(Object.keys(round.records).length,9);
assert.ok(round.records['penta-1']&&round.records['rota3-3']);
const bad=VT.convertSingleChildExport({profile:{name:'x',birth:'2026-01-01',sex:'boy',id:'t',addons:[]},records:{'not-a-dose-1':{date:'2026-01-02',clinic:'',note:''},'hepb-1':{date:'bad',clinic:'',note:''}}});
assert.equal(bad.imported,0);assert.equal(bad.skipped,2);
assert.equal(VT.importIntoState({children:[],cur:null},[{profile:xunbao.profile,records:xunbao.records}]).state.children.length,1);
// 曼海欣 MCV4：5月龄首剂(3–5月龄程序) + 替代 A群流脑
(()=>{const birth='2026-05-11',c={birth,records:[],selfPaid:{mcv4:true}};
 let plan=VT.seriesPlan(c,T);assert.equal(plan.find(s=>s.id==='mcv4').status,'overdue');
 assert.equal(plan.find(s=>s.id==='mpsva').status,'covered');
 c.records=[{vid:'mcv4',date:'2026-10-11'},{vid:'mcv4',date:'2026-11-11'},{vid:'mcv4',date:'2026-12-11'}];
 plan=VT.seriesPlan(c,T);assert.equal(plan.find(s=>s.id==='mcv4').status,'done');
 assert.equal(plan.find(s=>s.id==='mpsva').status,'done');assert.equal(plan.find(s=>s.id==='mpsva').given,2);})();
// 6–23月龄程序：2剂
(()=>{const c={birth:'2025-04-01',records:[{vid:'mcv4',date:'2025-12-01'}],selfPaid:{mcv4:true}};
 const plan=VT.seriesPlan(c,'2026-01-15');assert.equal(plan.find(s=>s.id==='mcv4').given,1);assert.equal(plan.find(s=>s.id==='mcv4').total,2);
 assert.equal(plan.find(s=>s.id==='mcv4').nextLabel,'第2剂(间隔1–3月)');})();
// 3岁程序年龄接种 → 覆盖 AC 第1剂；6岁仍待接种
(()=>{const c={birth:'2022-06-01',records:[{vid:'mcv4',date:'2025-06-15'}],selfPaid:{mcv4:true}};
 const plan=VT.seriesPlan(c,'2026-10-12');assert.equal(plan.find(s=>s.id==='mpsvac').given,1);
 assert.ok(['future','soon','overdue'].includes(plan.find(s=>s.id==='mpsvac').status));})();
assert.ok(VT.ADDON_IMPORT.mcv4==='mcv4');
assert.ok(VT.parseDoseKey('mcv4-1').ok&&VT.parseDoseKey('mcv4-1').vid==='mcv4');
// 自费疫苗目录与 selfPaid 迁移
assert.ok(VT.selfPaidCatalog({birth:'2026-01-01',sex:'M'}).some(v=>v.id==='mcv4'));
assert.ok(!VT.selfPaidCatalog({birth:'2026-01-01',sex:'M'}).some(v=>v.id==='hpv'));
const mig={birth:'2026-01-01',records:[{vid:'rv3',date:'2026-03-01'}],selfPaid:{rv3:true,rv5:true}};
VT.normalizeChildSelfPaid(mig);assert.equal(mig.selfPaid.rv5,false);assert.equal(mig.selfPaid.rv3,true);
assert.deepEqual(VT.normalizeAppState({children:[{id:'1',birth:'2026-01-01',records:[{vid:'penta',date:'2026-04-01'}],selfPaid:{}}],cur:'1'}).children[0].selfPaid.penta,true);
console.log('All tests passed');
// 婴儿期曼海欣：替代A群2剂，不替代3岁/6岁AC，但给出说明
(()=>{const c={birth:'2026-05-11',records:[{vid:'mcv4',date:'2026-09-15'}]};const p=VT.seriesPlan(c,'2026-11-05');
 assert.equal(g(p,'mpsva').status,'covered');assert.equal(g(p,'mpsvac').due,'2029-05-11');assert.ok(/不替代3岁/.test(g(p,'mpsvac').mcv4Note));
 assert.ok(!VT.upcoming(c,'2026-11-05').some(s=>s.id==='mpsva'));
 const c2={birth:'2022-06-01',records:[{vid:'mcv4',date:'2025-06-15'}]};assert.equal(g(VT.seriesPlan(c2,'2026-01-15'),'mpsvac').mcv4Note,'');})();
console.log('mcv4 note ok');
// 流感：首季2剂间隔≥4周，之后每季1剂
(()=>{const b='2026-05-11',f=(recs,t)=>g(VT.seriesPlan({birth:b,records:recs,selfPaid:{flu:true}},t),'flu');
 let s=f([],'2026-11-05');assert.equal(s.due,'2026-11-11');assert.equal(s.total,2);assert.equal(s.status,'soon');
 assert.equal(g(VT.seriesPlan({birth:b,records:[]},'2026-11-05'),'flu').status,'unselected');
 s=g(VT.seriesPlan({birth:b,records:[{vid:'flu',date:'2026-11-11'}]},'2026-11-12'),'flu');assert.equal(s.given,1);assert.equal(s.due,'2026-12-09');
 s=f([{vid:'flu',date:'2026-11-11'},{vid:'flu',date:'2026-12-09'}],'2026-12-10');assert.equal(s.due,'2027-09-01');assert.equal(s.given,2);
 s=f([{vid:'flu',date:'2026-11-11'},{vid:'flu',date:'2026-12-09'}],'2027-09-15');assert.equal(s.total,1);assert.equal(s.given,0);assert.equal(s.due,'2027-09-15');
 s=f([{vid:'flu',date:'2026-11-11'},{vid:'flu',date:'2026-12-09'},{vid:'flu',date:'2027-09-20'}],'2027-10-01');assert.equal(s.due,'2028-09-01');
 assert.ok(VT.parseDoseKey('flu-3').ok);
 assert.ok(VT.upcoming({birth:b,records:[],selfPaid:{flu:true}},'2026-11-05').some(x=>x.id==='flu'));
 // 模拟：2026-11-11 只记录第1剂。12-09 是最早日期，不是预约，也不会写成 12-11。
 const sim={id:'sim-flu',name:'模拟',birth:b,sex:'M',records:[{vid:'flu',date:'2026-11-11'}],selfPaid:{}};
 s=g(VT.seriesPlan(sim,'2026-11-11'),'flu');
 assert.equal(s.given,1);assert.equal(s.total,2);assert.equal(s.due,'2026-12-09');assert.equal(s.dueKind,'earliest');assert.equal(s.seasonDone,false);
 assert.deepEqual(sim.records.map(r=>r.date),['2026-11-11']);
 assert.equal(VT.validateFluRecord(sim,'2026-11-11').ok,false);
 const tooSoon=VT.validateFluRecord(sim,'2026-12-08');assert.equal(tooSoon.ok,false);assert.equal(tooSoon.minDate,'2026-12-09');
 const planned=VT.validateFluRecord(sim,'2026-12-11');assert.equal(planned.ok,true);assert.equal(planned.dose,2);assert.equal(planned.earliest,'2026-12-09');
 const dose1=VT.validateFluRecord({birth:b,records:[]},'2026-11-11');assert.equal(dose1.ok,true);assert.equal(dose1.label,'本季第1剂');
 const described=VT.describeFluDose(sim,'2026-12-11');assert.equal(described.ok,true);assert.ok(described.hint.includes('不是预约'));
 const opened=VT.describeFluDose(sim,'',null,'2026-11-12');assert.match(opened.label,/第2剂/);assert.match(opened.hint,/2026-12-09/);assert.match(opened.hint,/不是预约/);assert.equal(opened.ok,false);
 const ics1=VT.ics(sim,'2026-11-12');
 assert.ok(!ics1.includes('流感'));assert.ok(!ics1.includes('DTSTART;VALUE=DATE:20261209'));assert.ok(!ics1.includes('20261211'));
 const tl1=VT.timeline(sim,'2026-11-12').filter(x=>x.vid==='flu');
 assert.ok(tl1.some(x=>x.done&&x.date==='2026-11-11'&&x.label==='本季第1剂'));
 assert.ok(tl1.some(x=>!x.done&&x.dueKind==='earliest'&&x.date==='2026-12-09'&&x.appointment===false));
 assert.ok(!tl1.some(x=>x.date==='2026-12-11'));
 const off={birth:b,records:[{vid:'flu',date:'2026-11-11'}],selfPaid:{flu:false}};
 assert.equal(g(VT.seriesPlan(off,'2026-11-12'),'flu').status,'unselected');
 assert.ok(!VT.upcoming(off,'2026-11-12').some(x=>x.id==='flu'));
 assert.equal(VT.fluSeries(off,'2026-11-12').due,'2026-12-09');
 assert.equal(VT.validateFluRecord(off,'2026-12-11').ok,true);
 const both={id:'sim-flu',name:'模拟',birth:b,sex:'M',records:[{vid:'flu',date:'2026-11-11'},{vid:'flu',date:'2026-12-11'}],selfPaid:{flu:true}};
 s=g(VT.seriesPlan(both,'2026-12-12'),'flu');assert.equal(s.given,2);assert.equal(s.due,'2027-09-01');assert.equal(s.dueKind,'season');assert.equal(s.seasonDone,true);
 const ics2=VT.ics(both,'2026-12-12');
 const fluEv=ics2.split('BEGIN:VEVENT').map(x=>x.split('END:VEVENT')[0]).find(x=>x.includes('流感'))||'';
 assert.ok(fluEv.includes('20270901'));assert.ok(fluEv.includes('不是门诊预约'));assert.ok(!fluEv.includes('VALARM'));
 assert.ok(!ics2.includes('20261209'));
 assert.equal(VT.fluHistoryLabels(both)[0],'本季第1剂');assert.equal(VT.fluHistoryLabels(both)[1],'本季第2剂');
 assert.equal(VT.validateFluRecord(both,'2026-11-12',0).ok,true);
 assert.equal(VT.validateFluRecord(both,'2026-12-20',0).ok,false);
 const edited={...both,records:both.records.slice(0,1)};
 assert.equal(g(VT.seriesPlan(edited,'2026-12-12'),'flu').given,1);
 const exp=VT.exportSingleChild(both);
 assert.ok(exp.profile.addons.includes('flu'));
 assert.equal(exp.records['flu-1'].date,'2026-11-11');assert.equal(exp.records['flu-2'].date,'2026-12-11');
 const back=VT.convertSingleChildExport(exp);assert.equal(back.child.selfPaid.flu,true);assert.equal(back.child.records.length,2);
 const expSel=VT.exportSingleChild({id:'t',name:'模拟',birth:b,sex:'M',records:[],selfPaid:{flu:true}});
 assert.ok(expSel.profile.addons.includes('flu'));
 const backSel=VT.convertSingleChildExport(expSel);assert.equal(backSel.child.selfPaid.flu,true);assert.equal(backSel.child.records.length,0);
 const imp=VT.importIntoState({children:[],cur:null},exp);assert.equal(imp.state.children[0].records.length,2);
 s=g(VT.seriesPlan({birth:'2017-01-01',records:[],selfPaid:{flu:true}},'2026-11-11'),'flu');assert.equal(s.total,1);
 s=g(VT.seriesPlan({birth:'2018-05-11',records:[],selfPaid:{flu:true}},'2026-11-11'),'flu');assert.equal(s.total,2);
})();
console.log('flu ok');
// 孩子头像：裁成正方形的 JPEG data URL，放在 profile 里，旧档案没有该字段也能导入
const JPEG_A='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const JPEG_B='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';
assert.equal(VT.AVATAR_SIZE,256);
assert.ok(VT.AVATAR_MAX_BYTES<=30*1024);
assert.equal(VT.avatarInitial('浔宝'),'浔');
assert.equal(VT.avatarInitial(' Alice'),'A');
assert.equal(VT.avatarInitial('  '),'孩');
assert.deepEqual(VT.avatarCrop(400,200),{sx:100,sy:0,sw:200,sh:200,dw:256,dh:256});
assert.deepEqual(VT.avatarCrop(100,301),{sx:0,sy:100,sw:100,sh:100,dw:256,dh:256});
assert.equal(VT.avatarCrop(0,40),null);
assert.ok(VT.avatarByteLength(JPEG_A)>0&&VT.avatarByteLength(JPEG_A)<=VT.AVATAR_MAX_BYTES);
assert.equal(VT.normalizeAvatar(JPEG_A),JPEG_A);
assert.equal(VT.normalizeAvatar(''),'');
assert.equal(VT.normalizeAvatar('data:image/png;base64,aaaa'),'');
assert.equal(VT.normalizeAvatar(JPEG_A.replace('base64,','base64,')+'@@@'),'');
assert.equal(VT.normalizeAvatar('data:image/jpeg;base64,'+'A'.repeat(50000)),'');
const photoChild={id:'baby-photo',name:'浔宝',birth:'2026-05-11',sex:'M',records:[],selfPaid:{},avatar:JPEG_A};
const exported=VT.exportSingleChild(photoChild);
assert.equal(exported.profile.avatar,JPEG_A);
const restored=VT.convertSingleChildExport(exported);
assert.equal(restored.ok,true);assert.equal(restored.child.avatar,JPEG_A);
assert.equal(Object.hasOwn(VT.exportSingleChild({id:'t',name:'无',birth:'2026-05-11',sex:'F',records:[],selfPaid:{}}).profile,'avatar'),false);
const legacyImp=VT.convertSingleChildExport(xunbao);
assert.equal(legacyImp.ok,true);assert.equal(legacyImp.child.avatar,undefined);
assert.equal(VT.importIntoState({children:[],cur:null},xunbao).state.children[0].avatar,undefined);
const kept=VT.importIntoState({children:[{...legacyImp.child,avatar:JPEG_A}],cur:legacyImp.child.id},xunbao,()=>'merge');
assert.equal(kept.state.children[0].avatar,JPEG_A);
assert.equal(kept.state.children[0].records.length,legacyImp.child.records.length);
const replaced=VT.importIntoState({children:[{...legacyImp.child,avatar:JPEG_A}],cur:legacyImp.child.id},{profile:{...xunbao.profile,avatar:JPEG_B},records:xunbao.records},()=>'replace');
assert.equal(replaced.state.children[0].avatar,JPEG_B);
const cleared=VT.importIntoState({children:[{...legacyImp.child,avatar:JPEG_A}],cur:legacyImp.child.id},xunbao,()=>'replace');
assert.equal(cleared.state.children[0].avatar,undefined);
const badPhoto=VT.convertSingleChildExport({profile:{name:'坏',birth:'2026-01-01',sex:'boy',id:'bad',addons:[],avatar:'not-a-photo'},records:{}});
assert.equal(badPhoto.ok,true);assert.equal(badPhoto.child.avatar,undefined);
const full=VT.normalizeAppState({children:[{id:'c1',name:'a',birth:'2020-01-01',records:[],avatar:JPEG_B}],cur:'c1'});
assert.equal(full.children[0].avatar,JPEG_B);
const stripped=VT.normalizeAppState({children:[{id:'c1',name:'a',birth:'2020-01-01',records:[],avatar:'data:image/png;base64,xx'}],cur:'c1'});
assert.equal(stripped.children[0].avatar,undefined);
const planBare=VT.seriesPlan({birth:'2026-10-10',records:[]},T);
const planPhoto=VT.seriesPlan({birth:'2026-10-10',records:[],avatar:JPEG_A},T);
assert.deepEqual(planPhoto.map(s=>[s.id,s.status,s.due]),planBare.map(s=>[s.id,s.status,s.due]));
console.log('avatar ok');
