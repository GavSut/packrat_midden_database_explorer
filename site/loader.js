/* Small, local-file-compatible loader: raw tables are needed only for inspection/export. */
(function(root){
'use strict';
let pending;
function hydrate(d){
 if(!d.packing)return d;
 const p=d.packing,object=(columns,row)=>Object.fromEntries(columns.map((k,i)=>[k,row[i]]));
 d.samples=d.samples.map(row=>{const s=object(p.samples,row);for(const k of ['ages','all_ages'])s[k]=s[k].map(a=>object(p.ages,a));s.occurrences=s.occurrences.map(o=>({...object(p.occurrences,o),samcode:s.id}));s.climate=object(p.climate,s.climate);return s;});
 delete d.packing;return d;
}
function ensureDetails(){
 const d=root.MIDDEN_DATA;if(d.documents)return Promise.resolve(d);
 if(pending)return pending;
 pending=new Promise((resolve,reject)=>{
  function finish(){const detail=root.MIDDEN_DETAILS;if(!detail||detail.version!==d.version){pending=null;reject(Error('Data version mismatch. Refresh the page and retry.'));return;}
   d.tables=detail.tables;d.documents=detail.documents;delete root.MIDDEN_DETAILS;resolve(d);
  }
  if(root.MIDDEN_DETAILS){finish();return;}
  const script=document.createElement('script');script.src='data/details.js?v='+encodeURIComponent(d.version);script.onload=finish;script.onerror=()=>{script.remove();pending=null;reject(Error('Could not load source tables. Check your connection, then retry.'));};document.head.append(script);
 });return pending;
}
root.MiddenLoader={hydrate,ensureDetails};
})(window);
