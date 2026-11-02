/* ===== Service KPI Performance Hub – application =====
   Filters, KPI formulas, the 4 pages, charts, Excel export and local saving of the uploaded data. */
(function(){'use strict';

/* ---------- KPI definitions ----------
   n = numerator counter(s), d = denominator counter (see the counter table at the top of core.js).
   unit = what the denominator counts, when it is not "cases".                                    */
var KPIS=[
 {id:'rr', name:'RR %',                     n:2,      d:1,  col:'#1565e0'},
 {id:'rt', name:'RT %',                     n:4,      d:3,  col:'#f57c1f'},
 {id:'rdf',name:'RDF %',                    n:6,      d:5,  col:'#14935a'},
 {id:'fwp',name:'FVF With Parts %',         n:10,     d:9,  col:'#8e3fd9'},
 {id:'fnp',name:'FVF Without Parts %',      n:12,     d:11, col:'#1aa3e8'},
 {id:'sp', name:'Service Plan Available Before First Visit %',short:'Service Plan %',n:14,d:13,col:'#f2b705'},
 {id:'ftr',name:'FTR PA %',                 n:8,      d:7,  col:'#0b1f6b'},
 {id:'nt2',name:'Not Touched by T2 %',      n:15,     d:0,  col:'#e84393'},
 {id:'fvx',name:'First Visit Fix %',        n:[10,12],d:13, col:'#e53935'},
 {id:'mvx',name:'Multi Visit Fix %',        n:17,     d:13, col:'#7d7d7d'},
 {id:'pm', name:'Parts Match Success %',short:'Parts Match %',n:19,d:18,col:'#00897b',unit:'advised parts'}];

/* Which direction is good: 1 = higher is better, -1 = lower is better, 0 = no direction (shown as Rising / Falling) */
var DIR={rr:1,rt:1,rdf:1,fwp:1,fnp:1,sp:1,ftr:1,fvx:1,mvx:-1,nt2:-1,pm:1};

var NC=KPI_CORE.NC,OFF=6,MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var state={primary:null,markets:{},cmp:'',page:'p1',pt:'ytd',
 sel1:KPIS.map(function(k){return k.id}),sel2:['rdf'],sel3:KPIS.map(function(k){return k.id})};
var charts={},F={y:'',q:'',m:'',w:'',reg:'',rse:[],mod:'',ct:''};   /* current filter values */

/* ---------- small helpers ---------- */
function $(id){return document.getElementById(id)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function toast(m){var t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(toast._t);toast._t=setTimeout(function(){t.style.display='none'},6000)}
function pct(n,d){return d>0?n/d*100:null}
function fmt(v){return v===null||v===undefined||!isFinite(v)?'—':v.toFixed(2)+'%'}
function fmt1(v){return v===null||v===undefined||!isFinite(v)?'—':v.toFixed(1)+'%'}
function short(k){return k.short||k.name}
function U(y,m,d){return Date.UTC(y,m,d)/864e5}
/* date parts for a day number: year, quarter, month, ISO week (Mon–Sun) */
function dinfo(day){var dt=new Date(day*864e5),y=dt.getUTCFullYear(),m=dt.getUTCMonth(),wd=(dt.getUTCDay()+6)%7,th=day-wd+3,ty=new Date(th*864e5).getUTCFullYear(),wk=Math.floor((th-U(ty,0,1))/7)+1;
 return{y:y,q:Math.floor(m/3)+1,m:m,ym:y*100+m+1,wkey:ty*100+wk,wk:wk,wstart:day-wd};}
function prep(ds){if(!ds||ds._p)return ds;var c={};ds.rows.forEach(function(r){r._i=c[r[0]]||(c[r[0]]=dinfo(r[0]))});ds._p=true;return ds}

/* ---------- saving data in the browser (IndexedDB) ---------- */
var DB=null;
function openDB(){return new Promise(function(res){try{var rq=indexedDB.open('namKpiTracker',3);rq.onupgradeneeded=function(){if(!rq.result.objectStoreNames.contains('kv'))rq.result.createObjectStore('kv')};rq.onsuccess=function(){DB=rq.result;res()};rq.onerror=function(){res()};rq.onblocked=function(){res()}}catch(e){res()}})}
function dbGet(k){return new Promise(function(res){if(!DB)return res(null);try{var rq=DB.transaction('kv').objectStore('kv').get(k);rq.onsuccess=function(){res(rq.result||null)};rq.onerror=function(){res(null)}}catch(e){res(null)}})}
function dbPut(k,v){return new Promise(function(res){if(!DB)return res(false);try{var tx=DB.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=function(){res(true)};tx.onerror=function(){res(false)}}catch(e){res(false)}})}
function strip(ds){return{v:ds.v,name:ds.name,market:ds.market,dims:ds.dims,rows:ds.rows.map(function(r){return r.slice(0,OFF+NC)}),rowsUsed:ds.rowsUsed,maxDay:ds.maxDay,loadedAt:ds.loadedAt,file:ds.file}}

/* ---------- filters ---------- */
/* Period selected by Year / Quarter / Month / Week. YTD starts the period on 1 Jan. Returns [firstDay, lastDay] or null (= all data). */
function range(){if(!F.y)return null;var y=+F.y,lo,hi;
 if(F.w){var wk=+F.w,ty=Math.floor(wk/100),n=wk%100,j4=U(ty,0,4),wd=(new Date(j4*864e5).getUTCDay()+6)%7,s=j4-wd+(n-1)*7;lo=s;hi=s+6;}
 else if(F.m){var m=(+F.m%100)-1;lo=U(y,m,1);hi=U(y,m+1,1)-1;}
 else if(F.q){var q=+F.q;lo=U(y,(q-1)*3,1);hi=U(y,q*3,1)-1;}
 else{lo=U(y,0,1);hi=U(y+1,0,1)-1;}
 if(state.pt==='ytd')lo=U(y,0,1);return[lo,hi];}
function dimPass(r,ds,skipReg){
 if(!skipReg&&F.reg&&ds.dims.region[r[1]]!==F.reg)return false;
 if(F.mod&&ds.dims.mod[r[3]]!==F.mod)return false;
 if(F.ct&&ds.dims.ctype[r[2]]!==F.ct)return false;
 if(F.rse.length&&F.rse.indexOf(ds.dims.rse[r[4]])<0)return false;
 return true}
function sum(ds,pred){var a=new Array(NC).fill(0);ds.rows.forEach(function(r){if(pred(r))for(var j=0;j<NC;j++)a[j]+=r[OFF+j]});return a}
function inRange(r,rg){return!rg||(r[0]>=rg[0]&&r[0]<=rg[1])}
function numOf(a,k){return Array.isArray(k.n)?k.n.reduce(function(s,i){return s+a[i]},0):a[k.n]}
function kv(a,k){return pct(numOf(a,k),a[k.d])}                       /* KPI value (%) from a counter array */
function periodText(){var rg=range();if(!rg)return 'All data';var a=new Date(rg[0]*864e5),b=new Date(rg[1]*864e5);
 return(state.pt==='ytd'?'YTD':'In the month/period')+': '+a.getUTCDate()+' '+MON[a.getUTCMonth()]+' '+a.getUTCFullYear()+' – '+b.getUTCDate()+' '+MON[b.getUTCMonth()]+' '+b.getUTCFullYear()}
var FM={fYear:'y',fQ:'q',fM:'m',fW:'w',fRegion:'reg',fMod:'mod',fCT:'ct'};
function fill(sel,opts,cur){sel.innerHTML='<option value="">All</option>'+opts.map(function(o){return'<option value="'+esc(o[0])+'"'+(String(o[0])===String(cur)?' selected':'')+'>'+esc(o[1])+'</option>'}).join('')}
var ANA_PAGES={p3:1,p4:1};                                            /* Weekly / Monthly Analysis pages */
/* Rebuilds every filter list from the uploaded data, so new years, weeks and regions appear automatically */
function buildFilters(){var ds=state.primary;if(!ds)return;var all=[ds];Object.keys(state.markets).forEach(function(k){all.push(state.markets[k])});
 var ys={},qs={},ms={},ws={},rg={},md={},ct={},rs={};
 all.forEach(function(d){d.rows.forEach(function(r){var i=r._i;ys[i.y]=1;if(!F.y||i.y==F.y){qs[i.q]=1;if(!F.q||i.q==F.q){ms[i.ym]=1;if(!F.m||i.ym==F.m)ws[i.wkey]=i.wstart}}});
  d.dims.mod.forEach(function(x){md[x]=1});d.dims.ctype.forEach(function(x){ct[x]=1});(d.dims.rse||[]).forEach(function(x){rs[x]=1})});
 ds.dims.region.forEach(function(x){rg[x]=1});
 fill($('fYear'),Object.keys(ys).sort().map(function(y){return[y,y]}),F.y);
 fill($('fQ'),Object.keys(qs).sort().map(function(q){return[q,'Q'+q]}),F.q);
 fill($('fM'),Object.keys(ms).sort().map(function(k){return[k,MON[k%100-1]+' '+Math.floor(k/100)]}),F.m);
 fill($('fW'),Object.keys(ws).sort().reverse().map(function(k){var s=new Date(ws[k]*864e5);return[k,Math.floor(k/100)+'-W'+String(k%100).padStart(2,'0')+' ('+s.getUTCDate()+' '+MON[s.getUTCMonth()]+')']}),F.w);
 fill($('fRegion'),Object.keys(rg).sort().map(function(x){return[x,x]}),F.reg);
 rseList(Object.keys(rs).sort());
 fill($('fMod'),Object.keys(md).sort().map(function(x){return[x,x]}),F.mod);
 fill($('fCT'),Object.keys(ct).sort().map(function(x){return[x,x]}),F.ct);
 Object.keys(FM).forEach(function(id){F[FM[id]]=$(id).value});
 $('periodNote').textContent=ANA_PAGES[state.page]
  ?((state.page==='p4'?'Monthly':'Weekly')+' Analysis uses Region, RSE Region, Modality and Case Type filters. Each '+(state.page==='p4'?'month':'week')+' is shown on its own (not YTD) and updates automatically with the latest uploaded data.')
  :'KPIs are calculated by Disposition Date. Current period → '+periodText()+'.';}

/* Counters per month or week, for the trend charts. Year/Quarter/Month/Week filters are ignored here.
   In YTD mode the values are cumulative within each calendar year (noYtd = true gives plain per-period counts). */
function series(ds,view,skipReg,noYtd){var b={},wst={};
 ds.rows.forEach(function(r){if(!dimPass(r,ds,skipReg))return;var i=r._i,key=view==='m'?i.ym:i.wkey;wst[i.wkey]=i.wstart;var a=b[key]||(b[key]=new Array(NC).fill(0));for(var j=0;j<NC;j++)a[j]+=r[OFF+j]});
 var keys=Object.keys(b).map(Number).sort(function(x,y){return x-y});
 if(state.pt==='ytd'&&!noYtd){var run=null,yr=null,out={};keys.forEach(function(k){var y=view==='m'?Math.floor(k/100):new Date(((wst[k]||0)+3)*864e5).getUTCFullYear();if(y!==yr){run=new Array(NC).fill(0);yr=y}for(var j=0;j<NC;j++)run[j]+=b[k][j];out[k]=run.slice()});b=out}
 return{keys:keys,map:b,wst:wst}}
function lastN(keys,view){return keys.slice(view==='w'?-8:-12)}
function labelsFor(keys,view,wst){return keys.map(function(k){if(view==='m')return MON[k%100-1]+' '+Math.floor(k/100);var s=new Date((wst[k]||0)*864e5);return['W'+(k%100),s.getUTCDate()+' '+MON[s.getUTCMonth()]]})}

/* ---------- "Select KPIs" dropdowns (Select all / Clear + one checkbox per KPI) ---------- */
function makeMS(el,key,onChange){
 el.innerHTML='<button type="button" class="ms-btn" aria-haspopup="true"></button><div class="ms-pop"><div class="row"><button type="button" data-a="all">Select all</button><button type="button" data-a="none">Clear</button></div>'+KPIS.map(function(k){return'<label><input type="checkbox" value="'+k.id+'"><span class="sw" style="background:'+k.col+'"></span>'+esc(k.name)+'</label>'}).join('')+'</div>';
 var btn=el.querySelector('.ms-btn'),pop=el.querySelector('.ms-pop');
 function sync(){var s=state[key];el.querySelectorAll('input').forEach(function(c){c.checked=s.indexOf(c.value)>=0});btn.textContent=s.length===KPIS.length?'All Selected ('+s.length+')':s.length===0?'None selected':s.length===1?KPIS.filter(function(k){return k.id===s[0]})[0].name:s.length+' KPIs selected'}
 btn.addEventListener('click',function(e){e.stopPropagation();document.querySelectorAll('.ms-pop.open').forEach(function(p){if(p!==pop)p.classList.remove('open')});pop.classList.toggle('open')});
 pop.addEventListener('click',function(e){e.stopPropagation()});
 pop.addEventListener('change',function(){state[key]=[].slice.call(el.querySelectorAll('input:checked')).map(function(c){return c.value});sync();onChange()});
 pop.querySelectorAll('[data-a]').forEach(function(b){b.addEventListener('click',function(){state[key]=b.getAttribute('data-a')==='all'?KPIS.map(function(k){return k.id}):[];sync();onChange()})});
 sync()}
document.addEventListener('click',function(){document.querySelectorAll('.ms-pop.open').forEach(function(p){p.classList.remove('open')})});

/* ---------- charts ---------- */
function tip(c){return c.dataset.label+': '+(c.raw===null?'—':c.raw.toFixed(2)+'%')}
function lineChart(id,labels,ds){if(charts[id])charts[id].destroy();charts[id]=new Chart($(id),{type:'line',data:{labels:labels,datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},spanGaps:true,plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:8}},tooltip:{callbacks:{label:tip}}},scales:{y:{min:0,max:100,ticks:{callback:function(v){return v+'%'}},grid:{color:'#edf1f8'}},x:{grid:{color:'#f3f6fb'}}}}})}
function barChart(id,labels,ds){if(charts[id])charts[id].destroy();charts[id]=new Chart($(id),{type:'bar',data:{labels:labels,datasets:ds},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',align:'end'},tooltip:{callbacks:{label:tip}}},scales:{y:{min:0,max:100,ticks:{callback:function(v){return v+'%'}}},x:{ticks:{autoSkip:false,maxRotation:0,font:{size:11}}}}}})}
function wrapLabel(s){var w=s.replace(' %','%').split(' '),out=[],cur='';w.forEach(function(x){if((cur+' '+x).trim().length>11){if(cur)out.push(cur);cur=x}else cur=(cur+' '+x).trim()});if(cur)out.push(cur);return out}
/* small Chart.js plugin: writes the value above every point of datasets that have ptLabels:true */
var PtLabels={id:'ptLabels',afterDatasetsDraw:function(ch){var c=ch.ctx;ch.data.datasets.forEach(function(d,di){if(!d.ptLabels)return;var m=ch.getDatasetMeta(di);if(m.hidden)return;c.save();c.font='600 10.5px "Segoe UI",Arial,sans-serif';c.fillStyle='#0b1f4d';c.textAlign='center';c.textBaseline='bottom';
 m.data.forEach(function(pt,k){var v=d.data[k];if(v===null||v===undefined||!isFinite(v))return;c.fillText(v.toFixed(1)+'%',pt.x,Math.max(ch.chartArea.top+11,pt.y-7))});c.restore()})}};

/* ---------- tables ---------- */
function tableHTML(first,rows,tot,hl){var h='<table><thead><tr><th>'+first+'</th><th>Total Cases</th>'+KPIS.map(function(k){return'<th>'+esc(short(k))+'</th>'}).join('')+'</tr></thead><tbody>';
 rows.forEach(function(r,i){h+='<tr'+(hl&&i===0?' class="hl"':'')+'><td>'+esc(r.name)+'</td><td>'+r.a[0].toLocaleString()+'</td>'+KPIS.map(function(k){return'<td>'+fmt(kv(r.a,k))+'</td>'}).join('')+'</tr>'});
 if(tot)h+='<tr class="tot"><td>Total</td><td>'+tot[0].toLocaleString()+'</td>'+KPIS.map(function(k){return'<td>'+fmt(kv(tot,k))+'</td>'}).join('')+'</tr>';return h+'</tbody></table>'}
function filterText(){var p=[periodText()];[['fRegion','Region'],['fMod','Modality'],['fCT','Case Type']].forEach(function(x){var s=$(x[0]);if(s.value&&!(state.page==='p2'&&x[0]==='fRegion'))p.push(x[1]+'='+s.value)});if(F.rse.length)p.push('RSE Region='+F.rse.join(', '));return p.join('; ')}

/* ---------- formatted Excel export (.xlsx written by hand with JSZip) ---------- */
function xesc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function colL(i){var s='';i++;while(i>0){var m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}
async function exportXlsx(kind,first,rows,tot){
 var ds=state.primary,heads=[first,'Total Cases'].concat(KPIS.map(function(k){return k.name})),nc=heads.length,L=colL(nc-1),HR=5,x=[];
 function c(ref,s,v,t){if(v===null||v===undefined||v==='')return'<c r="'+ref+'" s="'+s+'"/>';if(t==='s')return'<c r="'+ref+'" s="'+s+'" t="inlineStr"><is><t xml:space="preserve">'+xesc(v)+'</t></is></c>';return'<c r="'+ref+'" s="'+s+'"><v>'+v+'</v></c>'}
 var title=kind==='Region'?'Service KPI Performance Hub – KPI Performance by Region':'Service KPI Performance Hub – KPI Performance Comparison by Market';
 x.push('<row r="1" ht="26" customHeight="1">'+c('A1',1,title,'s')+'</row>');
 x.push('<row r="2" ht="18" customHeight="1">'+c('A2',2,'Period & filters: '+filterText(),'s')+'</row>');
 x.push('<row r="3" ht="18" customHeight="1">'+c('A3',2,'KPIs by Disposition Date (unique cases) · Parts Match Success % = advised parts consumed ÷ advised parts · Source: '+(ds.file||'')+' · Exported: '+new Date().toLocaleString(),'s')+'</row>');
 x.push('<row r="'+HR+'" ht="36" customHeight="1">'+heads.map(function(h,i){return c(colL(i)+HR,3,h,'s')}).join('')+'</row>');
 function line(r,name,a,sty){var o='<row r="'+r+'" ht="18" customHeight="1">'+c('A'+r,sty[0],name,'s')+c('B'+r,sty[1],a[0]);
  KPIS.forEach(function(k,i){var v=kv(a,k);o+=c(colL(i+2)+r,sty[2],v===null?null:+(v/100).toFixed(6))});return o+'</row>'}
 rows.forEach(function(rw,i){x.push(line(HR+1+i,rw.name,rw.a,kind==='Market'&&i===0?[10,11,12]:i%2===1?[7,8,9]:[4,5,6]))});
 var last=HR+rows.length;if(tot)x.push(line(last+1,'Total',tot,[10,11,12]));
 var end=tot?last+1:last,widths=[kind==='Region'?32:22,13].concat(KPIS.map(function(k){return Math.max(12,Math.min(20,k.name.length*0.9))}));
 var sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
  '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:'+L+end+'"/>'+
  '<sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="90"><pane xSplit="1" ySplit="'+HR+'" topLeftCell="B'+(HR+1)+'" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="B'+(HR+1)+'" sqref="B'+(HR+1)+'"/></sheetView></sheetViews>'+
  '<sheetFormatPr defaultRowHeight="15"/><cols>'+widths.map(function(w,i){return'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w.toFixed(1)+'" customWidth="1"/>'}).join('')+'</cols>'+
  '<sheetData>'+x.join('')+'</sheetData>'+(rows.length?'<autoFilter ref="A'+HR+':'+L+last+'"/>':'')+
  '<mergeCells count="3"><mergeCell ref="A1:'+L+'1"/><mergeCell ref="A2:'+L+'2"/><mergeCell ref="A3:'+L+'3"/></mergeCells>'+
  '<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>';
 var sname=kind==='Region'?'KPI by Region':'KPI by Market';
 var bd='<left style="thin"><color rgb="FFD5E0F2"/></left><right style="thin"><color rgb="FFD5E0F2"/></right>';
 function xf(n,f,fi,b,al){return'<xf numFmtId="'+n+'" fontId="'+f+'" fillId="'+fi+'" borderId="'+b+'" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment '+al+'/></xf>'}
 var styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
  '<fonts count="6"><font><sz val="11"/><color rgb="FF0B1F4D"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF0B2A6B"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF5B6B8C"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF0B2A8F"/><name val="Calibri"/></font><font><sz val="11"/><color rgb="FF0B1F4D"/><name val="Calibri"/></font></fonts>'+
  '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B3A8F"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F7FD"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE8FB"/><bgColor indexed="64"/></patternFill></fill></fills>'+
  '<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border>'+bd+'<top style="thin"><color rgb="FFD5E0F2"/></top><bottom style="thin"><color rgb="FFD5E0F2"/></bottom><diagonal/></border><border>'+bd+'<top style="medium"><color rgb="FF0B3A8F"/></top><bottom style="medium"><color rgb="FF0B3A8F"/></bottom><diagonal/></border></borders>'+
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="13">'+
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+xf(0,1,0,0,'vertical="center"')+xf(0,2,0,0,'vertical="center"')+xf(0,3,2,1,'horizontal="center" vertical="center" wrapText="1"')+
  xf(0,5,0,1,'vertical="center"')+xf(3,5,0,1,'horizontal="right" vertical="center"')+xf(10,5,0,1,'horizontal="right" vertical="center"')+
  xf(0,5,3,1,'vertical="center"')+xf(3,5,3,1,'horizontal="right" vertical="center"')+xf(10,5,3,1,'horizontal="right" vertical="center"')+
  xf(0,4,4,2,'vertical="center"')+xf(3,4,4,2,'horizontal="right" vertical="center"')+xf(10,4,4,2,'horizontal="right" vertical="center"')+
  '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
 var z=new JSZip();
 z.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
 z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 z.file('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'+sname+'" sheetId="1" r:id="rId1"/></sheets>'+(rows.length?'<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">\''+sname+'\'!$A$'+HR+':$'+L+'$'+last+'</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">\''+sname+'\'!$'+HR+':$'+HR+'</definedName></definedNames>':'')+'</workbook>');
 z.file('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
 z.file('xl/styles.xml',styles);z.file('xl/worksheets/sheet1.xml',sheet);
 var blob=await z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
 var rg=range(),tag=rg?(function(d){return MON[d.getUTCMonth()]+d.getUTCFullYear()})(new Date(rg[1]*864e5)):'All';
 var fn=(kind==='Region'?'KPI_by_Region_':'KPI_Market_Comparison_')+(state.pt==='ytd'?'YTD_':'ITM_')+tag+'.xlsx';
 saveBlob(blob,fn,rows.length+' '+(kind==='Region'?'regions':'markets'));}
function saveBlob(blob,fn,what){var url=URL.createObjectURL(blob);
 try{var a=document.createElement('a');a.href=url;a.download=fn;a.rel='noopener';document.body.appendChild(a);a.click();setTimeout(function(){a.remove()},1000)}catch(e){}
 setTimeout(function(){URL.revokeObjectURL(url)},60000);toast('Downloaded '+fn+' ('+what+') – check your Downloads folder.')}

/* ---------- Page 1: Executive Overview ---------- */
/* text under each KPI card [what is counted, formula shown on hover] */
var SUB={rr:['cases remote resolved','RR ÷ RR Scope'],rt:['RT-scope cases met RT','RT ÷ RT Scope'],rdf:['RDF-scope cases were RDF','RDF ÷ RDF Scope'],
 fwp:['onsite cases with parts fixed on 1st visit','FVF ÷ FVF Scope (cases with parts consumed)'],fnp:['onsite cases without parts fixed on 1st visit','FVF ÷ FVF Scope (cases with no parts consumed)'],
 sp:['onsite cases had a plan before 1st visit','Service Plan Before First Visit = 1 ÷ FVF Scope cases'],ftr:['FTR PA-scope cases were FTR PA','FTR_PA ÷ FTR_PA Scope'],
 nt2:['cases not touched by T2','Touched by T2 = 0 ÷ all cases'],fvx:['onsite cases fixed on 1st visit','FVF ÷ FVF Scope'],
 mvx:['onsite cases were Multi Visit Fix','ResolutionType = Multi Visit Fix ÷ FVF Scope cases'],pm:['advised parts consumed','Advised parts consumed ÷ all advised parts']};
function cardSub(a,k){var t=SUB[k.id];return t?'<div class="s">'+numOf(a,k).toLocaleString()+' of '+a[k.d].toLocaleString()+' '+t[0]+'</div>':''}
function cardTip(k){var t=SUB[k.id];return t?' title="'+esc(k.name+' = '+t[1])+'"':''}
var last1=null;
function render1(){var ds=state.primary;if(!ds)return;var rg=range();
 var tot=sum(ds,function(r){return inRange(r,rg)&&dimPass(r,ds)});
 $('cards1').innerHTML='<div class="card ctot" title="Unique cases with Disposition Date in the selected period and filters"><div class="t">Total Cases</div><div class="v">'+tot[0].toLocaleString()+'</div><div class="s">unique cases dispositioned in period</div></div>'+
  KPIS.map(function(k,i){return'<div class="card c'+i+'"'+cardTip(k)+'><div class="t">'+esc(k.name)+'</div><div class="v">'+fmt(kv(tot,k))+'</div>'+cardSub(tot,k)+'</div>'}).join('');
 /* KPI Trend: lines = KPIs, grey bars = cases per month/week (right axis) */
 var view=$('view1').value,s=series(ds,view),keys=lastN(s.keys,view),sel=KPIS.filter(function(k){return state.sel1.indexOf(k.id)>=0});
 var raw=series(ds,view,false,true),cases=keys.map(function(x){return raw.map[x]?raw.map[x][0]:0});
 var D=sel.map(function(k){return{type:'line',label:short(k),data:keys.map(function(x){return kv(s.map[x],k)}),borderColor:k.col,backgroundColor:k.col,borderWidth:k.id==='rdf'?3.5:2,pointRadius:3,tension:.25,yAxisID:'y',order:1}});
 D.push({type:'bar',label:'Cases',data:cases,yAxisID:'y2',backgroundColor:'rgba(120,140,180,.22)',borderWidth:0,order:9,barPercentage:.7});
 if(charts.chart1)charts.chart1.destroy();
 charts.chart1=new Chart($('chart1'),{data:{labels:labelsFor(keys,view,s.wst),datasets:D},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},spanGaps:true,
  plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:8}},tooltip:{callbacks:{label:function(c){return c.dataset.yAxisID==='y2'?'Cases: '+c.raw.toLocaleString():tip(c)}}}},
  scales:{y:{min:0,max:100,ticks:{callback:function(v){return v+'%'}},grid:{color:'#edf1f8'}},y2:{position:'right',beginAtZero:true,grid:{display:false},ticks:{color:'#8a96ad'},title:{display:true,text:'Cases',color:'#8a96ad'}},x:{grid:{color:'#f3f6fb'}}}}});
 $('trendNote1').textContent=(state.pt==='ytd'?'YTD values':'In-the-period values')+' · '+(view==='w'?'latest 8 weeks':'latest 12 months')+' in the data · by Disposition Date';
 /* KPI Performance by Region */
 var reg={};ds.rows.forEach(function(r){if(!inRange(r,rg)||!dimPass(r,ds))return;var n=ds.dims.region[r[1]],a=reg[n]||(reg[n]=new Array(NC).fill(0));for(var j=0;j<NC;j++)a[j]+=r[OFF+j]});
 var rows=Object.keys(reg).map(function(n){return{name:n,a:reg[n]}}).sort(function(a,b){return b.a[0]-a.a[0]});
 $('tblNote1').textContent='('+periodText()+')';$('tblCnt1').textContent=rows.length?'· '+rows.length+' regions (scroll for more)':'';
 $('tbl1').innerHTML=rows.length?tableHTML('Region',rows,tot):'<div class="empty">No data for the selected filters.</div>';last1={rows:rows,tot:tot}}

/* ---------- Page 4: Market Comparison ---------- */
var last2=null;
function render2(){var ds=state.primary;if(!ds)return;var names=Object.keys(state.markets),rg=range();
 if(names.indexOf(state.cmp)<0)state.cmp=names[0]||'';
 $('cmpSel').innerHTML=names.length?names.map(function(n){return'<option'+(n===state.cmp?' selected':'')+'>'+esc(n)+'</option>'}).join(''):'<option value="">— none —</option>';
 $('chips').innerHTML=names.map(function(n){return'<span class="chip">'+esc(n)+' <button type="button" data-rm="'+esc(n)+'" aria-label="Remove '+esc(n)+'">×</button></span>'}).join('');
 $('chips').querySelectorAll('[data-rm]').forEach(function(b){b.addEventListener('click',function(){removeMarket(b.getAttribute('data-rm'))})});
 var has=!!state.cmp;$('cmpBody').classList.toggle('hidden',!has);$('cmpEmpty').classList.toggle('hidden',has);
 var pn=ds.market||'My Market',pt=sum(ds,function(r){return inRange(r,rg)&&dimPass(r,ds,true)});
 var rows=[{name:pn,a:pt}];names.forEach(function(n){var m=state.markets[n];rows.push({name:n,a:sum(m,function(r){return inRange(r,rg)&&dimPass(r,m,true)})})});
 last2={rows:rows};$('tblNote2').textContent='('+periodText()+')';$('tbl2').innerHTML=tableHTML('Market',rows,null,true);if(!has)return;
 var cm=state.markets[state.cmp],ct=rows[names.indexOf(state.cmp)+1].a;
 $('cards2').innerHTML=KPIS.map(function(k,i){return'<div class="card c'+i+'"><div class="t">'+esc(k.name)+'</div><div class="dual"><div><small>'+esc(pn)+'</small><b>'+fmt(kv(pt,k))+'</b></div><div><small>'+esc(state.cmp)+'</small><b>'+fmt(kv(ct,k))+'</b></div></div></div>'}).join('');
 var view=$('view2').value,a=series(ds,view,true),b=series(cm,view,true),ks={};a.keys.concat(b.keys).forEach(function(k){ks[k]=1});
 var keys=lastN(Object.keys(ks).map(Number).sort(function(x,y){return x-y}),view),wst=Object.assign({},b.wst,a.wst),sel=KPIS.filter(function(k){return state.sel2.indexOf(k.id)>=0}),D=[];
 sel.forEach(function(k){D.push({label:pn+' - '+short(k),data:keys.map(function(x){return a.map[x]?kv(a.map[x],k):null}),borderColor:k.col,backgroundColor:k.col,borderWidth:2.5,pointRadius:3,tension:.25});
  D.push({label:state.cmp+' - '+short(k),data:keys.map(function(x){return b.map[x]?kv(b.map[x],k):null}),borderColor:k.col,backgroundColor:'#fff',borderDash:[6,4],borderWidth:2,pointRadius:3,tension:.25})});
 lineChart('chart2',labelsFor(keys,view,wst),D);
 var s3=KPIS.filter(function(k){return state.sel3.indexOf(k.id)>=0});
 barChart('chart3',s3.map(function(k){return wrapLabel(short(k))}),[{label:pn,data:s3.map(function(k){return kv(pt,k)}),backgroundColor:'#0b4fd1'},{label:state.cmp,data:s3.map(function(k){return kv(ct,k)}),backgroundColor:'#6fb3f5'}])}

/* ---------- Pages 2 and 3: Monthly & Weekly Analysis (one shared engine) ----------
   Trend = the last H complete periods compared with the H periods before them (H = 2).
   Values are worked out from combined counts (e.g. total RDF ÷ total RDF Scope), not by averaging percentages. */
function mdy(d){return MON[d.getUTCMonth()]+' '+d.getUTCDate()}
function wkLabel(ws){var a=new Date(ws*864e5),b=new Date((ws+6)*864e5);return mdy(a)+'–'+(a.getUTCMonth()===b.getUTCMonth()?'':MON[b.getUTCMonth()]+' ')+b.getUTCDate()}
function wkLabel2(ws){var a=new Date(ws*864e5),b=new Date((ws+6)*864e5);return a.getUTCMonth()===b.getUTCMonth()?[MON[a.getUTCMonth()],a.getUTCDate()+'–'+b.getUTCDate()]:[mdy(a)+'–',mdy(b)]}
var ANA={
 w:{pre:'w3',cp:'wc_',n:8,partial:false,H:2,RW:4,unit:'week',ch:'WoW',roll:'4-week',
   key:function(i){return i.wkey},start:function(i){return i.wstart},endDay:function(s){return s+6},
   label:function(s){return wkLabel(s)},label2:function(s){return wkLabel2(s)},
   rng:function(ss){var a=new Date(ss[0]*864e5),b=new Date((ss[ss.length-1]+6)*864e5);return mdy(a)+'–'+(a.getUTCMonth()===b.getUTCMonth()?'':MON[b.getUTCMonth()]+' ')+b.getUTCDate()}},
 m:{pre:'m4',cp:'mc_',n:12,partial:false,H:2,RW:3,unit:'month',ch:'MoM',roll:'3-month',
   key:function(i){return i.ym},start:function(i){return U(i.y,i.m,1)},endDay:function(s){var d=new Date(s*864e5);return U(d.getUTCFullYear(),d.getUTCMonth()+1,1)-1},
   label:function(s){var d=new Date(s*864e5);return MON[d.getUTCMonth()]+' '+d.getUTCFullYear()},label2:function(s){var d=new Date(s*864e5);return[MON[d.getUTCMonth()],String(d.getUTCFullYear())]},
   rng:function(ss){return ss.map(function(s){return MON[new Date(s*864e5).getUTCMonth()]}).join('+')}}};
/* counters per week/month (current filters). The newest period is dropped while it is still in progress. */
function anaData(ds,A){var b={},st={};
 ds.rows.forEach(function(r){if(!dimPass(r,ds))return;var i=r._i,k=A.key(i);st[k]=A.start(i);var a=b[k]||(b[k]=new Array(NC).fill(0));for(var j=0;j<NC;j++)a[j]+=r[OFF+j]});
 var keys=Object.keys(b).map(Number).sort(function(x,y){return x-y}),last=keys[keys.length-1],partialKey=null;
 if(last!==undefined&&ds.maxDay<A.endDay(st[last])){partialKey=last;if(!A.partial)keys.pop()}
 return{keys:keys.slice(-A.n),map:b,st:st,partialKey:partialKey}}
function poolArr(map,keys){var a=new Array(NC).fill(0);keys.forEach(function(x){for(var j=0;j<NC;j++)a[j]+=map[x][j]});return a}
function pooled(map,keys,k){return kv(poolArr(map,keys),k)}
/* Trend status of one KPI: recent H periods vs previous H periods.  Within ±2 pp = Stable, otherwise Improving / Worsening by DIR. */
function status(map,keys,k,H){if(keys.length<2)return{t:'Not enough data',c:'neu',d:null};
 var h=Math.min(H,Math.floor(keys.length/2)),rk=keys.slice(-h),pk=keys.slice(-2*h,-h),ra=poolArr(map,rk),pa=poolArr(map,pk),r=kv(ra,k),p=kv(pa,k);
 var o={h:h,rk:rk,pk:pk,rv:r,pv:p,rn:numOf(ra,k),rd:ra[k.d],pn:numOf(pa,k),pd:pa[k.d]};
 if(r===null||p===null){o.t='No data';o.c='neu';o.d=null;return o}
 var d=r-p,dir=DIR[k.id];o.d=d;
 if(Math.abs(d)<2){o.t='Stable';o.c='neu'}
 else if(dir===0){o.t=d>0?'Rising':'Falling';o.c='info'}
 else if(d*dir>0){o.t='Improving';o.c='good'}else{o.t='Worsening';o.c='bad'}
 return o}
function chip(d,dir,suffix){if(d===null||d===undefined||!isFinite(d))return'<span class="wchip neu">—</span>';
 var c=Math.abs(d)<0.05?'neu':dir===0?'info':(d*dir>0?'good':'bad');return'<span class="wchip '+c+'">'+(d>0?'▲ +':d<0?'▼ ':'')+d.toFixed(1)+' pp'+(suffix||'')+'</span>'}
function mix(a,b,t){return a.map(function(x,i){return Math.round(x+(b[i]-x)*t)})}
function heat(v,min,max,dir){if(v===null||max-min<0.01)return'';var t=(v-min)/(max-min);if(dir===-1)t=1-t;
 if(dir===0)return'background:rgba(26,115,232,'+(0.08+0.25*t).toFixed(2)+')';
 var g=[216,243,227],r=[253,224,224],m=[255,248,225],c=t<0.5?mix(r,m,t*2):mix(m,g,(t-0.5)*2);return'background:rgb('+c.join(',')+')'}
function sgn(d){return d==null?'—':(d>0?'+':d<0?'−':'')+Math.abs(d).toFixed(1)+' pp'}
function renderAna(kind){var ds=state.primary;if(!ds)return;var A=ANA[kind],P=A.pre,w=anaData(ds,A),keys=w.keys;
 var lab=keys.map(function(k){return A.label(w.st[k])+(k===w.partialKey?'*':'')}),labC=keys.map(function(k){var l=A.label2(w.st[k]);if(k===w.partialKey)l[l.length-1]+='*';return l});
 $(P+'note').textContent=keys.length?((kind==='w'?'Weekly (in-week) values · Mon–Sun weeks':'Monthly (in-month) values')+' by Disposition Date · '+lab[0]+' to '+lab[lab.length-1]+(w.partialKey&&!A.partial?' · current partial '+A.unit+' ('+A.label(w.st[w.partialKey])+') hidden':'')+(w.partialKey&&A.partial?' · * = partial '+A.unit:'')):'No data for the selected filters.';
 if(!keys.length){$(P+'sum').innerHTML='';$(P+'tbl').innerHTML='';$(P+'grid').innerHTML='';return}
 var st={};KPIS.forEach(function(k){st[k.id]=status(w.map,keys,k,A.H)});
 var s0=st.rr,recL=s0.rk?A.rng(s0.rk.map(function(x){return w.st[x]})):'',preL=s0.pk&&s0.pk.length?A.rng(s0.pk.map(function(x){return w.st[x]})):'';
 /* hover text with the counts behind a trend result */
 function tipOf(k,s){if(s.d==null)return esc(k.name)+': not enough data';var u=k.unit||(k.id==='nt2'?'cases':'scope cases');
  return esc(short(k)+'\n'+recL+' = '+s.rn.toLocaleString()+' of '+s.rd.toLocaleString()+' '+u+' ('+fmt1(s.rv)+')\n'+preL+' = '+s.pn.toLocaleString()+' of '+s.pd.toLocaleString()+' '+u+' ('+fmt1(s.pv)+')\nChange = '+sgn(s.d)+' → '+s.t)}
 var RULES={good:'Moved more than 2 pp in the good direction',bad:'Moved more than 2 pp in the bad direction',neu:'Changed by 2 pp or less',info:'Moved more than 2 pp (no good/bad direction)'};
 function group(c,title,ico){var L=KPIS.filter(function(k){return st[k.id].c===c});
  var h='<div class="wsum '+c+'"><div class="wsh">'+ico+' '+title+' <b>'+L.length+'</b></div><div class="wrule">'+RULES[c]+'</div>';
  if(!L.length)return h+'<div class="wsi muted">None</div></div>';
  h+='<div class="wsr hd"><span>KPI</span><span class="v">'+esc(preL)+' → '+esc(recL)+'</span><span class="d">Change</span></div>';
  return h+L.map(function(k){var s=st[k.id];return'<div class="wsr" title="'+tipOf(k,s)+'"><span>'+esc(short(k))+(DIR[k.id]===-1?' <span class="lb">↓ better</span>':'')+'</span><span class="v">'+fmt1(s.pv)+' → '+fmt1(s.rv)+'</span><span class="d">'+sgn(s.d)+'</span></div>'}).join('')+'</div>'}
 $(P+'sum').innerHTML=group('good','Improving','▲')+group('bad','Worsening','▼')+group('neu','Stable','■')+(KPIS.some(function(k){return st[k.id].c==='info'})?group('info','Rising / Falling','◆'):'');
 /* scorecard table */
 var hh=s0.h||A.H;
 var h='<table class="wtbl"><thead><tr><th>KPI</th>'+lab.map(function(l){return'<th>'+esc(l)+'</th>'}).join('')+'<th>'+A.ch+' change</th><th>Trend (last '+hh+' '+A.unit+'s vs prior)</th></tr></thead><tbody>';
 KPIS.forEach(function(k){var vals=keys.map(function(x){return kv(w.map[x],k)}),nn=vals.filter(function(v){return v!==null}),mn=Math.min.apply(null,nn),mx=Math.max.apply(null,nn),dir=DIR[k.id];
  var l=vals[vals.length-1],p=vals[vals.length-2],s=st[k.id];
  h+='<tr><td><span class="sw" style="background:'+k.col+'"></span> '+esc(short(k))+(dir===-1?' <small>(lower is better)</small>':'')+'</td>'+vals.map(function(v,i){return'<td style="'+heat(v,mn,mx,dir)+'" title="'+esc(short(k))+' · '+esc(lab[i])+' · '+(v===null?'no data':v.toFixed(2)+'% of '+w.map[keys[i]][k.d]+' '+(k.unit||'cases'))+'">'+fmt(v)+'</td>'}).join('')+
   '<td>'+chip(l!=null&&p!=null?l-p:null,dir)+'</td><td><span class="wbadge '+s.c+'" title="'+tipOf(k,s)+'">'+s.t+(s.d!=null?' (value '+(s.d>0?'▲ +':'▼ ')+s.d.toFixed(1)+' pp)':'')+'</span></td></tr>'});
 $(P+'tbl').innerHTML=h+'</tbody></table>';
 /* one chart per KPI */
 $(P+'grid').innerHTML=KPIS.map(function(k){return'<div class="wcard"><div class="wch"><div><div class="wt"><span class="sw" style="background:'+k.col+'"></span> '+esc(k.name)+'</div><div class="wv" id="'+P+'v_'+k.id+'"></div></div><div class="wr" id="'+P+'r_'+k.id+'"></div></div><div class="wbox"><canvas id="'+A.cp+k.id+'" role="img" aria-label="'+esc(k.name)+' '+A.unit+'ly trend"></canvas></div></div>'}).join('');
 KPIS.forEach(function(k){try{var vals=keys.map(function(x){return kv(w.map[x],k)}),sc=keys.map(function(x){return w.map[x][k.d]}),dir=DIR[k.id],s=st[k.id];
  var avg=vals.map(function(v,i){return pooled(w.map,keys.slice(Math.max(0,i-A.RW+1),i+1),k)});   /* rolling average from combined counts */
  var l=vals[vals.length-1],p=vals[vals.length-2];
  $(P+'v_'+k.id).innerHTML=fmt(l)+' <small>latest '+A.unit+'</small>';
  $(P+'r_'+k.id).innerHTML=chip(l!=null&&p!=null?l-p:null,dir,' '+A.ch)+'<span class="wbadge '+s.c+'" title="'+tipOf(k,s)+'">'+s.t+'</span>';
  var id=A.cp+k.id;if(charts[id])charts[id].destroy();
  var nums=vals.filter(function(v){return v!==null});if(!nums.length)nums=[0,100];
  var lo=Math.max(0,Math.floor((Math.min.apply(null,nums)-8)/10)*10),hi=Math.min(110,Math.ceil((Math.max.apply(null,nums)+10)/10)*10),stp=(hi-lo)>60?20:10,unit=k.unit||'cases';
  charts[id]=new Chart($(id),{data:{labels:labC,datasets:[
   {type:'bar',label:'In scope',data:sc,yAxisID:'y2',backgroundColor:'rgba(120,140,180,.16)',borderWidth:0,order:3},
   {type:'line',label:A.roll+' rolling avg',data:avg,yAxisID:'y',borderColor:'#9aa8c4',borderDash:[5,4],borderWidth:1.5,pointRadius:0,tension:.3,order:2},
   {type:'line',label:short(k),data:vals,yAxisID:'y',borderColor:k.col,backgroundColor:k.col,borderWidth:2.5,pointRadius:4,pointHoverRadius:6,tension:.25,order:1,ptLabels:true}]},
   plugins:[PtLabels],options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},spanGaps:true,layout:{padding:{top:20}},
    plugins:{legend:{display:false},tooltip:{callbacks:{title:function(it){return lab[it[0].dataIndex]},label:function(c){if(c.dataset.yAxisID==='y2')return'In scope: '+c.raw+' '+unit;return c.dataset.label+': '+(c.raw===null?'—':c.raw.toFixed(2)+'%')}}}},
    scales:{y:{min:lo,max:hi,ticks:{stepSize:stp,callback:function(v){return v>100?'':v+'%'},font:{size:10}},grid:{color:'#eef2f8'}},
     y2:{position:'right',beginAtZero:true,grid:{display:false},ticks:{font:{size:9},color:'#9aa8c4',maxTicksLimit:4},title:{display:true,text:unit,font:{size:9},color:'#9aa8c4'}},
     x:{grid:{display:false},ticks:{font:{size:9},maxRotation:0,minRotation:0,autoSkip:false,padding:4}}}}})}catch(e){if(window.console)console.warn('chart',k.id,e)}});}

