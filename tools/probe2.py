import asyncio, json, sys
from playwright.async_api import async_playwright
JS=r'''
() => {
 const svg=document.querySelector('svg');
 const els=[...svg.querySelectorAll('path')];
 const D=[],G=[];
 els.forEach((e,i)=>{ const cs=getComputedStyle(e); e.dataset.i=i;
   if(cs.stroke==='rgb(250, 250, 250)'&&cs.fill!=='none'&&parseFloat(cs.strokeWidth)<0.3) D.push(e);
   else if((cs.fill==='rgb(255, 255, 255)'||cs.fill==='rgb(250, 250, 250)')&&cs.stroke==='none') G.push(e); });
 const bb=e=>{ const b=e.getBBox(); return [b.x,b.y,b.width,b.height]; };
 const dist=D.map(e=>({i:+e.dataset.i,cls:e.getAttribute('class'),fill:getComputedStyle(e).fill,bb:bb(e),g:[]}));
 const P=svg.createSVGPoint();
 G.forEach(g=>{ const b=g.getBBox(); P.x=b.x+b.width/2; P.y=b.y+b.height/2; const hits=D.map((d,j)=>d.isPointInFill(P)?j:-1).filter(j=>j>=0);
   if(hits.length){ const j=hits[hits.length-1]; dist[j].g.push({i:+g.dataset.i,bb:[b.x,b.y,b.width,b.height]}); } });
 return dist;
}'''
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page()
    out={}
    for y in sys.argv[1:]:
      await pg.goto(f'http://localhost:8765/maps/original/{y}.svg'); r=await pg.evaluate(JS); out[y]=r
      print(y,'districtpaths',len(r),'with glyphs',sum(1 for d in r if d['g']), 'glyphs', sum(len(d['g']) for d in r))
    json.dump(out,open('/tmp/claude-0/-home-claude/6a81df4d-04f1-532a-932b-e22fa6852a02/scratchpad/newprobe.json','w'))
    await b.close()
asyncio.run(main())
