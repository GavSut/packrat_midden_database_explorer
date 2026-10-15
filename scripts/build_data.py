#!/usr/bin/env python3
"""Compile the untouched USGS CSV release into static browser assets; stdlib only."""
from pathlib import Path
import csv, io, json, hashlib, re, collections, shutil
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/raw'
OUT = ROOT / 'site/data'
AGE_CODE='RECOMMENDED_AGE_OF_MIDDEN_ASSEMBLAGE'
MEDIAN='CALIB704_CALENDAR_YR_BP_MEDIAN_PROBABILITY'

def number(s):
    try:
        x=float(str(s).strip())
        return x if x != 99999 and abs(x) != float('inf') and x == x else None
    except (TypeError, ValueError): return None

def read_csv(path):
    b=path.read_bytes()
    try: text=b.decode('utf-8-sig'); encoding='utf-8-sig'
    except UnicodeDecodeError: text=b.decode('cp1252'); encoding='cp1252'
    reader=csv.DictReader(io.StringIO(text,newline=''))
    reader.fieldnames=[s.strip() for s in reader.fieldnames]
    rows=[]
    for row in reader:
        if None in row or any(v is None for v in row.values()):
            raise ValueError(f'Malformed CSV row {reader.line_num}: {path.name}')
        rows.append({k:v.strip() for k,v in row.items()})
    return rows, reader.fieldnames, encoding

def unique(rows,keys,label):
    result={}
    for row in rows:
        key=tuple(row[k] for k in keys)
        if key in result: raise ValueError(f'Duplicate {label}: {key}')
        result[key]=row
    return result

def age(row,index):
    notes=' '.join(row.get(k,'') for k in ['CALIBRATION_NOTES','COMMENTS'])
    infinite=bool(re.search(r'\binfinite\b|age\s+is\s*>|age\s+is\s+greater',notes,re.I))
    values=[number(row[k]) for k in [MEDIAN,'ABSOLUTE_LOWER_CALENDAR_AGE','ABSOLUTE_UPPER_CALENDAR_AGE','AGEC14']]
    if infinite: values=[None]*4
    median,low,high,c14=values
    if low is not None and high is not None and low>high: raise ValueError('Reversed age interval')
    return dict(index=index,median=median,low=low,high=high,c14=c14,code=row[AGE_CODE],infinite=infinite,
                caution=row[AGE_CODE] not in ['X','X1-PA'] or row.get('DATE_SUSPECT','') not in ['', '99999','n/a'])

def selected_ages(ages):
    for codes in [{'X1-PA','X1-PA(FST)'},{'X'},{'X?'},{'X2'}]:
        chosen=[a for a in ages if a['code'] in codes]
        if chosen:
            return [dict(a,caution=a['caution'] or len(chosen)>1) for a in chosen]
    return [dict(a,caution=True) for a in ages if a['code']=='?'] or [dict(a,caution=True) for a in ages]

