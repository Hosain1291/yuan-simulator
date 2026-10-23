# data/districts.js 생성: 연도별 지도 파일, 선거구(이름·정수·지역 성향), 지도 밖 의석(원주민·직능·교포)
# 정수는 1969·1972·1975·1980은 위키백과 표, 나머지 중대선거구 시기는 인구 비례(최소 1석) 추정입니다.
import json, math, re
SP='/tmp/claude-0/-home-claude/6a81df4d-04f1-532a-932b-e22fa6852a02/scratchpad'
meta=json.load(open(SP+'/mapmeta.json')); mem=json.load(open(SP+'/member.json'))
KO={'臺北市':'타이베이시','新北市':'신베이시','臺北縣':'타이베이현','基隆市':'지룽시','宜蘭縣':'이란현','桃園縣':'타오위안현','桃園市':'타오위안시','新竹縣':'신주현','新竹市':'신주시',
 '苗栗縣':'먀오리현','臺中縣':'타이중현','臺中市':'타이중시','彰化縣':'장화현','南投縣':'난터우현','雲林縣':'윈린현','嘉義縣':'자이현','嘉義市':'자이시','臺南縣':'타이난현','臺南市':'타이난시',
 '高雄縣':'가오슝현','高雄市':'가오슝시','屏東縣':'핑둥현','臺東縣':'타이둥현','花蓮縣':'화롄현','澎湖縣':'펑후현','金門縣':'진먼현','連江縣':'롄장현(마쭈)','福建省':'푸젠성(진먼·마쭈)'}
NUM='一二三四五六七八九十'
def zhnum(s):
  if s=='十': return 10
  if s.startswith('二十'): return 20+(zhnum(s[2:]) if s[2:] else 0)
  if s.startswith('十'): return 10+NUM.index(s[1])+1
  return NUM.index(s)+1
def ko(k):
  m=re.match(r'(.+?)第(.+)$',k)
  if m: base=m.group(1); n=zhnum(m.group(2)); return ('타이완성' if base=='臺灣省' else KO[base])+' 제'+str(n)+'선거구'
  m=re.match(r'(\S+) (\d+)$',k)
  if m: return KO[m.group(1)]+' 제'+m.group(2)+'선거구'
  return KO.get(k,k)
# 지역 성향 g: +1 녹색(당외·민진당) 강세 … −1 남색(국민당) 강세
G={'臺北市第一':0.15,'臺北市第二':-0.15,'臺北市':0,'高雄市第一':0.25,'高雄市第二':0.35,'高雄市':0.3,'臺北縣':0.1,'宜蘭縣':0.55,'桃園縣':-0.2,'新竹縣':-0.6,'苗栗縣':-0.6,'臺中縣':0.05,
 '彰化縣':0.15,'南投縣':-0.15,'雲林縣':0.3,'嘉義縣':0.45,'臺南縣':0.6,'高雄縣':0.5,'屏東縣':0.4,'臺東縣':-0.6,'花蓮縣':-0.65,'澎湖縣':-0.25,'基隆市':-0.35,'新竹市':-0.1,
 '臺中市':0,'嘉義市':0.45,'臺南市':0.35,'金門縣':-1,'連江縣':-1,'福建省':-1,'新北市':0.05,'桃園市':-0.2}
POP90={'臺北市':2720,'高雄市':1390,'臺北縣':3050,'宜蘭縣':455,'桃園縣':1360,'新竹縣':380,'苗栗縣':545,'臺中縣':1300,'彰化縣':1250,'南投縣':530,'雲林縣':750,'嘉義縣':560,'臺南縣':1040,
 '高雄縣':1130,'屏東縣':890,'臺東縣':255,'花蓮縣':355,'澎湖縣':97,'基隆市':350,'新竹市':325,'臺中市':760,'嘉義市':255,'臺南市':685,'金門縣':43,'連江縣':6}
POP00={'臺北市':2646,'高雄市':1490,'臺北縣':3567,'宜蘭縣':466,'桃園縣':1732,'新竹縣':446,'苗栗縣':560,'臺中縣':1502,'彰化縣':1314,'南投縣':541,'雲林縣':743,'嘉義縣':563,'臺南縣':1107,
 '高雄縣':1236,'屏東縣':908,'臺東縣':245,'花蓮縣':353,'澎湖縣':92,'基隆市':389,'新竹市':368,'臺中市':965,'嘉義市':267,'臺南市':734,'金門縣':53,'連江縣':9}
def lean(g): return {'green':round(math.exp(0.9*g),3),'blue':round(math.exp(-0.45*g),3)}
def county_of(k):
  for c in POP90:
    if k.startswith(c): return c
  return None
def apportion(keys,popf,total,fixed1=()):
  pops=[popf(k) for k in keys]; seats=[1 if k in fixed1 else 0 for k in keys]; rest=total-sum(seats)
  idx=[i for i,k in enumerate(keys) if k not in fixed1]; P=sum(pops[i] for i in idx)
  raw={i:pops[i]/P*rest for i in idx}; fl={i:max(1,math.floor(raw[i])) for i in idx}
  while sum(fl.values())>rest:  # 최소 1석 보정으로 넘친 몫은 소수점이 작은 큰 선거구에서 뺌
    j=max((i for i in idx if fl[i]>1),key=lambda i:fl[i]-raw[i]); fl[j]-=1
  for i in sorted(idx,key=lambda i:-(raw[i]-math.floor(raw[i])))[:rest-sum(fl.values())]: fl[i]+=1
  for i in idx: seats[i]=fl[i]
  return seats
