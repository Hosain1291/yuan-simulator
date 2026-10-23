# build_smd.py 결과(scratch/smd_YYYY.json)로 선거구 키를 정하고 maps/YYYY.svg를 씀
import json, sys, re, collections, math
SP='/tmp/claude-0/-home-claude/6a81df4d-04f1-532a-932b-e22fa6852a02/scratchpad'
NORM={'臺北市第一':'臺北市','臺北市第二':'臺北市','臺北縣第一':'新北市','臺北縣第二':'新北市','臺北縣第三':'新北市','高雄市第一':'高雄市','高雄市第二':'高雄市','高雄縣':'高雄市',
      '臺中縣':'臺中市','臺南縣':'臺南市','桃園縣':'桃園市'}
EXP_A={'臺北市':8,'新北市':12,'基隆市':1,'宜蘭縣':1,'桃園市':6,'新竹縣':1,'新竹市':1,'苗栗縣':2,'臺中市':8,'彰化縣':4,'南投縣':2,'雲林縣':2,'嘉義縣':2,'嘉義市':1,'臺南市':5,'高雄市':9,'屏東縣':3,'花蓮縣':1,'臺東縣':1,'澎湖縣':1,'金門縣':1,'連江縣':1}
EXP_B=dict(EXP_A,**{'新竹縣':2,'臺南市':6,'高雄市':8,'屏東縣':2})
def area(bb): return bb[2]*bb[3]
for y in sys.argv[1:]:
  r=json.load(open(f'{SP}/smd_{y}.json')); EXP=EXP_A if int(y)<2020 else EXP_B
  D=[d for d in r['dist'] if not (d['bb'][0]+d['bb'][2]/2<175 and d['bb'][1]>400)]
  idx={id(d):j for j,d in enumerate(r['dist'])}; keep={j for j,d in enumerate(r['dist']) if d in D}
  remap={old:new for new,old in enumerate(sorted(keep))}
  for d in D:
    if d.get('twin') is not None: d['twin']=remap.get(d['twin'])
  for d in D:
    d['cty']=NORM.get(d.get('old'),d.get('old'))
    if d['zone']=='KM': d['cty']='金門縣'
    if d['zone']=='MT': d['cty']='連江縣'
  grps=lambda d:set(g['grp'] for g in d['g'] if g.get('grp'))
  vote=collections.defaultdict(collections.Counter)
  for d in D:
    m=D[d['twin']] if d.get('twin') is not None else d
    for g in grps(d): 
      if m['cty']: vote[g][m['cty']]+=1
  gc={g:c.most_common(1)[0][0] for g,c in vote.items()}
  for d in D:
    gs=grps(d)
    if d.get('twin') is not None: gs|=grps(D[d['twin']])
    if gs: d['cty']=collections.Counter(gc[g] for g in gs).most_common(1)[0][0]
  for d in D:  # 확대 지도 면은 본 지도 짝의 현·번호를 따름
    if d.get('twin') is not None:
      t=D[d['twin']]; t['cty']=d['cty']=d['cty'] or t['cty']
      if t['num'] is None: t['num']=d['num']
      if d['num'] is None: d['num']=t['num']
  keys={}
  for j,d in enumerate(D):
    c=d['cty']
    if c is None: d['key']=None; continue
    if EXP.get(c)==1: d['key']=c
    elif d['num'] is not None: d['key']=f'{c} {d["num"]}'
    else: d['key']=None
  # 번호 없는 조각: 같은 현·같은 색에서 가장 가까운 면에 붙임
  for d in D:
    if d['key'] is None and d['cty'] and area(d['bb'])>0.05:
      cx,cy=d['bb'][0]+d['bb'][2]/2,d['bb'][1]+d['bb'][3]/2
      cand=[e for e in D if e['key'] and e['cty']==d['cty'] and e['zone']==d['zone']]
      same=[e for e in cand if e['fill']==d['fill']] or cand
      if same:
        e=min(same,key=lambda e:math.hypot(e['bb'][0]+e['bb'][2]/2-cx,e['bb'][1]+e['bb'][3]/2-cy)); d['key']=e['key']; d['frag']=True
  got=collections.Counter(); seen=set()
  for d in D:
    if d['key'] and d['zone'] in ('main','KM','MT') and d['key'] not in seen: seen.add(d['key']); got[d['key'].split(' ')[0]]+=1
  bad={c:(got.get(c,0),n) for c,n in EXP.items() if got.get(c,0)!=n}
  allkeys=sorted(seen)
  print(y,'districts',len(seen),'bad',bad,'unassigned',[ (j,d['fill'],[round(v) for v in d['bb']]) for j,d in enumerate(D) if not d['key'] and area(d['bb'])>0.05])
  # 같은 키에 색이 여러 개면 경고
  col=collections.defaultdict(set)
  for d in D:
    if d['key'] and d['zone']=='main': col[d['key']].add(d['fill'])
  print('  multi-colour',{k:v for k,v in col.items() if len(v)>1})
  json.dump([{'key':d['key'],'zone':d['zone'],'fill':d['fill'],'d':d['d'],'bb':d['bb']} for d in D if d['key']],open(f'{SP}/smdfin_{y}.json','w'),ensure_ascii=False)
