// ===== 疫苗程序数据与排程逻辑（可在 Node 与浏览器中共用）=====
(function(root){
const SOURCE='《国家免疫规划疫苗儿童免疫程序及说明（2026年版）》（2026年6月，中国疾病预防控制中心发布）；国家疾控局等《关于国家免疫规划百白破疫苗和白破疫苗免疫程序调整相关工作的通知》（国疾控卫免发〔2024〕20号，2025年1月1日起实施）；原《2021年版》（国卫疾控发〔2021〕10号）。非免疫规划疫苗依据各产品说明书；曼海欣(MCV4)程序见 NMPA 批准说明书（2026年扩龄至6周岁说明，上海 GPO 2026-03-05）及《广东省非免疫规划疫苗接种方案（2026年版）》。';
// age: {m:月,d:天,y:年}; minInt: 与上一剂最小间隔(天); minFrom:{dose:i,days} 与指定剂次最小间隔
const V=[
 {id:'hepb',name:'乙肝疫苗',group:'乙肝',nip:true,doses:[{age:{d:0},label:'第1剂(出生24小时内)'},{age:{m:1},minInt:28,label:'第2剂'},{age:{m:6},minInt:60,minFrom:{dose:0,days:120},label:'第3剂'}],catchup:'未完成全程的<18岁儿童按程序补齐，第1、2剂间隔≥28天，第2、3剂间隔≥60天，第1、3剂间隔≥4个月。'},
 {id:'bcg',name:'卡介苗',group:'结核',nip:true,doses:[{age:{d:0},label:'出生时'}],maxAge:{y:4},catchup:'<3月龄未接种者直接补种；3月龄—3周岁TB-PPD/BCG-PPD等试验阴性者应予补种；≥4周岁不予补种；已接种者即使无卡痕也不再补种。'},
 {id:'polio',name:'脊灰疫苗(IPV×2+bOPV×2)',group:'脊灰',nip:true,doses:[{age:{m:2},label:'第1剂 IPV'},{age:{m:3},minInt:28,label:'第2剂 IPV'},{age:{m:4},minInt:28,label:'第3剂 bOPV'},{age:{y:4},minInt:28,label:'第4剂 bOPV'}],catchup:'<4周岁未满3剂者补齐3剂，≥4周岁未满4剂者补齐4剂；先IPV后bOPV，间隔≥28天；须保证2剂含Ⅱ型脊灰疫苗(IPV)。已完成4剂含IPV成分疫苗者无需bOPV。'},
 {id:'dtap',name:'百白破疫苗(DTaP)',group:'百白破',nip:true,maxAge:{y:7},doses:[{age:{m:2},label:'第1剂'},{age:{m:4},minInt:28,label:'第2剂'},{age:{m:6},minInt:28,label:'第3剂'},{age:{m:18},minInt:182,label:'第4剂'},{age:{y:6},minInt:365,label:'第5剂(6周岁)'}],catchup:'2月龄—6周岁未完成者尽早补种：前3剂间隔≥28天，第4剂与第3剂≥6个月，第5剂与第4剂≥12个月。2025年1月1日前6周岁已接种白破者无需再接种第5剂。7—11周岁改用白破疫苗补种。'},
 {id:'dt',name:'白破疫苗(DT，仅7—11周岁补种)',group:'百白破',nip:true,catchupOnly:true,doses:[{age:{y:7},label:'补种'}],maxAge:{y:12},catchup:'7—11周岁：DTaP累计<3剂者用DT补齐3剂(第2剂与第1剂间隔1—2月，第3剂与第2剂间隔6—12月)；累计≥3剂且6周岁未接种DTaP/DT者补1剂DT。'},
 {id:'mmr',name:'麻腮风疫苗',group:'麻腮风',nip:true,doses:[{age:{m:8},label:'第1剂'},{age:{m:18},minInt:28,label:'第2剂'}],catchup:'<18岁未完成2剂者补齐，间隔≥28天。'},
 {id:'jel',name:'乙脑减毒活疫苗',group:'乙脑',nip:true,alt:'jei',doses:[{age:{m:8},label:'第1剂'},{age:{y:2},minInt:365,label:'第2剂'}],catchup:'用JE-L补种应补齐2剂，间隔≥12个月。(与灭活疫苗二选一)'},
 {id:'jei',name:'乙脑灭活疫苗',group:'乙脑',nip:true,alt:'jel',doses:[{age:{m:8},label:'第1剂'},{age:{m:8},minInt:7,label:'第2剂(与第1剂间隔7-10天)'},{age:{y:2},minInt:30,label:'第3剂'},{age:{y:6},minInt:365*3,label:'第4剂'}],catchup:'用JE-I补种应补齐4剂：第1、2剂间隔7—10天，第2、3剂间隔1—12个月，第3、4剂间隔≥3年。(与减毒活疫苗二选一)'},
 {id:'mpsva',name:'A群流脑多糖疫苗',group:'流脑',nip:true,doses:[{age:{m:6},label:'第1剂'},{age:{m:9},minInt:90,label:'第2剂'}],maxAge:{y:2},catchup:'<24月龄补齐A群2剂，间隔≥3个月；≥24月龄不再补A群，改补A群C群疫苗。'},
 {id:'mpsvac',name:'A群C群流脑多糖疫苗',group:'流脑',nip:true,doses:[{age:{y:3},minPrevSeries:{id:'mpsva',days:365},label:'第1剂(3岁)'},{age:{y:6},minInt:365*3,label:'第2剂(6岁)'}],catchup:'第1剂与A群第2剂间隔≥12个月；两剂AC间隔≥3年。≥24月龄未接种过A群者3周岁前尽早接种AC；仅接种过1剂A群者间隔≥3个月尽早接种AC。'},
 {id:'hepal',name:'甲肝减毒活疫苗',group:'甲肝',nip:true,alt:'hepai',doses:[{age:{m:18},label:'1剂'}],catchup:'<18岁未接种者补1剂。(与灭活疫苗二选一)'},
 {id:'hepai',name:'甲肝灭活疫苗',group:'甲肝',nip:true,alt:'hepal',doses:[{age:{m:18},label:'第1剂'},{age:{y:2},minInt:182,label:'第2剂'}],catchup:'用HepA-I补种应补齐2剂，间隔≥6个月；已接种1剂HepA-I但无条件接种第2剂时，可间隔≥6个月接种1剂HepA-L完成。'},
 {id:'hpv2',name:'双价HPV疫苗(免疫规划)',group:'HPV',nip:true,sexOnly:'F',maxAge:{y:18},doses:[{age:{y:13},label:'第1剂(13周岁)'},{age:{y:13,m:6},minInt:150,label:'第2剂(间隔6个月，最短≥5个月)'}],catchup:'2011年11月10日及以后出生女孩未完成2剂者，应在18周岁前尽早补齐，间隔6个月(最短≥5个月)。已按说明书完成任一HPV疫苗全程者无需再接种。'},
 // 非免疫规划
 {id:'pcv13',name:'13价肺炎球菌结合疫苗',group:'肺炎',nip:false,doses:[{age:{m:2},label:'第1剂'},{age:{m:4},minInt:28,label:'第2剂'},{age:{m:6},minInt:28,label:'第3剂'},{age:{m:12},minInt:56,label:'加强(12-15月龄)'}],perProduct:true,catchup:'起始月龄不同剂次不同，以产品说明书为准。'},
 {id:'ppv23',name:'23价肺炎球菌多糖疫苗',group:'肺炎',nip:false,doses:[{age:{y:2},label:'1剂(≥2岁高危人群)'}],perProduct:true,optional:true},
 {id:'hib',name:'Hib疫苗',group:'Hib',nip:false,doses:[{age:{m:2},label:'第1剂'},{age:{m:3},minInt:28,label:'第2剂'},{age:{m:4},minInt:28,label:'第3剂'},{age:{m:18},minInt:182,label:'加强'}],perProduct:true,catchup:'起始月龄越大剂次越少，以说明书为准。'},
 {id:'rv5',name:'5价轮状病毒疫苗(口服)',group:'轮状',excl:'rota',nip:false,doses:[{age:{w:6},label:'第1剂(6-12周龄)'},{age:{w:10},minInt:28,label:'第2剂'},{age:{w:14},minInt:28,label:'第3剂(32周龄前完成)'}],maxAge:{w:32},perProduct:true},
 {id:'rv3',name:'三价轮状病毒疫苗(口服，兰州所)',group:'轮状',excl:'rota',nip:false,doses:[{age:{w:6},label:'第1剂(6-13周龄开始)'},{age:{w:10},minInt:30,label:'第2剂(间隔1个月)'},{age:{w:14},minInt:30,label:'第3剂(不晚于32周龄)'}],maxAge:{w:32},perProduct:true,catchup:'首剂6-13周龄，间隔1个月，第3剂不晚于32周龄；与5价轮状二选一。'},
 {id:'var',name:'水痘疫苗',group:'水痘',nip:false,doses:[{age:{m:12},label:'第1剂'},{age:{y:4},minInt:90,label:'第2剂'}],perProduct:true},
 {id:'flu',name:'流感疫苗(每年)',group:'流感',nip:false,yearly:true,doses:[{age:{m:6},label:'每年流行季前(首次接种8岁以下需2剂间隔≥4周)'}],perProduct:true},
 {id:'ev71',name:'EV71手足口疫苗',group:'EV71',nip:false,doses:[{age:{m:6},label:'第1剂'},{age:{m:7},minInt:28,label:'第2剂'}],maxAge:{y:6},perProduct:true,catchup:'6月龄-5岁(部分产品至71月龄)，2剂间隔1个月。'},
 {id:'penta',name:'五联疫苗(DTaP-IPV/Hib)',group:'五联',nip:false,covers:{dtap:[0,1,2,3],polio:[0,1,2,3],hib:[0,1,2,3]},doses:[{age:{m:2},label:'第1剂'},{age:{m:3},minInt:28,label:'第2剂'},{age:{m:4},minInt:28,label:'第3剂'},{age:{m:18},minInt:182,label:'加强'}],perProduct:true,note:'接种五联后，对应剂次的百白破、脊灰、Hib可不再接种（第4剂脊灰4岁bOPV请遵医嘱）。'},
 // 曼海欣 Menhycia：ACYW135群脑膜炎球菌多糖结合疫苗(CRM197)。程序依首剂年龄动态计算（见 mcv4Series）；doses 仅用于导入校验/时间轴占位。
 {id:'mcv4',name:'曼海欣(MCV4 ACYW135结合)',group:'流脑',nip:false,perProduct:true,dynamic:true,maxAge:{m:83},
  doses:[{age:{m:3},label:'首剂(≥3月龄)'},{age:{m:4},minInt:28,label:'第2剂'},{age:{m:5},minInt:28,label:'第3剂'},{age:{m:12},minInt:28,label:'12月龄加强(可选)'}],
  catchup:'3–5月龄：3剂间隔≥1月，12月龄可加强1剂；6–23月龄：2剂间隔1–3月(加强未确定)；2–3岁(≤47月龄)/4–6岁(≤83月龄)：各1剂。首剂年龄决定程序，详见说明书。',
  note:'替代免费流脑：完成<24月龄说明书程序→视为完成A群流脑(MPSV-A)；在3周岁、6周岁程序年龄接种含A/C成分→视为完成相应A群C群流脑(MPSV-AC)剂次（《2026年版免疫程序》流脑“其他事项”5–6条）。本工具以36、72月龄近似“3岁/6岁”程序年龄，具体以门诊为准。'},
 {id:'hpv',name:'HPV疫苗(自费，二价/四价/九价)',group:'HPV',nip:false,doses:[{age:{y:9},label:'第1剂'},{age:{y:9,m:6},minInt:180,label:'第2剂(9-14岁女孩2剂程序，视产品)'}],perProduct:true,sexOnly:'F',note:'免疫规划已为13周岁女孩免费提供双价HPV(见上)；自费产品：二价/四价/九价用于女性（9-14岁多为2剂）；男性适应证以最新获批说明书为准。多地已将HPV纳入13-14岁女孩免费接种。'}
];
const DAY=864e5;
function ageInMonths(birth,dateStr){const b=parse(birth),t=parse(dateStr);let m=(t.getUTCFullYear()-b.getUTCFullYear())*12+t.getUTCMonth()-b.getUTCMonth();if(t.getUTCDate()<b.getUTCDate())m--;return m;}
function mcv4BandFromMonths(m){if(m>=3&&m<=5)return'3-5';if(m>=6&&m<=23)return'6-23';if(m>=24&&m<=47)return'2-3y';if(m>=48&&m<=83)return'4-6y';return m<3?'pre':'post';}
function mcv4BandFirst(firstDate,birth){return mcv4BandFromMonths(ageInMonths(birth,firstDate));}
function mcv4Spec(band){
 if(band==='3-5')return{required:3,minInt:28,has12Booster:true,labels:['第1剂(3–5月龄)','第2剂(间隔≥1月)','第3剂(间隔≥1月)'],boosterLabel:'加强(12月龄，说明书可选)'};
 if(band==='6-23')return{required:2,minInt:30,labels:['第1剂(6–23月龄)','第2剂(间隔1–3月)']};
 if(band==='2-3y')return{required:1,labels:['1剂(2–3岁)']};
 if(band==='4-6y')return{required:1,labels:['1剂(4–6岁)']};
 return null;
}
function mcv4Series(child,todayStr){
 const birth=child.birth,today=todayStr||fmt(new Date()),recs=(child.records||[]).filter(r=>r.vid==='mcv4').sort((a,b)=>a.date<b.date?-1:1),n=recs.length,b=parse(birth);
 if(!n){const mo=ageInMonths(birth,today),band=mcv4BandFromMonths(mo),spec=mcv4Spec(band);
  if(mo<3)return{given:0,total:3,status:'future',due:fmt(addAge(b,{m:3})),nextLabel:'首剂(≥3月龄)',band:'pre',required:0,catchupNote:''};
  if(!spec||band==='post')return{given:0,total:0,status:'expired',due:null,nextLabel:'',band:'post',required:0,catchupNote:''};
  const due=fmt(addAge(b,{m:Math.max(3,mo)}));const diff=(parse(due)-parse(today))/DAY;
  const st=diff<0?'overdue':diff<=30?'soon':'future';
  return{given:0,total:spec.required,status:st,due,nextLabel:spec.labels[0],band,required:spec.required,catchupNote:''};}
 const band=mcv4BandFirst(recs[0].date,birth),spec=mcv4Spec(band);
 if(!spec)return{given:n,total:n,status:'done',due:null,nextLabel:'',band,required:n,catchupNote:''};
 if(n>=spec.required){
  if(spec.has12Booster&&n===spec.required){const boosterDue=addAge(b,{m:12});if(parse(today)>=boosterDue){const diff=(boosterDue-parse(today))/DAY;return{given:n,total:spec.required+1,status:diff<0?'overdue':diff<=30?'soon':'future',due:fmt(boosterDue),nextLabel:spec.boosterLabel,band,required:spec.required,catchupNote:'12月龄加强为说明书可选，非免疫规划替代所必需。'};}
   return{given:n,total:spec.required,status:'done',due:null,nextLabel:'',band,required:spec.required,catchupNote:''};}
  return{given:n,total:spec.has12Booster?spec.required+1:spec.required,status:'done',due:null,nextLabel:'',band,required:spec.required,catchupNote:''};}
 const last=parse(recs[n-1].date);let due=addDays(last,spec.minInt),label=spec.labels[n]||('第'+(n+1)+'剂');
 const diff=(due-parse(today))/DAY;let status='future';if(diff<0){status='overdue';due=parse(today)>due?parse(today):due;}else if(diff<=30)status='soon';
 return{given:n,total:spec.required,status,due:fmt(due),nextLabel:label,band,required:spec.required,catchupNote:''};
}
function applyMcv4NationalCoverage(child,coverDates){
 const recs=(child.records||[]).filter(r=>r.vid==='mcv4').sort((a,b)=>a.date<b.date?-1:1);if(!recs.length)return;
 const birth=child.birth,band=mcv4BandFirst(recs[0].date,birth),spec=mcv4Spec(band);if(!spec)return;
 if(['3-5','6-23'].includes(band)&&recs.length>=spec.required&&ageInMonths(birth,recs[recs.length-1].date)<24)
  coverDates.mpsva=[recs[0].date,recs[Math.min(spec.required,recs.length)-1].date];
 recs.forEach(r=>{const mo=ageInMonths(birth,r.date);
  if(mo>=36&&mo<72){coverDates.mpsvac=coverDates.mpsvac||[];if(!coverDates.mpsvac[0])coverDates.mpsvac[0]=r.date;}
  if(mo>=72){coverDates.mpsvac=coverDates.mpsvac||[];coverDates.mpsvac[1]=r.date;}});
}
function applyMcv4Planned(child,planned,done,isSel,todayStr){
 if(!isSel)return;
 const recs=done('mcv4'),mo=ageInMonths(child.birth,todayStr);
 if(!recs.length){if(mo>=3)planned.mpsva={by:'mcv4',byName:'曼海欣(MCV4)',max:1};return;}
 const band=mcv4BandFirst(recs[0].date,child.birth),spec=mcv4Spec(band);
 if(spec&&['3-5','6-23'].includes(band)&&recs.length<spec.required)
  planned.mpsva={by:'mcv4',byName:'曼海欣(MCV4)',max:1};
}
function parse(s){const [y,m,d]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1,d));}
function fmt(d){return d.toISOString().slice(0,10);}
function addAge(b,a){const d=new Date(b);d.setUTCFullYear(d.getUTCFullYear()+(a.y||0));d.setUTCMonth(d.getUTCMonth()+(a.m||0));d.setUTCDate(d.getUTCDate()+(a.d||0)+(a.w||0)*7);return d;}
function addDays(d,n){return new Date(d.getTime()+n*DAY);}
// records: [{vid,dose(0-based),date,batch,note}]
// 自费疫苗是否纳入计划：selfPaid[id]===false 明确取消时不再提醒（已有记录仍计数）；selfPaid[id]===true 或已有接种记录（且未明确取消）视为已选。旧备份无 selfPaid 字段时同样适用。
function isSelected(child,v){if(v.nip)return true;const sp=child.selfPaid||{};if(sp[v.id]===false)return false;return sp[v.id]===true||(child.records||[]).some(r=>r.vid===v.id);}
// covers 通用机制：coverer.covers = {目标疫苗id: [目标剂次下标...]}，coverer 第 i 剂覆盖目标第 covers[t][i] 剂。
function seriesPlan(child,today){
 today=today?parse(today):parse(new Date().toISOString().slice(0,10));
 const birth=parse(child.birth),recs=child.records||[],out=[];
 const done=id=>recs.filter(r=>r.vid===id).sort((a,b)=>a.date<b.date?-1:1);
 const byId=Object.fromEntries(V.map(v=>[v.id,v]));
 const coverDates={},planned={},coverInfo={};
 // 1) 已接种的 coverer 剂次计入目标疫苗（无论现在是否仍选择该 coverer）
 V.forEach(v=>{if(!v.covers)return;done(v.id).forEach((r,i)=>{for(const t in v.covers)if(i<v.covers[t].length)(coverDates[t]=coverDates[t]||[]).push(r.date);});});
 applyMcv4NationalCoverage(child,coverDates);
 const combined=id=>done(id).map(r=>r.date).concat(coverDates[id]||[]).sort();
 // 2) coverer 进度 = 各目标已完成剂次（含单苗+联合苗）在覆盖范围内的最小值；计划覆盖其余剂次
 V.forEach(v=>{if(!v.covers||!isSelected(child,v))return;
  const prog=Math.min(v.doses.length,...Object.keys(v.covers).filter(t=>byId[t].nip||isSelected(child,byId[t])).map(t=>Math.min(combined(t).length,v.covers[t].length)));
  coverInfo[v.id]={prog};
  if(prog<v.doses.length)for(const t of Object.keys(v.covers)){const n=combined(t).length;const slots=v.covers[t].filter(k=>k>=n);if(slots.length)planned[t]={by:v.id,byName:v.name,max:Math.max(...v.covers[t])};}
 });
 applyMcv4Planned(child,planned,done,isSelected(child,byId.mcv4),fmt(today));
 for(const v of V){
  if(v.sexOnly&&child.sex&&child.sex!==v.sexOnly&&v.nip)continue;
  if(v.id==='hpv2'&&child.birth<'2011-11-10')continue;
  const sel=isSelected(child,v);
  if(v.dynamic&&v.id==='mcv4'){
   const ms=mcv4Series(child,fmt(today));let status=sel?ms.status:'unselected',due=sel?ms.due:null,nextLabel=sel?ms.nextLabel:'',catchup=status==='overdue';
   out.push({id:v.id,name:v.name,group:v.group,nip:v.nip,excl:v.excl||null,selected:sel,given:ms.given,total:ms.total,status,due,nextLabel,coveredBy:null,laterDue:null,laterLabel:'',catchupNote:sel?(ms.catchupNote||v.catchup||''):'',perProduct:true,optional:false});
   continue;
  }
  let allDates=combined(v.id);
  // coverer 自身：进度按覆盖目标计算（支持中途切换）
  if(v.covers&&coverInfo[v.id]){const ds=Object.keys(v.covers).flatMap(t=>combined(t)).sort();const p=coverInfo[v.id].prog;allDates=ds.length?Array(p).fill(null).map((_,i)=>ds[ds.length-1]):[];if(p)allDates[p-1]=ds[ds.length-1];}
  let n=allDates.length;
  const rs=done(v.id);
  const altDone=v.alt&&done(v.alt).length>0&&rs.length===0;
  let status,due=null,nextLabel='',catchup=false,coveredBy=null,laterDue=null,laterLabel='';
  if(!sel)status='unselected';
  else if(altDone)status='alt';
  else if(n>=v.doses.length&&!v.yearly)status='done';
  else if(planned[v.id]&&n<=planned[v.id].max){status='covered';coveredBy=planned[v.id].byName;
   const k=planned[v.id].max+1;if(k<v.doses.length){laterDue=fmt(addAge(birth,v.doses[k].age));laterLabel=v.doses[k].label;}}
  else{
   const idx=v.yearly?0:n,d=v.doses[idx];
   due=addAge(birth,d.age);
   if(v.yearly&&n){const last=parse(allDates[n-1]);const nx=addDays(last,365);if(nx>due)due=nx;}
   if(!v.yearly&&n&&d.minInt){const t=addDays(parse(allDates[n-1]),d.minInt);if(t>due)due=t;}
   if(d.minFrom&&allDates[d.minFrom.dose]){const t=addDays(parse(allDates[d.minFrom.dose]),d.minFrom.days);if(t>due)due=t;}
   if(v.id==='mpsvac'&&idx===0){const a=done('mpsva').length,ge24=today>=addAge(birth,{m:24});if(ge24&&a<2){const t=addAge(birth,{m:24});due=a===1?new Date(Math.max(t,addDays(parse(done('mpsva')[0].date),90))):t;}else if(a>=2){const t=addDays(parse(done('mpsva')[a-1].date),365);if(t>due)due=t;}}
   else if(d.minPrevSeries){const p=combined(d.minPrevSeries.id);if(p.length){const t=addDays(parse(p[p.length-1]),d.minPrevSeries.days);if(t>due)due=t;}}
   nextLabel=d.label;
   if(v.maxAge&&today>=addAge(birth,v.maxAge)){status='expired';}
   else{
    const diff=(due-today)/DAY;
    if(diff<0){status='overdue';catchup=true;due=today>due?today:due;}
    else if(diff<=30)status='soon';else status='future';
    if(catchup&&n&&d.minInt){const t=addDays(parse(allDates[n-1]),d.minInt);if(t>due)due=t;}
   }
  }
  if(v.catchupOnly){const dn=combined('dtap').length;const age7=today>=addAge(birth,{y:7});
   if(status!=='done'&&(!age7||dn>=5)){status='alt';due=null;}}
  out.push({id:v.id,name:v.name,group:v.group,nip:v.nip,excl:v.excl||null,selected:sel,given:Math.min(n,v.doses.length),total:v.doses.length,status,due:due?fmt(due):null,nextLabel,coveredBy,laterDue,laterLabel,catchupNote:v.catchup||'',perProduct:!!v.perProduct,optional:!v.nip});
 }
 return out;
}
function statusOf(d,today){const diff=(parse(d)-today)/DAY;return diff<0?'overdue':diff<=30?'soon':'future';}
function upcoming(child,today){const T=today?parse(today):parse(new Date().toISOString().slice(0,10));const L=[];
 seriesPlan(child,today).forEach(s=>{if(s.due&&['overdue','soon','future'].includes(s.status))L.push(s);
  else if(s.status==='covered'&&s.laterDue)L.push({...s,status:statusOf(s.laterDue,T),due:s.laterDue<fmt(T)?fmt(T):s.laterDue,nextLabel:s.laterLabel,later:true});});
 return L.sort((a,b)=>a.due<b.due?-1:1);}
