# 소선거구(2008–2024) 지도 정리:
#  1) 선거구 면(path)과 그 안의 흰 숫자 라벨(외곽선 글자)을 찾고, 숫자는 tesseract로 읽음
#  2) 1998년 지도(현·시 경계와 이름이 있음)에 본섬을 겹쳐 각 면이 어느 현·시인지 판정
#  3) 왼쪽 위 확대 지도(타이베이·가오슝)는 본 지도 면과 상자 겹침으로 짝지음, 진먼·마쭈는 상자로 판정
#  4) 라벨·범례·막대그래프를 모두 지우고 선거구 면만 남긴 SVG + 선거구 목록 JSON을 씀
import asyncio, json, sys, subprocess, os, re
from playwright.async_api import async_playwright
SP='/tmp/claude-0/-home-claude/6a81df4d-04f1-532a-932b-e22fa6852a02/scratchpad'
ROOT='/home/claude/yuan-simulator'
URL='http://localhost:8765/maps/original/'
GET_NEW=r'''
() => {
 const svg=document.querySelector('svg'); const els=[...svg.querySelectorAll('path')];
 const D=[],G=[],B=[];
 els.forEach((e,i)=>{ const cs=getComputedStyle(e); e.dataset.i=i;
   const sw=parseFloat(cs.strokeWidth);
   const f=cs.fill, plain=['none','rgb(255, 255, 255)','rgb(250, 250, 250)','rgb(0, 0, 0)'].includes(f)||/rgba/.test(f);
   let b; try{ b=e.getBBox(); }catch(_){ return; }
   const cx=b.x+b.width/2, cy=b.y+b.height/2;
   const legend=(cx<175&&cy>440)||(cx>380&&cy>270)||(cx<175&&cy>150&&cy<255);
   if(!plain&&!legend&&cs.opacity==='1'&&(cs.stroke==='rgb(250, 250, 250)'||cs.stroke==='none')&&b.width*b.height>0.05) D.push(e);
   else if(f==='rgb(255, 255, 255)'&&cs.stroke==='none') G.push(e); });
 const P=svg.createSVGPoint();
 const inside=(e,x,y)=>{ P.x=x;P.y=y; return e.isPointInFill(P); };
 const dist=D.map(e=>{ const b=e.getBBox(); return {i:+e.dataset.i,cls:e.getAttribute('class'),fill:getComputedStyle(e).fill,bb:[b.x,b.y,b.width,b.height],d:e.getAttribute('d'),g:[],pt:null}; });
 G.forEach(g=>{ const b=g.getBBox(); const cx=b.x+b.width/2, cy=b.y+b.height/2; const hits=D.map((d,j)=>inside(d,cx,cy)?j:-1).filter(j=>j>=0);
   if(hits.length){ const j=hits[hits.length-1]; const gr=g.closest('g[data-name]'); dist[j].g.push({i:+g.dataset.i,bb:[b.x,b.y,b.width,b.height],grp:gr&&gr.id!=='c'?gr.id+':'+gr.dataset.name:''}); } });
 // 면 안쪽 점: 라벨 중심, 없으면 상자 안 격자에서 면 안에 드는 점(가운데에 가까운 것)
 dist.forEach((d,j)=>{ const e=D[j];
   if(d.g.length){ const xs=d.g.map(g=>g.bb[0]+g.bb[2]/2), ys=d.g.map(g=>g.bb[1]+g.bb[3]/2); const x=xs.reduce((a,b)=>a+b)/xs.length, y=ys.reduce((a,b)=>a+b)/ys.length; if(inside(e,x,y)){ d.pt=[x,y]; return; } }
   const [bx,by,bw,bh]=d.bb; let best=null,bd=1e9;
   for(let a=1;a<20;a++) for(let c=1;c<20;c++){ const x=bx+bw*a/20, y=by+bh*c/20; if(inside(e,x,y)){ const dd=Math.hypot(a-10,c-10); if(dd<bd){bd=dd;best=[x,y];} } }
   d.pt=best||[bx+bw/2,by+bh/2]; });
 const vb=svg.getAttribute('viewBox');
 return {dist,vb};
}'''
GET_OLD=r'''
(pts) => { const svg=document.querySelector('svg'); const cons=[...svg.querySelectorAll('#constituency path')];
 const P=svg.createSVGPoint();
 return pts.map(([x,y])=>{ P.x=x;P.y=y; return cons.findIndex(p=>p.isPointInFill(P)); }); }'''
OLDBB=r'''() => [...document.querySelectorAll('#constituency path')].map(p=>{const b=p.getBBox(); return [b.x,b.y,b.width,b.height];})'''

async def ocr(b, pg, d, y, j):
  ids=[g['i'] for g in d['g']]
  xs=[g['bb'][0] for g in d['g']]; ys=[g['bb'][1] for g in d['g']]
  x1=[g['bb'][0]+g['bb'][2] for g in d['g']]; y1=[g['bb'][1]+g['bb'][3] for g in d['g']]
  vb=[min(xs)-1,min(ys)-1,max(x1)-min(xs)+2,max(y1)-min(ys)+2]
  svgtxt=await pg.evaluate('''([ids,vb])=>{ const ps=[...document.querySelectorAll('path')]; return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb.join(' ')+'" style="width:'+(vb[2]/vb[3]*90)+'px;height:90px;background:#fff">'+ids.map(i=>'<path fill="#000" d="'+ps[i].getAttribute('d')+'"/>').join('')+'</svg>'; }''',[ids,vb])
  p2=await b.new_page(viewport={'width':1200,'height':140})
  await p2.set_content('<body style="margin:20px;background:#fff">'+svgtxt+'</body>')
  f=f'{SP}/ocr/{y}_{j}.png'; await p2.screenshot(path=f); await p2.close()
  return subprocess.run(['tesseract',f,'-','--psm','7','-c','tessedit_char_whitelist=0123456789'],capture_output=True,text=True).stdout.strip()

