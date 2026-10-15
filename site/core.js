/* Pure query and export logic shared by the interface and Node tests. */
(function(root){
'use strict';
const defaults={query:'',country:'',state:'',ecoregion:'',listCode:'',useStatus:'',reference:'',taxa:[],logic:'any',evidence:'positive',ageEnabled:false,basis:'cal',ageMode:'point',young:0,old:50000,caution:false,missingAge:false,elevMin:'',elevMax:'',west:'',east:'',south:'',north:'',climateField:'',climateMin:'',climateMax:'',background:true,color:'age',labels:false,base:'outline'};
const table=(d,n)=>Object.entries(d.tables).find(([k])=>k.startsWith(`Linked_Table_${n}_`))[1];
const objectCache=new WeakMap();
const objects=t=>{if(!objectCache.has(t))objectCache.set(t,t.rows.map(r=>Object.fromEntries(t.columns.map((c,i)=>[c,r[i]]))));return objectCache.get(t);};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const num=x=>(x===''||x===null||x===undefined||x==='99999'||x==='n/a')?null:(Number.isFinite(Number(x))?Number(x):null);
const canonical=(d,id)=>d.aliases[id]||id;
function inRange(value,min,max){return (min===''&&max==='')||(finite(value)&&(min===''||value>=Number(min))&&(max===''||value<=Number(max)));}
function ageValue(a,f){return f.basis==='cal'?a.median:a.c14;}
function ageMatches(a,f){
 if(a.infinite||(!f.caution&&a.caution))return false;
 if(f.basis==='cal'&&f.ageMode==='overlap')return finite(a.low)&&finite(a.high)&&a.high>=f.young&&a.low<=f.old;
 const v=ageValue(a,f);return finite(v)&&v>=f.young&&v<=f.old;
}
function usableAge(a,f){return !a.infinite&&(f.caution||!a.caution)&&(f.basis==='cal'&&f.ageMode==='overlap'?finite(a.low)&&finite(a.high):finite(ageValue(a,f)));}
function matchedAges(s,f){return s.ages.filter(a=>f.ageEnabled?ageMatches(a,f):!a.infinite&&(f.caution||!a.caution)&&finite(ageValue(a,f)));}
function displayAge(s,f){const v=matchedAges(s,f).map(a=>ageValue(a,f)).filter(finite);return v.length?Math.min(...v):null;}
function baseMatches(s,f){
 if(f.query&&!s.search.includes(f.query.toLowerCase().trim()))return false;
 for(const [fk,sk] of [['country','country'],['state','state'],['ecoregion','ecoregion'],['listCode','list_code'],['useStatus','use_status']])if(f[fk]&&s[sk]!==f[fk])return false;
 if(f.reference&&!s.references.includes(f.reference))return false;
 if(!inRange(s.elevation,f.elevMin,f.elevMax)||!inRange(s.lon,f.west,f.east)||!inRange(s.lat,f.south,f.north))return false;
 if(f.climateField&&!inRange(s.climate[f.climateField],f.climateMin,f.climateMax))return false;
 if(f.ageEnabled&&!s.ages.some(a=>ageMatches(a,f))&&!(f.missingAge&&!s.ages.some(a=>usableAge(a,f))))return false;
 return true;
}
function evidenceMatches(o,f){return f.evidence==='any'||(f.evidence==='positive'?['1','2'].includes(o.code):o.code===f.evidence);}
function taxonMatches(s,f){
 if(!f.taxa.length)return true;
 if(f.evidence==='not_recorded')return f.taxa.every(id=>!s.occurrences.some(o=>o.varnum===id));
 const has=id=>s.occurrences.some(o=>o.varnum===id&&evidenceMatches(o,f));
 return f.logic==='all'?f.taxa.every(has):f.taxa.some(has);
}
function validate(f){
 if(!['cal','c14'].includes(f.basis))return 'Unknown age basis.';
 for(const [lo,hi,label] of [['young','old','Age'],['elevMin','elevMax','Elevation'],['west','east','Longitude'],['south','north','Latitude'],['climateMin','climateMax','Climate']]){
  if([lo,hi].some(k=>f[k]!==''&&!Number.isFinite(Number(f[k]))))return `${label} bounds must be numbers.`;
  if(f[lo]!==''&&f[hi]!==''&&Number(f[lo])>Number(f[hi]))return `${label} minimum must not exceed maximum.`;
 }
 if(['west','east'].some(k=>f[k]!==''&&Math.abs(f[k])>180)||['south','north'].some(k=>f[k]!==''&&Math.abs(f[k])>90))return 'Coordinates are outside valid latitude/longitude bounds.';
 return '';
}
function filter(d,f){
 const error=validate(f);if(error)throw Error(error);
 const base=d.samples.filter(s=>baseMatches(s,f));
 const samples=base.filter(s=>taxonMatches(s,f));const ids=new Set(samples.map(s=>s.id));
 const background=f.background&&f.taxa.length?base.filter(s=>!ids.has(s.id)&&f.taxa.every(id=>!s.occurrences.some(o=>o.varnum===id))):[];
 return {samples,background,base};
}
function csv(rows,columns,spreadsheetSafe=false){
 if(!columns)columns=[...new Set(rows.flatMap(r=>Object.keys(r)))];
 const escape=v=>{let s=v===null||v===undefined?'':String(v);if(spreadsheetSafe&&/^[=+@\t\r]|^-(?!\d+(?:\.\d+)?$)/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 return [columns.map(escape).join(','),...rows.map(r=>columns.map(c=>escape(r[c])).join(','))].join('\r\n')+'\r\n';
}
function sampleRows(samples,f){return samples.map(s=>({SAMCODE:s.id,SITE:s.site,SAMPLE:s.sample,COUNTRY:s.country,STATE_OR_PROVINCE:s.state,ECOREGION:s.ecoregion,LATITUDE:s.lat,LONGITUDE:s.lon,ELEVATION_M:s.elevation,TAXON_LIST_CODE:s.list_code,USE_STATUS:s.use_status,DISPLAY_AGE_BP:displayAge(s,f),AGE_BASIS:f.basis==='cal'?'cal BP (IntCal13)':'14C BP',MATCHED_AGE_VALUES:matchedAges(s,f).map(a=>ageValue(a,f)).join(';'),SELECTED_AGE_CODES:s.ages.map(a=>a.code).join(';'),REFERENCE_IDS:s.references.join(';'),OCCURRENCE_ROWS:s.occurrences.length,...Object.fromEntries(Object.entries(s.climate).map(([k,v])=>['CLIMATE_'+k,v]))}));}
function occurrenceRows(d,samples,f,selectedOnly=false){
 const raw=objects(table(d,5)),tx=new Map(objects(table(d,4)).map(t=>[t.VARNUM,t]));
 return samples.flatMap(s=>s.occurrences.filter(o=>!selectedOnly||!f.taxa.length||f.taxa.includes(o.varnum)).map(o=>({...raw[o.index],CANONICAL_SAMCODE:s.id,VARNAME:tx.get(o.varnum).VARNAME,CURRENTLY_ACCEPTED_VARNAME:tx.get(o.varnum).CURRENTLY_ACCEPTED_VARNAME,STANDARDIZED_CODE:o.code,LATITUDE:s.lat,LONGITUDE:s.lon,DISPLAY_AGE_BP:displayAge(s,f),AGE_BASIS:f.basis==='cal'?'cal BP (IntCal13)':'14C BP'})));
}
function matrix(d,samples,f){
 const ids=f.taxa.length?[...f.taxa]:[...new Set(samples.flatMap(s=>s.occurrences.map(o=>o.varnum)))].sort((a,b)=>Number(a)-Number(b));
 return {columns:['SAMCODE',...ids.map(id=>'VARNUM_'+id)],rows:samples.map(s=>{
  const row={SAMCODE:s.id},byTaxon=new Map();for(const o of s.occurrences){if(!byTaxon.has(o.varnum))byTaxon.set(o.varnum,new Set());byTaxon.get(o.varnum).add(o.code);}for(const id of ids){const codes=byTaxon.get(id);row['VARNUM_'+id]=codes?[...codes].join('|'):null;}return row;
 })};
}
function manifest(d,samples,f){return {application:'Packrat Midden Explorer',version:d.version,created_utc:new Date().toISOString(),source:d.source,doi:d.doi,filters:f,sample_count:samples.length,sample_ids:samples.map(s=>s.id),map_missing_coordinates:samples.filter(s=>s.lat===null).length,context_included:false,case_aliases:d.aliases,source_files:d.audit.source_files,semantics:{sample_unit:'SAMCODE; multiple samples may share a locality',calibration:'IntCal13, CALIB 7.0.4; BP is before 1950',display_age:'Youngest matching preferred point age; null if unavailable',interval_matching:'Overlap of absolute calibrated age envelope, not full probability density',missing_taxon:'Not recorded is not confirmed absence',climate:'Modern climatology, not reconstructed paleo-climate'}};}
function geojson(d,samples,f){return {type:'FeatureCollection',metadata:manifest(d,samples,f),features:sampleRows(samples,f).map(r=>({type:'Feature',id:r.SAMCODE,geometry:r.LATITUDE===null?null:{type:'Point',coordinates:[r.LONGITUDE,r.LATITUDE]},properties:r}))};}
function relatedTables(d,samples){
 const sam=new Set(samples.map(s=>s.id));const vars=new Set(samples.flatMap(s=>s.occurrences.map(o=>o.varnum)));
 const refs=new Set(samples.flatMap(s=>s.references));const citations=new Set(objects(table(d,1)).filter(r=>refs.has(r.REFNUM)).map(r=>r.CITATION));const out={};
 for(const [name,t]of Object.entries(d.tables)){
  const rows=objects(t);let chosen=rows;
  if(t.columns.includes('SAMCODE'))chosen=rows.filter(r=>sam.has(canonical(d,r.SAMCODE)));
  else if(name.startsWith('Linked_Table_4_')||name.startsWith('Linked_Table_10_'))chosen=rows.filter(r=>vars.has(r.VARNUM));
  else if(name.startsWith('Linked_Table_1_'))chosen=rows.filter(r=>refs.has(r.REFNUM));
  else if(name.startsWith('Linked_Table_6_'))chosen=rows.filter(r=>citations.has(r.REFERENCE));
  // Unlinked and lookup tables retained in full as interpretation context.
  out[name]={columns:t.columns,rows:chosen};
 }
 return out;
}
function rawFilter(rows,column,op,value){const q=value.toLowerCase();return rows.filter(r=>{
 const v=column?r[column]??'':Object.values(r).join(' ');
 if(!value&&op!=='missing')return true;
 if(op==='missing')return ['', '99999','n/a'].includes(String(v));
 if(op==='equals')return String(v).toLowerCase()===q;
 if(op==='gte'||op==='lte'){const n=num(v),target=num(value);return n!==null&&target!==null&&(op==='gte'?n>=target:n<=target);}
 return String(v).toLowerCase().includes(q);
});}
const api={defaults,table,objects,finite,num,canonical,inRange,ageValue,ageMatches,usableAge,matchedAges,displayAge,baseMatches,evidenceMatches,taxonMatches,validate,filter,csv,sampleRows,occurrenceRows,matrix,manifest,geojson,relatedTables,rawFilter};
if(typeof module==='object')module.exports=api;root.MiddenCore=api;
})(typeof window==='object'?window:globalThis);