/* ---------- drawing the current page ---------- */
function renderInner(){buildFilters();if(state.page==='p3')renderAna('w');else if(state.page==='p4')renderAna('m');else if(state.page==='p1')render1();else render2()}
function render(){if(!state.primary)return;try{renderInner()}catch(e){if(window.console)console.warn('render issue',e)}}

/* ---------- uploading Excel ---------- */
function showOv(on,t){$('ov').classList.toggle('on',on);if(t)$('ovTitle').textContent=t;$('ovBar').style.width='0';$('ovMsg').textContent='Starting…'}
async function load(file,title){showOv(true,title);try{var buf=await file.arrayBuffer();var ds=await KPI_CORE.parseXlsx(JSZip,buf,{name:file.name,onProgress:function(m,p){$('ovMsg').textContent=m;$('ovBar').style.width=p+'%'}});ds.file=file.name;showOv(false);return ds}catch(e){showOv(false);toast('Could not load this file: '+(e&&e.message?e.message:e));return null}}
function latestPeriod(){var ds=state.primary;if(!ds)return;var i=dinfo(ds.maxDay);F.y=String(i.y);F.q='';F.m=String(i.ym);F.w=''}   /* open on the latest month */
$('btnUpload').addEventListener('click',function(){$('fileMain').click()});
$('fileMain').addEventListener('change',async function(){var f=this.files[0];this.value='';if(!f)return;var ds=await load(f,'Loading market data…');if(!ds)return;if(!ds.market)ds.market='My Market';
 state.primary=prep(ds);await dbPut('primary',strip(ds));Object.keys(F).forEach(function(k){F[k]=''});F.rse=[];latestPeriod();updHeader();render();
 toast('Loaded '+ds.rowsUsed.toLocaleString()+' unique cases ('+ds.dups.toLocaleString()+' repeated rows removed). Saved – it will open automatically next time.')});
