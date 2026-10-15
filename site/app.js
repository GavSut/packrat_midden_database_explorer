/* UI controller; all analysis semantics live in core.js. */
(function(){'use strict';
const $=id=>document.getElementById(id),C=window.MiddenCore,D=window.MIDDEN_DATA;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v===null||v===undefined?'—':Number(v).toLocaleString(undefined,{maximumFractionDigits:1});
let f={...C.defaults,taxa:[]},result={samples:[],background:[]},page=0,rawPage=0,rawCols=[],rawRows=[],map,points,background,tiles,baseLayer,timer;
const tx=C.objects(C.table(D,4)),txMap=new Map(tx.map(r=>[r.VARNUM,r]));
const refs=C.objects(C.table(D,1));
const formKeys=Object.keys(C.defaults).filter(k=>k!=='taxa');
function toast(t){$('toast').textContent=t;$('toast').hidden=false;clearTimeout(timer);timer=setTimeout(()=>$('toast').hidden=true,3500);}
function options(id,values,label='All'){const el=$(id);el.innerHTML=`<option value="">${esc(label)}</option>`+values.map(v=>typeof v==='string'?`<option value="${esc(v)}">${esc(v)}</option>`:`<option value="${esc(v[0])}">${esc(v[1])}</option>`).join('');}
function populate(){
 for(const [id,key] of [['country','country'],['state','state'],['ecoregion','ecoregion']])options(id,[...new Set(D.samples.map(s=>s[key]))].filter(v=>v&&v!=='99999').sort());
 for(const [id,prefix]of [['listCode','Lookup_Table_4_'],['useStatus','Lookup_Table_1_']]){const t=Object.entries(D.tables).find(([k])=>k.startsWith(prefix))[1];options(id,t.rows.map(r=>[r[0],r[0]+' · '+r[1]]));}
 options('reference',refs.map(r=>[r.REFNUM,r.CITATION+' ['+r.REFNUM+']']).sort((a,b)=>a[1].localeCompare(b[1])));
 const climate=C.table(D,8).columns.filter(k=>!['SAMCODE','SITE','COUNTRY','STATE_OR_PROVINCE'].includes(k)&&!k.startsWith('BEST_'));
 options('climateField',climate.map(k=>[k,({ANNT:'ANNT · annual mean temperature (°C)',ANNP:'ANNP · annual precipitation (mm)',MTCO:'MTCO · coldest-month temperature (°C)',MTWA:'MTWA · warmest-month temperature (°C)'})[k]||k]),'No climate filter');
 $('rawTable').innerHTML=Object.entries(D.tables).map(([k,t])=>`<option value="${esc(k)}">${esc(k.replaceAll('_',' '))} (${fmt(t.rows.length)} rows)</option>`).join('');
 const docs=D.audit.source_files.filter(s=>!s.file.startsWith('Linked')&&!s.file.startsWith('Unlinked')&&!s.file.startsWith('Lookup'));
 $('sourceLinks').innerHTML=docs.map(s=>`<a href="data/raw/${encodeURIComponent(s.file)}" download>${esc(s.file)}</a>`).join('');
 $('auditSummary').innerHTML=`<p>All ${fmt(D.audit.occurrences)} occurrence rows joined to sample and taxon records. ${fmt(D.audit.mapped_samples)} samples have valid map coordinates; ${fmt(D.audit.samples-D.audit.mapped_samples)} remain available in tables and exports.</p><p>Four unique case-only sample aliases were reconciled; raw files retain their original spelling:</p><ul>${Object.entries(D.aliases).map(([a,b])=>`<li><code>${esc(a)} → ${esc(b)}</code></li>`).join('')}</ul>`;
}
function readForm(){for(const k of formKeys){const el=$(k);f[k]=el.type==='checkbox'?el.checked:el.value;}f.young=Number(f.young);f.old=Number(f.old);if(f.basis==='c14'){f.ageMode='point';$('ageMode').value='point';}$('ageMode').disabled=f.basis==='c14';$('youngSlider').value=f.young;$('oldSlider').value=f.old;}
function writeForm(){for(const k of formKeys){const el=$(k);if(el.type==='checkbox')el.checked=!!f[k];else el.value=f[k];}readForm();renderTaxa();}
function loadFilters(obj){const x=obj.filters||obj;const next={...C.defaults,taxa:[]};for(const k of Object.keys(next))if(Object.hasOwn(x,k))next[k]=x[k];if(!Array.isArray(next.taxa))throw Error('Invalid taxon list');next.taxa=next.taxa.map(String).filter(id=>txMap.has(id));const err=C.validate(next);if(err)throw Error(err);f=next;writeForm();update();}
function renderTaxa(){
 $('selectedTaxa').innerHTML=f.taxa.map(id=>`<button type="button" class="chip" data-remove="${esc(id)}">${esc(txMap.get(id).VARNAME)} · ${id} ×</button>`).join('');
 const q=$('taxonSearch').value.trim().toLowerCase();const found=q?tx.filter(r=>Object.values(r).slice(0,12).join(' ').toLowerCase().includes(q)&&!f.taxa.includes(r.VARNUM)):[];
 $('taxonResults').innerHTML=found.slice(0,35).map(r=>`<button type="button" data-taxon="${r.VARNUM}"><b>${esc(r.VARNAME)}</b> [${r.VARNUM}]<small>${esc(r.COMMON_NAME)} · ${esc(r.FAMILY)}${r.CURRENTLY_ACCEPTED_VARNAME!=='same'?' · accepted: '+esc(r.CURRENTLY_ACCEPTED_VARNAME):''}</small></button>`).join('')+(found.length>35?'<p class="hint">Keep typing to narrow '+found.length+' matches.</p>':'');
}
function update(){
 readForm();const error=C.validate(f);$('filterError').hidden=!error;if(error){$('filterError').textContent=error;return;}
 result=C.filter(D,f);page=0;renderStats();renderMap();renderTable();renderHistogram();if(!$('tables').hidden)renderRaw();
}
function renderStats(){
 const s=result.samples;$('sampleCount').textContent=fmt(s.length);$('locationCount').textContent=fmt(new Set(s.filter(s=>s.lat!==null).map(s=>s.lat+','+s.lon)).size);$('taxaCount').textContent=fmt(new Set(s.flatMap(s=>s.occurrences.map(o=>o.varnum))).size);$('occurrenceCount').textContent=fmt(s.reduce((n,s)=>n+s.occurrences.length,0));$('mapTitle').textContent=f.taxa.length?f.taxa.map(id=>txMap.get(id).VARNAME).join(' · '):'All samples';
}
function initMap(){
 map=L.map('map',{preferCanvas:true,minZoom:2,maxZoom:18}).setView([37,-111],4);L.control.scale({imperial:false}).addTo(map);
 baseLayer=L.geoJSON(window.MIDDEN_OUTLINES,{style:{color:'#a3b5aa',weight:.8,fillColor:'#f4f5e9',fillOpacity:1},interactive:false}).addTo(map);
 background=L.layerGroup().addTo(map);points=L.layerGroup().addTo(map);
}
function setBasemap(){
 if(tiles){map.removeLayer(tiles);tiles=null;}
 if(f.base==='outline'){$('tileStatus').textContent='Bundled map · no network needed';return;}
 const osm=f.base==='osm';$('tileStatus').textContent='Loading online basemap…';let fails=0;
 tiles=L.tileLayer(osm?'https://tile.openstreetmap.org/{z}/{x}/{y}.png':'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:18,attribution:osm?'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors':'Tiles © Esri and contributors'});
 tiles.on('tileerror',()=>{fails++;$('tileStatus').textContent='Some online tiles failed · choose Offline outlines';});tiles.on('load',()=>{if(!fails)$('tileStatus').textContent='Online basemap · internet required';});tiles.addTo(map);
}
function colorAt(v,min,max){if(v===null)return '#a7b0ad';const p=Math.max(0,Math.min(1,(v-min)/(max-min||1)));const stops=[[65,59,120],[40,141,145],[166,201,106],[242,219,122]],i=Math.min(2,Math.floor(p*3)),a=p*3-i;return 'rgb('+stops[i].map((x,k)=>Math.round(x+(stops[i+1][k]-x)*a)).join(',')+')';}
function groups(rows){const out=new Map();for(const s of rows){if(s.lat===null)continue;const key=s.lat+','+s.lon;if(!out.has(key))out.set(key,[]);out.get(key).push(s);}return [...out.values()];}
function popup(rows,context){const el=document.createElement('div');el.innerHTML=`<b>${esc(rows[0].site)}</b><p>${rows.length} ${context?'context':'selected'} sample(s) at this coordinate.${context?' Selected taxa not recorded.':''}</p>`;for(const s of rows){const b=document.createElement('button');b.textContent=s.id+' · '+fmt(C.displayAge(s,f))+' '+(f.basis==='cal'?'cal BP':'14C BP');b.onclick=()=>showDetail(s.id);el.append(b);}return el;}
function renderMap(){
 points.clearLayers();background.clearLayers();const vals=result.samples.map(s=>f.color==='elevation'?s.elevation:C.displayAge(s,f)).filter(C.finite);const min=vals.length?Math.min(...vals):0,max=vals.length?Math.max(...vals):0;
 for(const rows of groups(result.background))L.circleMarker([rows[0].lat,rows[0].lon],{radius:5,color:'#87938e',weight:1,fillOpacity:.45,fillColor:'#aab4af'}).bindPopup(()=>popup(rows,true)).addTo(background);
 for(const rows of groups(result.samples)){
  const v=rows.map(s=>f.color==='elevation'?s.elevation:C.displayAge(s,f)).filter(C.finite);let color=colorAt(v.length?Math.min(...v):null,min,max);
  if(f.color==='evidence'){
   const os=rows.flatMap(s=>s.occurrences).filter(o=>!f.taxa.length||f.taxa.includes(o.varnum));color=os.some(o=>['1','2'].includes(o.code))?'#386c51':os.some(o=>o.code==='9')?'#c88f42':os.some(o=>o.code==='0')?'#795c8a':'#a7b0ad';
  }
  const m=L.circleMarker([rows[0].lat,rows[0].lon],{radius:Math.min(12,5+Math.log2(rows.length+1)),color:'#fff',weight:1,fillColor:color,fillOpacity:.9}).bindPopup(()=>popup(rows,false)).addTo(points);
  if(f.labels){const a=rows.map(s=>C.displayAge(s,f)).filter(C.finite);m.bindTooltip(a.length?fmt(Math.min(...a))+(Math.max(...a)!==Math.min(...a)?'–'+fmt(Math.max(...a)):'')+' BP':'No age',{permanent:true,direction:'top',className:'age-label'});}
 }
 const units=f.color==='elevation'?'m':f.basis==='cal'?'cal BP':'14C BP';
 $('legend').innerHTML=f.color==='evidence'?'<b>Recorded evidence</b><br><span class="swatch" style="background:#386c51"></span>Rare / present<br><span class="swatch" style="background:#c88f42"></span>Possible contaminant<br><span class="swatch" style="background:#795c8a"></span>Explicit absence<br><span class="swatch" style="background:#a7b0ad"></span>No record':`<b>${f.color==='age'?'Youngest point age':'Elevation'} · ${units}</b><div class="ramp"></div><div class="ticks"><span>${fmt(min)}</span><span>${fmt(max)}</span></div><div>Gray: unavailable / context</div>`;
 $('mapNote').textContent=`${fmt(result.samples.filter(s=>s.lat!==null).length)} mapped samples · ${fmt(result.samples.filter(s=>s.lat===null).length)} unmapped · ${fmt(result.background.length)} context samples`;
}
function fit(){const coords=result.samples.filter(s=>s.lat!==null).map(s=>[s.lat,s.lon]);if(coords.length)map.fitBounds(coords,{padding:[30,30],maxZoom:10});else toast('No selected samples have map coordinates.');}
function sortedSamples(){const key=$('sort').value;return [...result.samples].sort((a,b)=>{if(key==='site')return a.site.localeCompare(b.site)||a.id.localeCompare(b.id);const va=key==='elevation'?a.elevation:C.displayAge(a,f),vb=key==='elevation'?b.elevation:C.displayAge(b,f);if(va===null)return vb===null?0:1;if(vb===null)return -1;return key==='old'?vb-va:va-vb;});}
function renderTable(){const all=sortedSamples(),pages=Math.ceil(all.length/40);page=Math.max(0,Math.min(page,Math.max(0,pages-1)));$('samplesTable').querySelector('tbody').innerHTML=all.slice(page*40,(page+1)*40).map(s=>`<tr><td><button data-sample="${esc(s.id)}">${esc(s.id)} ↗</button></td><td>${esc(s.site)}</td><td>${esc(s.state)}</td><td>${fmt(C.displayAge(s,f))}</td><td>${fmt(s.elevation)} m</td><td><span class="badge">${esc(s.list_code||'—')}</span></td><td>${fmt(s.occurrences.length)}</td></tr>`).join('');$('pageInfo').textContent=pages?`${page+1} / ${pages}`:'0 / 0';$('prev').disabled=page===0;$('next').disabled=page>=pages-1;$('empty').hidden=all.length>0;}
function renderHistogram(){const vals=result.samples.map(s=>C.displayAge(s,f)).filter(C.finite),lo=vals.length?Math.min(0,...vals):0,hi=vals.length?Math.max(1,...vals):1,bins=Array(24).fill(0),step=(hi-lo)/24;for(const v of vals)bins[Math.min(23,Math.floor((v-lo)/step))]++;const max=Math.max(1,...bins);$('histogram').innerHTML=bins.map((n,i)=>`<button class="bar" style="height:${Math.max(2,100*n/max)}%" data-lo="${Math.floor(lo+i*step)}" data-hi="${Math.ceil(lo+(i+1)*step)}" title="${fmt(lo+i*step)}–${fmt(lo+(i+1)*step)} BP: ${n} samples" aria-label="Filter to ${Math.floor(lo+i*step)}–${Math.ceil(lo+(i+1)*step)} BP; ${n} samples"></button>`).join('');$('histUnit').textContent=f.basis==='cal'?'cal BP · IntCal13':'radiocarbon BP';$('histNote').textContent=`${fmt(lo)} → ${fmt(hi)} BP · ${fmt(vals.length)} dated; ${fmt(result.samples.length-vals.length)} without usable point age. Click a bar to filter.`;}
function rawHTML(rows,cols){return '<thead><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(c=>'<td>'+esc(r[c])+'</td>').join('')+'</tr>').join('')+'</tbody>';}
function showDetail(id){const s=D.samples.find(s=>s.id===id);if(!s)return;$('detailTitle').textContent=s.site+' · '+s.id;
 const all=C.relatedTables(D,[s]);let html=`<div class="detailmeta"><span class="badge">${esc(s.state)}</span><span class="badge">${fmt(s.elevation)} m</span><span class="badge">${fmt(C.displayAge(s,f))} ${f.basis==='cal'?'cal BP':'14C BP'}</span></div><p class="hint">Original notes and all age determinations are retained below. Current preferred age flags: ${esc(s.ages.map(a=>a.code||'(blank)').join(', '))}.</p>`;
 const normalized=C.occurrenceRows(D,[s],f,false);html+=`<details open><summary>Taxon records (${normalized.length})</summary><div class="tablewrap"><table>${rawHTML(normalized,['VARNUM','VARNAME','STANDARDIZED_CODE','MCOUNT','TYPE','NOTES'])}</table></div></details>`;
 for(const n of [2,3,8,9,1]){const [name,t]=Object.entries(all).find(([k])=>k.startsWith(`Linked_Table_${n}_`));if(!t.rows.length)continue;
 html+=`<details${n===3?' open':''}><summary>${esc(name.replaceAll('_',' '))} (${t.rows.length})</summary><div class="tablewrap"><table>${n===2?rawHTML(t.columns.filter(c=>t.rows[0][c]!=='').map(c=>({Field:c,Value:t.rows[0][c]})),['Field','Value']):rawHTML(t.rows,t.columns)}</table></div></details>`;}
 $('detailContent').innerHTML=html;$('detailDialog').showModal();}
function initRaw(){const t=D.tables[$('rawTable').value];options('rawColumn',t.columns,'All columns');rawCols=[...t.columns];$('rawColumns').innerHTML=t.columns.map(c=>`<label class="check"><input type="checkbox" value="${esc(c)}" checked>${esc(c)}</label>`).join('');rawPage=0;$('rawSearch').value='';renderRaw();}
function renderRaw(){const name=$('rawTable').value,t=D.tables[name];let rows=$('rawLinked').checked?C.relatedTables(D,result.samples)[name].rows:C.objects(t);rawRows=C.rawFilter(rows,$('rawColumn').value,$('rawOperator').value,$('rawSearch').value);const pages=Math.ceil(rawRows.length/30);rawPage=Math.max(0,Math.min(rawPage,Math.max(0,pages-1)));$('rawGrid').innerHTML=rawHTML(rawRows.slice(rawPage*30,(rawPage+1)*30),rawCols);$('rawCount').textContent=fmt(rawRows.length)+' matching rows';$('rawPage').textContent=pages?`${rawPage+1} / ${pages}`:'0 / 0';$('rawPrev').disabled=rawPage===0;$('rawNext').disabled=rawPage>=pages-1;$('originalDownload').href='data/raw/'+encodeURIComponent(t.file);}
function download(name,content,type='text/plain'){const blob=content instanceof Blob?content:new Blob([content],{type});const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function openExport(){if(C.validate(f)){toast('Fix the filter bounds before exporting.');return;}$('exportCount').textContent=`${fmt(result.samples.length)} selected samples. Gray context points are excluded. All result pages are included.`;$('exportStatus').textContent='';$('exportDialog').showModal();}
async function exportData(kind){
 if(C.validate(f)){toast('Fix the filter bounds before exporting.');return;}
 const samples=result.samples,safe=$('safeCSV').checked,selectedOnly=$('selectedOnly').checked;
 $('exportStatus').textContent='Preparing download…';
 try{
 const m=C.manifest(D,samples,f);m.export_options={spreadsheet_safe:safe,selected_taxa_only:selectedOnly};
 if(kind==='manifest')download('midden-query.json',JSON.stringify(m,null,2),'application/json');
 if(kind==='samples')download('midden-samples.csv',C.csv(C.sampleRows(samples,f),Object.keys(C.sampleRows([D.samples[0]],f)[0]),safe),'text/csv');
 if(kind==='occurrences')download('midden-taxon-records.csv',C.csv(C.occurrenceRows(D,samples,f,selectedOnly),[...C.table(D,5).columns,'CANONICAL_SAMCODE','VARNAME','CURRENTLY_ACCEPTED_VARNAME','STANDARDIZED_CODE','LATITUDE','LONGITUDE','DISPLAY_AGE_BP','AGE_BASIS'],safe),'text/csv');
 if(kind==='geojson')download('midden-samples.geojson',JSON.stringify(C.geojson(D,samples,f)),'application/geo+json');
 if(kind==='matrix'){const a=C.matrix(D,samples,f);download('midden-taxon-matrix.csv',C.csv(a.rows,a.columns,safe),'text/csv');}
 if(kind==='zip'){
  const z=new JSZip(),related=C.relatedTables(D,samples);z.file('query.json',JSON.stringify(m,null,2));
  z.file('samples.csv',C.csv(C.sampleRows(samples,f),Object.keys(C.sampleRows([D.samples[0]],f)[0]),safe));
  z.file('occurrences.csv',C.csv(C.occurrenceRows(D,samples,f,selectedOnly),[...C.table(D,5).columns,'CANONICAL_SAMCODE','VARNAME','CURRENTLY_ACCEPTED_VARNAME','STANDARDIZED_CODE','LATITUDE','LONGITUDE','DISPLAY_AGE_BP','AGE_BASIS'],safe));
  z.file('samples.geojson',JSON.stringify(C.geojson(D,samples,f)));const mat=C.matrix(D,samples,f);z.file('taxon_matrix.csv',C.csv(mat.rows,mat.columns,safe));
  const matched=samples.flatMap(s=>C.matchedAges(s,f).map(a=>({SAMCODE:s.id,...a})));z.file('matched_ages.csv',C.csv(matched,['SAMCODE','index','median','low','high','c14','code','infinite','caution'],safe));
  for(const [name,t] of Object.entries(related))z.file('related_source_tables/'+name+'.csv',C.csv(t.rows,t.columns,safe));
  for(const [name,text] of Object.entries(D.documents))z.file('source_documentation/'+name,text);
  z.file('README.txt',`Packrat Midden Explorer analysis subset\nSource: ${D.source}\n${D.doi}\n\nSelection: ${samples.length} samples. Map context excluded. See query.json for exact filters, IDs, aliases, hashes and export settings.\n\nRaw related tables preserve source strings/sentinels and original ID capitalization. Apply case_aliases from query.json when joining. All original dates for selected samples are in Linked_Table_3_AGEC14; matched_ages.csv reports only preferred dates usable under current settings. When age filtering is off, matched_ages is descriptive, not a restriction on inclusion.\n\nMatrix: VARNUM identifiers. Blank = not recorded, 0 = explicit absence, 1 = rare, 2 = present, 9 = possible contaminant. Multiple distinct codes are separated by |. No implicit zeros.\n\nNormalized numeric blanks include missing/99999/n/a. Original data retain sentinels. Climate variables are modern, not paleo-climate. Calibration: CALIB 7.0.4, IntCal13; cal BP and 14C BP are separate.\n\nLookup and unlinked tables are retained in full as context, including the synonym table. The code-translation table uses exact source citation matches. Every selected occurrence also carries its exact standardized code from MCOUNT_TRANSLATION.\n`);
  download('midden-analysis-subset.zip',await z.generateAsync({type:'blob',compression:'DEFLATE'}),'application/zip');
 }
 $('exportStatus').textContent='Download ready.';toast('Download ready.');
 }catch(e){$('exportStatus').textContent='Export failed: '+e.message;toast('Export failed: '+e.message);}
}
function events(){
 $('filters').onsubmit=e=>e.preventDefault();$('filters').addEventListener('input',e=>{if(e.target.id==='taxonSearch'){renderTaxa();return;}if(e.target.type==='range'){const k=e.target.id==='youngSlider'?'young':'old';$(k).value=e.target.value;$('ageEnabled').checked=true;}update();});
 $('taxonResults').onclick=e=>{const b=e.target.closest('[data-taxon]');if(b){f.taxa.push(b.dataset.taxon);renderTaxa();update();}};
 $('selectedTaxa').onclick=e=>{const b=e.target.closest('[data-remove]');if(b){f.taxa=f.taxa.filter(x=>x!==b.dataset.remove);renderTaxa();update();}};
 $('pinyon').onclick=()=>{f.taxa=tx.filter(r=>r.VARNAME.toLowerCase()==='pinus monophylla').map(r=>r.VARNUM);$('evidence').value='positive';$('taxonSearch').value='';renderTaxa();update();fit();};
 $('clearTaxa').onclick=()=>{f.taxa=[];renderTaxa();update();};$('reset').onclick=()=>{f={...C.defaults,taxa:[]};$('taxonSearch').value='';writeForm();setBasemap();update();fit();};
 for(const k of ['color','labels','base'])$(k).onchange=()=>{readForm();if(k==='base')setBasemap();renderMap();};
 $('fit').onclick=fit;$('useBounds').onclick=()=>{const b=map.getBounds();for(const [k,v]of Object.entries({west:Math.max(-180,b.getWest()),east:Math.min(180,b.getEast()),south:Math.max(-90,b.getSouth()),north:Math.min(90,b.getNorth())}))$(k).value=v.toFixed(4);update();};$('clearBounds').onclick=()=>{for(const k of ['west','east','south','north'])$(k).value='';update();};
 $('sort').onchange=()=>{page=0;renderTable();};$('prev').onclick=()=>{page--;renderTable();};$('next').onclick=()=>{page++;renderTable();};$('samplesTable').onclick=e=>{const b=e.target.closest('[data-sample]');if(b)showDetail(b.dataset.sample);};$('closeDetail').onclick=()=>$('detailDialog').close();
 $('histogram').onclick=e=>{const b=e.target.closest('[data-lo]');if(b){$('young').value=b.dataset.lo;$('old').value=b.dataset.hi;$('ageEnabled').checked=true;update();}};
 for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{for(const v of document.querySelectorAll('.view'))v.hidden=v.id!==b.dataset.view;document.querySelectorAll('[data-view]').forEach(n=>n.classList.toggle('active',n===b));if(b.dataset.view==='explore')setTimeout(()=>map.invalidateSize(),30);if(b.dataset.view==='tables')renderRaw();};
 $('rawTable').onchange=initRaw;for(const k of ['rawColumn','rawOperator','rawSearch','rawLinked'])$(k).addEventListener('input',()=>{rawPage=0;renderRaw();});$('rawColumns').onchange=()=>{rawCols=[...$('rawColumns').querySelectorAll('input:checked')].map(x=>x.value);renderRaw();};$('rawPrev').onclick=()=>{rawPage--;renderRaw();};$('rawNext').onclick=()=>{rawPage++;renderRaw();};$('rawDownload').onclick=()=>download($('rawTable').value+'_filtered.csv',C.csv(rawRows,rawCols,$('safeCSV').checked),'text/csv');
 for(const id of ['downloadTop','moreExports'])$(id).onclick=openExport;$('closeExport').onclick=()=>$('exportDialog').close();document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>exportData(b.dataset.export));$('csvQuick').onclick=()=>exportData('samples');$('geoQuick').onclick=()=>exportData('geojson');$('zipQuick').onclick=()=>exportData('zip');
 $('saveQuery').onclick=()=>download('midden-filters.json',JSON.stringify({version:D.version,filters:f},null,2),'application/json');$('loadQuery').onclick=()=>$('queryFile').click();$('queryFile').onchange=async()=>{try{loadFilters(JSON.parse(await $('queryFile').files[0].text()));setBasemap();fit();toast('Filters restored.');}catch(e){toast('Cannot load filters: '+e.message);}$('queryFile').value='';};
 $('shareQuery').onclick=async()=>{try{if(C.validate(f))throw Error(C.validate(f));const u=new URL(location.href);u.hash='q='+encodeURIComponent(JSON.stringify(f));history.replaceState(null,'',u);await navigator.clipboard.writeText(u.href);toast('View link copied.');}catch(e){toast(location.protocol==='file:'?'Save filters to share a local view.':'Copy this page URL from your address bar.');}};
}
try{
 populate();writeForm();$('workspace').hidden=false;$('loading').hidden=true;initMap();events();
 if(location.hash.startsWith('#q=')){try{loadFilters(JSON.parse(decodeURIComponent(location.hash.slice(3))));}catch(e){toast('Shared filter settings could not be loaded.');}}
 update();initRaw();setBasemap();fit();window.MIDDEN_APP={getFilters:()=>({...f}),getResult:()=>result,loadFilters,exportData,showDetail};
}catch(e){$('loading').hidden=true;$('fatal').hidden=false;$('fatal').textContent='The explorer could not start: '+e.message+'. Keep the entire repository folder together, then run scripts/serve.py.';console.error(e);}
})();