def inbox(c,box): return box[0]<=c[0]<=box[2] and box[1]<=c[1]<=box[3]
def iou(a,b):
  ax1,ay1,ax2,ay2=a[0],a[1],a[0]+a[2],a[1]+a[3]; bx1,by1,bx2,by2=b[0],b[1],b[0]+b[2],b[1]+b[3]
  iw=max(0,min(ax2,bx2)-max(ax1,bx1)); ih=max(0,min(ay2,by2)-max(ay1,by1)); I=iw*ih
  U=a[2]*a[3]+b[2]*b[3]-I; return I/U if U>0 else 0

async def main():
  years=sys.argv[1:]
  os.makedirs(SP+'/ocr',exist_ok=True)
  old=json.load(open(SP+'/oldmap.json'))['1998']
  oldnames=[None]*29
  for l in old['labels']: oldnames[l['path']]=l['zh']
  oldnames[4]='臺北縣第一'; oldnames[6]='臺北縣第三'
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(); po=await b.new_page()
    await po.goto(URL+'1998.svg'); obb=await po.evaluate(OLDBB)
    main_old=[i for i,n in enumerate(oldnames) if n not in ('澎湖縣','金門縣','連江縣')]
    OB=[min(obb[i][0] for i in main_old),min(obb[i][1] for i in main_old),max(obb[i][0]+obb[i][2] for i in main_old),max(obb[i][1]+obb[i][3] for i in main_old)]
    for y in years:
      await pg.goto(URL+y+'.svg'); r=await pg.evaluate(GET_NEW); D=r['dist']
      for j,d in enumerate(D):
        d['num']=None
        if d['g'] and len(d['g'])<=6:
          t=await ocr(b,pg,d,y,j); d['num']=int(t) if t.isdigit() else None
        cx,cy=d['bb'][0]+d['bb'][2]/2,d['bb'][1]+d['bb'][3]/2
        d['zone']='T' if inbox((cx,cy),(0,0,100,100)) else 'K' if inbox((cx,cy),(100,0,175,100)) else 'KM' if inbox((cx,cy),(0,100,55,155)) else 'MT' if inbox((cx,cy),(55,100,175,155)) else 'X' if inbox((cx,cy),(0,0,175,255)) else 'main'
      mains=[d for d in D if d['zone']=='main' and d['bb'][0]>150]
      NB=[min(d['bb'][0] for d in mains),min(d['bb'][1] for d in mains),max(d['bb'][0]+d['bb'][2] for d in mains),max(d['bb'][1]+d['bb'][3] for d in mains)]
      tf=lambda x,yy:[OB[0]+(x-NB[0])/(NB[2]-NB[0])*(OB[2]-OB[0]), OB[1]+(yy-NB[1])/(NB[3]-NB[1])*(OB[3]-OB[1])]
      mm=[d for d in D if d['zone']=='main']
      hits=await po.evaluate(GET_OLD,[tf(*d['pt']) for d in mm])
      for d,h in zip(mm,hits):
        d['old']=oldnames[h] if h>=0 else None
        if d['bb'][0]+d['bb'][2]/2<120: d['old']='澎湖縣'
      # 확대 지도 짝짓기: 큰 면 하나를 기준으로 배율·이동을 정하고 상자 겹침이 가장 큰 경우를 고름
      for z in ('T','K'):
        ins=[d for d in D if d['zone']==z]
        if not ins: continue
        big=max(ins,key=lambda d:d['bb'][2]*d['bb'][3]); best=(-1,None)
        for c in mm:
          if c['bb'][2]<2: continue
          s=c['bb'][2]/big['bb'][2]
          if abs(c['bb'][3]/big['bb'][3]-s)/s>0.12: continue
          tx=c['bb'][0]-big['bb'][0]*s; ty=c['bb'][1]-big['bb'][1]*s
          sc=0; pairs=[]
          for d in ins:
            tb=[d['bb'][0]*s+tx,d['bb'][1]*s+ty,d['bb'][2]*s,d['bb'][3]*s]
            k=max(mm,key=lambda m:iou(tb,m['bb'])); v=iou(tb,k['bb']); sc+=v; pairs.append((d,k,v))
          if sc>best[0]: best=(sc,pairs,s)
        print(y,z,'match score',round(best[0],2),'/',len(ins),'scale',round(best[2],3))
        for d,k,v in best[1]:
          d['twin']=mm.index(k); d['iou']=round(v,2)
          if v>0.5 and d['num'] is not None and k['num'] is None: k['num']=d['num']
          if v>0.5 and k['num'] is not None and d['num'] is None: d['num']=k['num']
      json.dump(r,open(f'{SP}/smd_{y}.json','w'),ensure_ascii=False)
      for j,d in enumerate(D):
        gs=sorted(set(g['grp'] for g in d['g'] if g.get('grp')))
        print(y,j,d['zone'],d.get('old'),d['num'],d.get('twin'),d.get('iou'),d['fill'].replace(' ',''),'|'.join(gs),[round(v) for v in d['bb']])
    await b.close()
asyncio.run(main())
