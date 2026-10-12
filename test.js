const VT=require('./schedule.js'),assert=require('assert');const T='2026-10-12';
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
console.log('All tests passed');