def mmd_rows(y, mapy, mags):
  keys=meta[mapy]['keys']; inv={}
  for c,d in mem.get(mapy,{}).items():
    if d: inv.setdefault(d,[]).append(c)
  rows=[]
  for k,n in zip(keys,mags):
    cs=inv.get(k) or [k]
    g=sum(G.get(c,G.get(county_of(c) or c,0)) for c in cs)/len(cs)
    if k=='福建省': g=-1
    rows.append([k,ko(k),n,lean(g)])
  return rows
OUT={}
# 1969–1986: 위키백과 정수(1983·1986은 1980 정수에서 늘어난 몫을 추정)
M={'1969':('1969',[4,3,4]),'1972':('1972',[5,3,3,5,5,4,1,1]),'1975':('1972',[5,3,3,5,5,4,1,1]),
   '1980':('1980',[8,5,8,6,9,8,5,2,1]),'1983':('1980',[8,5,9,6,9,8,5,2,1]),'1986':('1980',[9,5,10,6,9,8,5,2,1])}
EXTRA={'1969':[],'1972':[['山地山胞','산지 원주민',1],['職業團體','직업단체(농민·어민·노동자·상공·교육)',8]],
 '1975':[['山地山胞','산지 원주민',1],['平地山胞','평지 원주민',1],['職業團體','직업단체(농민·어민·노동자·상공·교육)',8]],
 '1980':[['山地山胞','산지 원주민',1],['平地山胞','평지 원주민',1],['職業團體','직업단체(농민·어민·노동자·상공·교육)',16]],
 '1983':[['山地山胞','산지 원주민',1],['平地山胞','평지 원주민',1],['職業團體','직업단체(농민·어민·노동자·상공·교육)',16]],
 '1986':[['山地山胞','산지 원주민',1],['平地山胞','평지 원주민',1],['職業團體','직업단체(농민·어민·노동자·상공·교육)',16]],
 '1989':[['山地山胞','산지 원주민',2],['平地山胞','평지 원주민',2],['職業團體','직업단체(농민·어민·노동자·상공·교육)',18]],
 '1992':[['山地原住民','산지 원주민',3],['平地原住民','평지 원주민',3]],'1995':[['山地原住民','산지 원주민',3],['平地原住民','평지 원주민',3]],
 '1998':[['山地原住民','산지 원주민',4],['平地原住民','평지 원주민',4]],'2001':[['山地原住民','산지 원주민',4],['平地原住民','평지 원주민',4]],'2004':[['山地原住民','산지 원주민',4],['平地原住民','평지 원주민',4]]}
for y in ['2008','2012','2016','2020','2024']: EXTRA[y]=[['山地原住民','산지 원주민',3],['平地原住民','평지 원주민',3]]
LE_EX={'山地山胞':{'blue':2.2,'green':0.35},'平地山胞':{'blue':2.2,'green':0.35},'山地原住民':{'blue':2.0,'green':0.4,'npsu':3},'平地原住民':{'blue':1.9,'green':0.5},'職業團體':{'blue':1.8,'green':0.4}}
for y,(mapy,mags) in M.items(): OUT[y]={'map':mapy,'rows':mmd_rows(y,mapy,mags)}
def pop_of(table):
  def f(k):
    c=county_of(k); p=table[c]
    if k.startswith('臺北市第') or k.startswith('高雄市第'): return p/2
    if k.startswith('臺北縣第'): return p/3
    return p
  return f
def p89(k):  # 1989 선거구 이름 → 현·시
  inv={d:c for c,d in mem['1989'].items() if d}
  if k=='福建省': return 49
  return pop_of(POP90)(inv.get(k,k))
k89=meta['1989']['keys']; OUT['1989']={'map':'1989','rows':mmd_rows('1989','1989',apportion(k89,p89,79,('福建省',)))}
k92=meta['1992']['keys']
for y,t in (('1992',119),('1995',122)): OUT[y]={'map':'1992','rows':mmd_rows(y,'1992',apportion(k92,pop_of(POP90),t,('金門縣','連江縣')))}
k98=meta['1998']['keys']
for y in ('1998','2001','2004'): OUT[y]={'map':'1998','rows':mmd_rows(y,'1998',apportion(k98,pop_of(POP00),168,('金門縣','連江縣')))}
FAM={'kmt':'blue','dpp':'green','npsu':'npsu','ind':'ind','npp':'npp','tsp':'tsp'}
for y in ['2008','2012','2016','2020','2024']:
  rows=[]
  for k in meta[y]['keys']:
    c=k.split(' ')[0]; g=G.get(c,0); L=lean(g); w,s=meta[y]['win'][k]; f=FAM[w]
    L[f]=round(L.get(f,1)*(1.7+1.6*s),3)
    rows.append([k,ko(k),1,L,w])
  OUT[y]={'map':y,'rows':rows}
for y in OUT:
  for k,n,c in EXTRA[y]: OUT[y]['rows'].append([k,n,c,LE_EX[k],None,1])
  s=sum(r[2] for r in OUT[y]['rows']); print(y,'rows',len(OUT[y]['rows']),'seats',s)
open('/home/claude/yuan-simulator/data/districts.js','w').write('/* 자동 생성 — tools/build_districts.py. 직접 고치지 마세요.\n   [키(한자), 한국어 이름, 정수, 계열별 지역 성향 배수, 실제 1위 정당 계열(소선거구), 지도 밖 의석이면 1] */\nwindow.DISTRICTS='+json.dumps(OUT,ensure_ascii=False,separators=(',',':'))+';\n')
