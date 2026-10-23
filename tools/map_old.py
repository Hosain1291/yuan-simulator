# 중대선거구(1969–1998) 지도: 라벨을 읽어 선거구 이름을 path에 붙이고 라벨·지시선을 지운 지도를 만든다
import asyncio, json, re, sys
from playwright.async_api import async_playwright
YEARS=['1969','1972','1980','1989','1992','1998']
JS=r'''
() => {
 const svg=document.querySelector('svg');
 const cons=[...svg.querySelectorAll('#constituency path')];
 const leg=svg.querySelector('#legend'); const kids=[...leg.children];
 const out=[];
 for(let i=0;i<kids.length;i++){ const t=kids[i]; if(t.tagName!=='text') continue;
   const zh=t.childNodes[0].textContent.trim(); const en=t.textContent.replace(zh,'').replace('​','').trim();
   let pt=null; const nx=kids[i+1];
   if(nx&&nx.tagName==='path'){ const n=nx.getAttribute('d').trim().split(/[\s,]+/).filter(x=>/^-?[\d.]+$/.test(x)).map(Number); pt=[n[n.length-2],n[n.length-1]]; }
   else pt=[+t.getAttribute('x'),+t.getAttribute('y')];
   const P=svg.createSVGPoint(); P.x=pt[0]; P.y=pt[1];
   let hit=cons.findIndex(p=>p.isPointInFill(P));
   if(hit<0){ let best=1e9; cons.forEach((p,j)=>{ const b=p.getBBox(); const dx=Math.max(b.x-pt[0],0,pt[0]-b.x-b.width), dy=Math.max(b.y-pt[1],0,pt[1]-b.y-b.height); const d=Math.hypot(dx,dy); if(d<best){best=d;hit=j;} }); }
   out.push({zh,en,path:hit,pt}); }
 return {n:cons.length,labels:out};
}'''
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page()
    res={}
    for y in YEARS:
      await pg.goto(f'http://localhost:8765/maps/original/{y}.svg')
      r=await pg.evaluate(JS); res[y]=r
      used=[l['path'] for l in r['labels']]
      dup=[u for u in used if used.count(u)>1]; miss=[i for i in range(r['n']) if i not in used]
      print(y,'paths',r['n'],'labels',len(r['labels']),'dup',sorted(set(dup)),'unlabeled',miss)
    json.dump(res,open('/tmp/claude-0/-home-claude/6a81df4d-04f1-532a-932b-e22fa6852a02/scratchpad/oldmap.json','w'),ensure_ascii=False)
    await b.close()
asyncio.run(main())