function timeline(child){const b=parse(child.birth),items=[];for(const v of V){if(v.catchupOnly||(v.sexOnly&&child.sex&&child.sex!==v.sexOnly&&v.nip))continue;v.doses.forEach((d,i)=>items.push({vid:v.id,dose:i,name:v.name,label:d.label,nip:v.nip,date:fmt(addAge(b,d.age)),age:d.age}));}return items.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(b.nip-a.nip));}
function ics(child,today){const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//vaccine-tracker//CN','CALSCALE:GREGORIAN'];upcoming(child,today).forEach((s,i)=>{const d=s.due.replace(/-/g,'');L.push('BEGIN:VEVENT','UID:'+child.id+'-'+s.id+'-'+d+'@vt','DTSTAMP:'+d+'T000000Z','DTSTART;VALUE=DATE:'+d,'SUMMARY:'+child.name+' 接种 '+s.name+' '+s.nextLabel,'DESCRIPTION:仅供参考，请以接种门诊安排为准','BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY','DESCRIPTION:疫苗接种提醒','END:VALARM','END:VEVENT');});L.push('END:VCALENDAR');return L.join('\r\n');}
function ageText(birth,today){const b=parse(birth),t=today?parse(today):new Date();let m=(t.getUTCFullYear()-b.getUTCFullYear())*12+t.getUTCMonth()-b.getUTCMonth();if(t.getUTCDate()<b.getUTCDate())m--;if(m<1)return Math.floor((t-b)/DAY)+'天';return m<24?m+'月龄':Math.floor(m/12)+'岁'+(m%12?m%12+'个月':'');}
// ===== 云同步（Supabase REST，无 supabase-js）=====
const SUPABASE_URL='https://hdvcfesguugxfapurfif.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkdmNmZXNndXVneGZhcHVyZmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3ODE2NjUsImV4cCI6MjEwNzM1NzY2NX0.AjU474X2k3uzUdA8VkNvqfNC5qsiRopYh_rC7rVamY8';
function b64urlDecodeJson(seg){
 const pad='='.repeat((4-seg.length%4)%4),b64=(seg+pad).replace(/-/g,'+').replace(/_/g,'/');
 const raw=typeof Buffer!=='undefined'?Buffer.from(b64,'base64').toString('utf8'):(typeof atob!=='undefined'?atob(b64):'');
 return raw?JSON.parse(raw):null;
}
function decodeJwtPayload(token){const p=String(token||'').split('.');return p.length>=2?b64urlDecodeJson(p[1]):null;}
function normalizeAppState(d){
 if(!d||typeof d!=='object'||!Array.isArray(d.children))return null;
 const cur=d.cur!=null&&d.children.some(c=>c&&c.id===d.cur)?d.cur:(d.children[0]?.id??null);
 return JSON.parse(JSON.stringify({children:d.children,cur}));
}
function appStateFingerprint(d){const n=normalizeAppState(d);return n?JSON.stringify(n):'';}
function appStatesEqual(a,b){return appStateFingerprint(a)===appStateFingerprint(b);}
function isCloudEmpty(state){const n=normalizeAppState(state);return!n||!n.children.length;}
function pickAppState(local,cloud,choice){
 const L=normalizeAppState(local),C=normalizeAppState(cloud);
 if(choice==='cloud'&&C)return C;if(choice==='local'&&L)return L;
 return L||C||{children:[],cur:null};
}
function parseAuthHash(hash){
 const q=String(hash||'').replace(/^#/,'');
 if(!q)return null;
 const p=new URLSearchParams(q),access=p.get('access_token'),refresh=p.get('refresh_token');
 if(!access)return null;
 const pl=decodeJwtPayload(access)||{};
 return{access_token:access,refresh_token:refresh||'',expires_at:(pl.exp||0)*1e3,user:{id:pl.sub,email:pl.email||''}};
}
function sessionFromAuthResponse(body){
 if(!body||!body.access_token)return null;
 const pl=decodeJwtPayload(body.access_token)||{};
 return{access_token:body.access_token,refresh_token:body.refresh_token||'',expires_at:Date.now()+(body.expires_in||3600)*1e3,user:{id:pl.sub||body.user?.id,email:pl.email||body.user?.email||''}};
}
function needsTokenRefresh(sess,skewMs=120e3){return!sess||!sess.expires_at||Date.now()>=sess.expires_at-skewMs;}
// ===== 导入 / 导出（完整备份 + 单孩子 profile/records 格式）=====
const ADDON_IMPORT={pentavalent:'penta',rotavirus3:'rv3',rotavirus5:'rv5',mcv4:'mcv4',menhycia:'mcv4'};
const ADDON_EXPORT={penta:'pentavalent',rv3:'rotavirus3',rv5:'rotavirus5',mcv4:'mcv4'};
const DOSE_SLUG_IMPORT={rota3:'rv3',rota5:'rv5',pentavalent:'penta',menhycia:'mcv4'};
const DOSE_SLUG_EXPORT={rv3:'rota3',rv5:'rota5'};
function exportDoseSlug(vid){return DOSE_SLUG_EXPORT[vid]||vid;}
function importDoseSlug(slug){return DOSE_SLUG_IMPORT[slug]||slug;}
function normalizeImportSex(s){const x=String(s||'').toLowerCase();if(x==='f'||x==='girl'||x==='女')return 'F';return 'M';}
function exportProfileSex(sex){return sex==='F'?'girl':'boy';}
function isValidRecordDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return false;try{return fmt(parse(s))===s}catch(e){return false}}
function vaccineById(vid){return V.find(x=>x.id===vid);}
function parseDoseKey(key){
 const m=String(key||'').match(/^(.+)-(\d+)$/);if(!m)return null;
 const vid=importDoseSlug(m[1]),n=+m[2],v=vaccineById(vid);
 if(!v||!Number.isInteger(n)||n<1||n>v.doses.length)return{ok:false,key,reason:'unknown_dose'};
 return{ok:true,vid,doseIndex:n-1,key};
}
function convertSingleChildExport(raw){
 if(!raw||typeof raw!=='object'||!raw.profile||typeof raw.records!=='object')return{ok:false,error:'not_single'};
 const p=raw.profile;if(!p.birth||!isValidRecordDate(p.birth))return{ok:false,error:'bad_profile'};
 const child={id:p.id||('c'+Date.now()),name:p.name||'未命名',birth:p.birth,sex:normalizeImportSex(p.sex),records:[],selfPaid:{}};
 if(p.je||p.hepa)child.meta={je:p.je,hepa:p.hepa};
 let imported=0,skipped=0;const warnings=[];
 (Array.isArray(p.addons)?p.addons:[]).forEach(a=>{const vid=ADDON_IMPORT[a];if(vid&&vaccineById(vid))child.selfPaid[vid]=true;else warnings.push('未知自费项：'+a);});
 for(const [key,rec] of Object.entries(raw.records||{})){
  const d=parseDoseKey(key);if(!d||!d.ok){skipped++;warnings.push('跳过未知剂次：'+key);continue}
  const date=rec&&rec.date;if(!isValidRecordDate(date)){skipped++;warnings.push('跳过无效日期：'+key);continue}
  child.records.push({vid:d.vid,date,batch:String(rec.clinic||rec.batch||''),note:String(rec.note||'')});
  imported++;const v=vaccineById(d.vid);if(v&&!v.nip)child.selfPaid[d.vid]=true;
 }
 return{ok:true,child,imported,skipped,warnings};
}
function exportSingleChild(child){
 const sp=child.selfPaid||{},addons=[];
 Object.keys(ADDON_EXPORT).forEach(vid=>{if(sp[vid]===true)addons.push(ADDON_EXPORT[vid]);});
 const meta=child.meta||{};
 const profile={name:child.name,birth:child.birth,sex:exportProfileSex(child.sex),je:meta.je||'live',hepa:meta.hepa||'live',id:child.id,addons:[...new Set(addons)]};
 const records={};const byVid={};
 (child.records||[]).forEach(r=>{(byVid[r.vid]=byVid[r.vid]||[]).push(r);});
 Object.keys(byVid).forEach(vid=>{byVid[vid].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  byVid[vid].forEach((r,i)=>{records[exportDoseSlug(vid)+'-'+(i+1)]={date:r.date,clinic:r.batch||'',note:r.note||''};});});
 return{profile,records,exportedAt:new Date().toISOString()};
}
function detectImportFormat(raw){
 if(Array.isArray(raw))return{kind:'array',items:raw};
 if(raw&&typeof raw==='object'&&Array.isArray(raw.children))return{kind:'full',raw};
 if(raw&&typeof raw==='object'&&raw.profile&&raw.records&&typeof raw.records==='object')return{kind:'single',raw};
 return{kind:'unknown'};
}
function mergeChildRecords(existing,incoming,mode){
 if(mode==='replace')return JSON.parse(JSON.stringify({...incoming,id:existing.id}));
 const recs=(existing.records||[]).slice();
 (incoming.records||[]).forEach(r=>{if(!recs.some(x=>x.vid===r.vid&&x.date===r.date))recs.push({...r});});
 recs.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
 const selfPaid={...(existing.selfPaid||{}),...(incoming.selfPaid||{})};
 return{...existing,name:incoming.name||existing.name,birth:incoming.birth||existing.birth,sex:incoming.sex||existing.sex,records:recs,selfPaid,meta:incoming.meta||existing.meta};
}
function importIntoState(state,raw,onConflict){
 const fmt0=detectImportFormat(raw);let st=normalizeAppState(state)||{children:[],cur:null};
 let totalImported=0,totalSkipped=0,warnings=[],added=0,updated=0;
 if(fmt0.kind==='full'){const n=normalizeAppState(fmt0.raw);if(!n)return{ok:false,error:'bad_full'};
  return{ok:true,state:n,cur:n.cur,message:'已导入完整备份（'+n.children.length+' 个孩子）',imported:0,skipped:0,warnings:[]};}
 if(fmt0.kind==='unknown')return{ok:false,error:'unknown_format'};
 const items=fmt0.kind==='array'?fmt0.items:[fmt0.raw];
 const children=st.children.slice();
 for(const item of items){
  const conv=convertSingleChildExport(item);if(!conv.ok)return{ok:false,error:conv.error||'bad_single'};
  totalImported+=conv.imported;totalSkipped+=conv.skipped;warnings=warnings.concat(conv.warnings);
  const idx=children.findIndex(c=>c.id===conv.child.id);
  if(idx>=0){
   let mode='merge';if(typeof onConflict==='function')mode=onConflict(children[idx],conv.child)||'merge';
   if(mode==='skip')continue;
   children[idx]=mergeChildRecords(children[idx],conv.child,mode);updated++;st.cur=children[idx].id;
  }else{children.push(conv.child);added++;st.cur=conv.child.id;}
 }
 st={children,cur:st.cur||(children[0]?.id??null)};
 let message='已导入 '+totalImported+' 条接种记录';
 if(totalSkipped)message+='，跳过 '+totalSkipped+' 条';
 if(added&&updated)message+='（新增 '+added+' 人，更新 '+updated+' 人）';else if(added)message+='（新增 '+added+' 个孩子）';else if(updated)message+='（已更新 '+updated+' 个孩子）';
 return{ok:true,state:st,cur:st.cur,message,warnings,imported:totalImported,skipped:totalSkipped};
}
const API={isSelected,VACCINES:V,SOURCE,seriesPlan,upcoming,timeline,ics,ageText,addAge,parse,fmt,
 SUPABASE_URL,SUPABASE_ANON_KEY,b64urlDecodeJson,decodeJwtPayload,normalizeAppState,appStateFingerprint,appStatesEqual,isCloudEmpty,pickAppState,parseAuthHash,sessionFromAuthResponse,needsTokenRefresh,
 ADDON_IMPORT,ADDON_EXPORT,convertSingleChildExport,exportSingleChild,detectImportFormat,mergeChildRecords,importIntoState,isValidRecordDate,parseDoseKey,
 ageInMonths,mcv4BandFromMonths,mcv4BandFirst,mcv4Spec,mcv4Series,applyMcv4NationalCoverage};
if(typeof module!=='undefined')module.exports=API;else root.VT=API;
})(this);