$('btnCmpUpload').addEventListener('click',function(){if(!state.primary){toast('Please upload your market data first.');return}$('fileCmp').click()});
$('fileCmp').addEventListener('change',async function(){var f=this.files[0];this.value='';if(!f)return;var ds=await load(f,'Loading comparison market…');if(!ds)return;
 /* market name: Market column in the Excel > "Market:" filter line > readable file name > "Comparison Market" */
 var base=f.name.replace(/\.[^.]+$/,'').trim(),pm=state.primary.market,looksRandom=/^[0-9a-f]{16,}$/i.test(base)||/^[0-9a-f-]{30,}$/i.test(base);
 var name=ds.market||'';
 if(!name)name=looksRandom?'Comparison Market':base;
 if(name===pm)name=pm+' (comparison)';
 var sig=function(d){var t=new Array(NC).fill(0);d.rows.forEach(function(r){for(var j=0;j<NC;j++)t[j]+=r[OFF+j]});return d.rowsUsed+'|'+d.maxDay+'|'+t.join(',')};var same=sig(ds)===sig(state.primary);
 var original=name,n=2;while(state.markets[name])name=original+' '+(n++);
 ds.market=name;state.markets[name]=prep(ds);state.cmp=name;await dbPut('markets',Object.keys(state.markets).map(function(x){return strip(state.markets[x])}));
 F.y='';F.q='';F.m='';F.w='';render();
 toast(same?'Warning: this file looks identical to your main market data ('+ds.rowsUsed.toLocaleString()+' cases), so both sides show the same values. Upload a different market\'s Excel to compare.':name+': '+ds.rowsUsed.toLocaleString()+' unique cases loaded. Comparison is showing All periods.')});
