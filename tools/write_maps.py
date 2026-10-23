# 정리된 지도 SVG(maps/YYYY.svg)와 선거구 목록(data/map-districts.json, 중간 산출물)을 씁니다.
#  - 중대선거구 지도: 라벨 글자와 지시선을 지우고 각 선거구 면에 data-k(선거구 이름)를 붙임
#  - 소선거구 지도: 범례·막대그래프·외곽선 글자 라벨을 지우고 선거구 면만 남김, 확대 지도는 class="ins"
import json, re, os, collections
SP='/tmp/claude-0/-home-claude/6a81df4d-04f1-532a-932b-e22fa6852a02/scratchpad'
ROOT='/home/claude/yuan-simulator'
def rnd(d, nd=1):
  return re.sub(r'-?\d+\.\d+', lambda m: ('%.'+str(nd)+'f')%float(m.group()), d)
out={}
old=json.load(open(SP+'/oldmap.json'))
for y,r in old.items():
  s=open(f'{ROOT}/maps/original/{y}.svg',encoding='utf8').read()
  cons=re.search(r'<g id="constituency"[^>]*>(.*?)</g>',s,re.S).group(1)
  paths=re.findall(r'<path[^>]*\sd="([^"]*)"',cons)
  box=re.search(r'<g id="box"[^>]*>(.*?)</g>',s,re.S)
  names=[None]*len(paths)
  for l in r['labels']: names[l['path']]=l['zh']
  if y=='1998': names[4]='臺北縣第一'
  assert all(names), (y,names)
  body=''.join(f'<path data-k="{n}" d="{rnd(p)}"/>' for n,p in zip(names,paths))
  frames=''.join(f'<path class="frame" d="{rnd(p)}"/>' for p in re.findall(r'\sd="([^"]*)"',box.group(1))) if box else ''
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 2055">{frames}<g class="dist">{body}</g></svg>'
  open(f'{ROOT}/maps/{y}.svg','w').write(svg)
  # 라벨 위치(선거구 이름 붙일 자리): 지시선 끝점
  out[y]={'kind':'mmd','keys':names,'pts':{l['zh'] if not (y=='1998' and l['path']==4) else '臺北縣第一':[round(v) for v in l['pt']] for l in r['labels']}}
  print(y,len(paths),'paths',len(svg)//1024,'KB')
def party_of(rgb):
  r,g,b=rgb
  if abs(r-g)<12 and abs(g-b)<12: return 'ind'
  if r>150 and g<60: return 'npsu'
  if r>190 and g>150 and b<40: return 'npp'
  if r>150 and 70<g<100 and b<60: return 'tsp'
  if b>r and b>=g: return 'kmt'
  if g>r and g>b: return 'dpp'
  return '?'
def strength(rgb, p):
  L=(max(rgb)+min(rgb))/2/255
  if p=='kmt': return max(0,min(1,(0.85-L)/0.6))
  if p=='dpp': return max(0,min(1,(0.75-L)/0.6))
  return 0.5
for y in ['2008','2012','2016','2020','2024']:
  F=json.load(open(f'{SP}/smdfin_{y}.json'))
  main=''.join(f'<path data-k="{d["key"]}" d="{rnd(d["d"],2)}"/>' for d in F if d['zone'] in ('main','KM','MT'))
  ins=''.join(f'<path data-k="{d["key"]}" d="{rnd(d["d"],2)}"/>' for d in F if d['zone'] in ('T','K'))
  frames='<path class="frame" d="M0 0H175V255" fill="none"/><path class="frame" d="M0 100H175M100 0V100M55 100V155M0 155H175" fill="none"/>'
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 575">{frames}<g class="dist">{main}</g><g class="dist ins">{ins}</g></svg>'
  open(f'{ROOT}/maps/{y}.svg','w').write(svg)
  # 실제 당선 정당과 득표 강도(색 진하기)
  area=collections.defaultdict(lambda: collections.Counter()); win={}
  for d in F:
    if d['zone'] not in ('main','KM','MT'): continue
    rgb=tuple(map(int,re.findall(r'\d+',d['fill'])[:3]))
    area[d['key']][rgb]+=d['bb'][2]*d['bb'][3]
  for k,c in area.items():
    rgb=c.most_common(1)[0][0]; p=party_of(rgb); win[k]=[p,round(strength(rgb,p),2)]
  pc=collections.Counter(v[0] for v in win.values())
  out[y]={'kind':'smd','keys':sorted(win),'win':win}
  print(y,len(win),dict(pc),len(svg)//1024,'KB')
json.dump(out,open(SP+'/mapmeta.json','w'),ensure_ascii=False,indent=0)