def build():
    OUT.mkdir(parents=True,exist_ok=True)
    tables={}; parsed={}; sources=[]; documents={}
    for path in sorted(RAW.iterdir()):
        info=dict(file=path.name,bytes=path.stat().st_size,sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        if re.match(r'(Linked|Unlinked|Lookup)_Table_',path.name):
            rows,cols,enc=read_csv(path)
            parsed[path.stem]=rows
            tables[path.stem]=dict(columns=cols,rows=[[r[c] for c in cols] for r in rows],file=path.name)
            info.update(rows=len(rows),encoding=enc)
        else:
            raw_bytes=path.read_bytes()
            try: documents[path.name]=raw_bytes.decode('utf-8-sig')
            except UnicodeDecodeError: documents[path.name]=raw_bytes.decode('cp1252')
        sources.append(info)
    def t(n):return next(v for k,v in parsed.items() if k.startswith(f'Linked_Table_{n}_'))
    sam=unique(t(2),['SAMCODE'],'SAMCODE'); taxa=unique(t(4),['VARNUM'],'VARNUM')
    refs=unique(t(1),['REFNUM'],'REFNUM'); trans=unique(t(7),['SAMCODE','VARNUM','MCOUNT'],'translation')
    unique(t(5),['SAMCODE','VARNUM','MCOUNT'],'occurrence')
    climate=unique(t(8),['SAMCODE'],'climate'); eco=unique(t(9),['SAMCODE'],'ecoregion')
    unique(t(10),['VARNUM'],'PFT')
    # Case-only differences are resolved only when the master ID is unique.
    case_ids=collections.defaultdict(list)
    for (sid,) in sam:case_ids[sid.casefold()].append(sid)
    aliases={}
    for n in [3,5,7,8,9]:
        for row in t(n):
            sid=row['SAMCODE']
            if (sid,) not in sam and len(case_ids[sid.casefold()])==1:
                aliases[sid]=case_ids[sid.casefold()][0]
    def canonical(sid):return aliases.get(sid,sid)
    errors=[]
    for n in [3,5,7,8,9]:
        for row in t(n):
            if (canonical(row['SAMCODE']),) not in sam:errors.append(f'orphan sample in table {n}: {row["SAMCODE"]}')
    for n in [5,7,10]:
        for row in t(n):
            if (row['VARNUM'],) not in taxa:errors.append(f'orphan taxon in table {n}: {row["VARNUM"]}')
    if errors:raise ValueError('\n'.join(errors))
    ages=collections.defaultdict(list); occurrences=collections.defaultdict(list)
    for i,row in enumerate(t(3)):ages[canonical(row['SAMCODE'])].append(age(row,i))
    occurrences_flat=[]
    for i,row in enumerate(t(5)):
        key=tuple(row[k] for k in ['SAMCODE','VARNUM','MCOUNT'])
        if key not in trans:raise ValueError(f'Missing count translation: {key}')
        item=dict(index=i,samcode=canonical(row['SAMCODE']),varnum=row['VARNUM'],code=trans[key]['0_1_2_CODE'],notes=row['NOTES'])
        occurrences[canonical(row['SAMCODE'])].append(item);occurrences_flat.append(item)
    missing_refs=set();samples=[]
    for i,row in enumerate(t(2)):
        sid=row['SAMCODE'];c=climate.get((sid,),{});e=eco.get((sid,),{})
        lat=number(row['BEST_OR_PUB_LATDECDEGCON']);lon=number(row['BEST_OR_PUB_LONGDECDEGCON'])
        if lat is None or lon is None or not(-90<=lat<=90 and -180<=lon<=180):lat=lon=None
        elev=number(row['BEST_ELEV(M)'])
        if elev is None:elev=number(row['ELEV(M)1'])
        refids=set()
        for k,v in row.items():
            if k.startswith('REFNUM') or k=='RENUM11' or k=='TAXON_LIST_SOURCE':refids.update(re.findall(r'\b\d+m\b',v))
        for a in ages[sid]:refids.update(re.findall(r'\b\d+m\b',t(3)[a['index']]['REFERENCE']))
        missing_refs.update(r for r in refids if (r,) not in refs)
        samples.append(dict(id=sid,index=i,site=row['SITE'],sample=row['SAMPLE'],lat=lat,lon=lon,elevation=elev,
          country=row['COUNTRY'],state=row['STATE_OR_PROVINCE'],ecoregion=e.get('WWF_LEVEL_III_ECOREGION_CATEGORY',''),
          list_code=row['TAXON_LIST_CODE'],use_status=row['USE_STATUS'],references=sorted(refids),
          ages=selected_ages(ages[sid]),all_ages=ages[sid],occurrences=occurrences[sid],
          climate={k:number(v) for k,v in c.items() if k not in ['SAMCODE','SITE','COUNTRY','STATE_OR_PROVINCE']},
          search=' '.join([sid,row['SITE'],row['SAMPLE'],row['LOCALITY'],row['COMMENTS'],row['COUNTY_OR_REGIONAL DISTRICT']]).lower()))
    audit=dict(samples=len(samples),taxa=len(t(4)),occurrences=len(t(5)),dates=len(t(3)),references=len(t(1)),
       mapped_samples=sum(s['lat'] is not None for s in samples),climate_samples=len(t(8)),
       missing_reference_ids=sorted(missing_refs),join_errors=errors,
       translation_codes=dict(collections.Counter(o['code'] for o in occurrences_flat)),
       selected_age_codes=dict(collections.Counter(a['code'] for s in samples for a in s['ages'])),
       case_aliases=aliases,source_files=sources)
    data=dict(version='1.1.0',source='USGS North American Packrat Midden Database, Version 5.0 (2022)',
        doi='https://doi.org/10.5066/P91UOARW',aliases=aliases,documents=documents,tables=tables,samples=samples,audit=audit)
    def compact(rows, columns):
        return [[row.get(k) for k in columns] for row in rows]
    def js_file(name, variable, value):
        text=json.dumps(value,ensure_ascii=False,separators=(',',':'),allow_nan=False)
        (OUT/name).write_text(variable+' = '+text+';\n',encoding='utf-8')
    # Send only the exploration index at startup. Raw source tables load on demand.
    sample_columns=list(samples[0])
    age_columns=['index','median','low','high','c14','code','infinite','caution']
    occurrence_columns=['index','varnum','code']
    climate_columns=next(v['columns'] for k,v in tables.items() if k.startswith('Linked_Table_8_'))
    climate_columns=[k for k in climate_columns if k not in ['SAMCODE','SITE','COUNTRY','STATE_OR_PROVINCE']]
    packed=[]
    for sample in samples:
        row=dict(sample)
        for key in ['ages','all_ages']:row[key]=compact(sample[key],age_columns)
        row['occurrences']=compact(sample['occurrences'],occurrence_columns)
        row['climate']=[sample['climate'].get(k) for k in climate_columns]
        packed.append(row)
    light=dict(data)
    light.pop('documents')
    light['samples']=compact(packed,sample_columns)
    light['packing']=dict(samples=sample_columns,ages=age_columns,occurrences=occurrence_columns,climate=climate_columns)
    light['tables']={k:dict(v,rows=v['rows'] if k.startswith(('Linked_Table_1_','Linked_Table_4_','Lookup_')) else [],row_count=len(v['rows'])) for k,v in tables.items()}
    js_file('explorer.js','window.MIDDEN_DATA',light)
    js_file('details.js','window.MIDDEN_DETAILS',dict(version=data['version'],tables=tables,documents=documents))
    # Retire the old all-in-one bundle to prevent accidental heavy startup loads.
    old=OUT/'database.js'
    if old.exists():old.unlink()
    (OUT/'audit.json').write_text(json.dumps(audit,indent=2)+'\n')
    # Retain original bytes for downloads. No silent encoding/sentinel changes.
    shutil.copytree(RAW,OUT/'raw',dirs_exist_ok=True)
    for f in ['countries.geojson']:
        obj=json.loads((ROOT/'site/vendor'/f).read_text())
        for feat in obj['features']:feat['properties']={'name':feat['properties'].get('ADMIN','')}
        (OUT/'outlines.js').write_text('window.MIDDEN_OUTLINES = '+json.dumps(obj,separators=(',',':'))+';\n')
    print(json.dumps({k:v for k,v in audit.items() if k!='source_files'},indent=2))
if __name__=='__main__':build()