async function removeMarket(n){if(!confirm('Remove '+n+' from comparison?'))return;delete state.markets[n];if(state.cmp===n)state.cmp='';await dbPut('markets',Object.keys(state.markets).map(function(k){return strip(state.markets[k])}));render()}
$('cmpSel').addEventListener('change',function(){state.cmp=this.value;render()});

/* ---------- wiring: filters, buttons, pages ---------- */
Object.keys(FM).forEach(function(id){$(id).addEventListener('change',function(){F[FM[id]]=this.value;if(id==='fYear'){F.q='';F.m='';F.w=''}if(id==='fQ'){F.m='';F.w=''}if(id==='fM')F.w='';render()})});
document.querySelectorAll('[data-pt]').forEach(function(b){b.addEventListener('click',function(){state.pt=b.getAttribute('data-pt');document.querySelectorAll('[data-pt]').forEach(function(x){x.classList.toggle('on',x===b)});render()})});
$('btnReset').addEventListener('click',function(){Object.keys(F).forEach(function(k){F[k]=''});F.rse=[];state.pt='ytd';document.querySelectorAll('[data-pt]').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-pt')==='ytd')});render();toast('All filters reset')});
$('view1').addEventListener('change',function(){if(state.primary)render1()});$('view2').addEventListener('change',function(){if(state.primary)render2()});
$('w3n').addEventListener('change',function(){ANA.w.n=+this.value;render()});$('w3p').addEventListener('change',function(){ANA.w.partial=this.checked;render()});
$('m4n').addEventListener('change',function(){ANA.m.n=+this.value;render()});$('m4p').addEventListener('change',function(){ANA.m.partial=this.checked;render()});
$('exp1').addEventListener('click',function(){if(last1)exportXlsx('Region','Region',last1.rows,last1.tot)});
$('exp2').addEventListener('click',function(){if(last2)exportXlsx('Market','Market',last2.rows,null)});
/* RSE Region multi-select */
var rseAll=[];
function rseLabel(){var b=$('rseBtn');b.textContent=!F.rse.length?'All':F.rse.length===1?F.rse[0]:F.rse.length+' selected';b.title=F.rse.length?F.rse.join(', '):'All RSE Regions'}
function rseList(list){rseAll=list;F.rse=F.rse.filter(function(x){return list.indexOf(x)>=0});
 var q=($('rseSearch').value||'').toLowerCase();
 $('rseItems').innerHTML=list.filter(function(x){return !q||x.toLowerCase().indexOf(q)>=0}).map(function(x){return'<label><input type="checkbox" value="'+esc(x)+'"'+(F.rse.indexOf(x)>=0?' checked':'')+'>'+esc(x)+'</label>'}).join('')||'<div class="note" style="padding:4px">No match</div>';rseLabel()}
$('rseBtn').addEventListener('click',function(e){e.stopPropagation();document.querySelectorAll('.ms-pop.open').forEach(function(p){if(p.id!=='rsePop')p.classList.remove('open')});$('rsePop').classList.toggle('open');if($('rsePop').classList.contains('open'))$('rseSearch').focus()});
$('rsePop').addEventListener('click',function(e){e.stopPropagation()});
$('rseSearch').addEventListener('input',function(){rseList(rseAll)});
$('rseItems').addEventListener('change',function(e){var v=e.target.value;if(e.target.checked){if(F.rse.indexOf(v)<0)F.rse.push(v)}else F.rse=F.rse.filter(function(x){return x!==v});rseLabel();render()});
$('rseAllBtn').addEventListener('click',function(){var q=($('rseSearch').value||'').toLowerCase();rseAll.forEach(function(x){if((!q||x.toLowerCase().indexOf(q)>=0)&&F.rse.indexOf(x)<0)F.rse.push(x)});render()});
$('rseClrBtn').addEventListener('click',function(){F.rse=[];render()});
/* page switching (menu order: Executive Overview, Monthly, Weekly, Market Comparison) */
var TITLES={p1:'Page 1 of 4<b>Executive Overview</b>',p4:'Page 2 of 4<b>Monthly Analysis</b>',p3:'Page 3 of 4<b>Weekly Analysis</b>',p2:'Page 4 of 4<b>Market Comparison</b>'};
document.querySelectorAll('[data-page]').forEach(function(b){b.addEventListener('click',function(){state.page=b.getAttribute('data-page');
 document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('hidden',p.id!==state.page)});
 document.querySelectorAll('.nav [data-page]').forEach(function(x){x.classList.toggle('active',x.getAttribute('data-page')===state.page)});
 var ana=!!ANA_PAGES[state.page];
 $('fRegionBox').classList.toggle('hidden',state.page==='p2');$('fPtBox').classList.toggle('hidden',ana);
 document.querySelectorAll('.tfil').forEach(function(e){e.classList.toggle('hidden',ana)});
 $('pageTitle').innerHTML=TITLES[state.page];render()})});
window.addEventListener('unhandledrejection',function(e){e.preventDefault()});
function updHeader(){var ds=state.primary;if(!ds)return;var i=dinfo(ds.maxDay),d=new Date(ds.maxDay*864e5);
 $('lastUpd').innerHTML='Last Updated: Week '+i.wk+', '+d.getUTCDate()+' '+MON[d.getUTCMonth()]+' '+d.getUTCFullYear()+'<br><span style="opacity:.8;font-size:11.5px">Market: '+esc(ds.market||'My Market')+' · '+esc(ds.file||'')+' · '+ds.rowsUsed.toLocaleString()+' unique cases</span>'}
makeMS($('ms1'),'sel1',function(){if(state.primary)render1()});makeMS($('ms2'),'sel2',function(){if(state.primary)render2()});makeMS($('ms3'),'sel3',function(){if(state.primary)render2()});
Chart.defaults.font.family='"Segoe UI",Roboto,Arial,sans-serif';Chart.defaults.color='#33456f';
function emptyState(){var msg='<div class="empty" style="grid-column:1/-1;background:#fff;border:1px dashed #9fb8e6;border-radius:10px">Click <b>Upload Market Data</b> (top right) to load your data. It will be saved and open automatically next time.</div>';
 $('cards1').innerHTML=msg;$('w3grid').innerHTML='';$('w3sum').innerHTML=msg;$('m4grid').innerHTML='';$('m4sum').innerHTML=msg;$('cmpEmpty').innerHTML='Upload your market data first, then upload the market you want to compare.'}

/* ---------- start-up: load the data saved from the last upload ---------- */
(async function(){await openDB();var p=await dbGet('primary'),m=await dbGet('markets');
 if(p&&p.v!==5)p=null;                                                /* data saved in an older format is ignored */
 state.primary=prep(p||SEED);(m||[]).filter(function(d){return d.v===5}).forEach(function(d){state.markets[d.market||d.name]=prep(d)});
 Object.keys(state.markets).forEach(function(n){if(/^[0-9a-f]{16,}( \d+)?$/i.test(n)){var d=state.markets[n],nn='Comparison Market',i=2;while(state.markets[nn])nn='Comparison Market '+(i++);delete state.markets[n];d.market=nn;state.markets[nn]=d}});
 state.cmp=Object.keys(state.markets)[0]||'';
 if(!state.primary){emptyState();return}
 latestPeriod();updHeader();render()})();
})();
