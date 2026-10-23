import asyncio, json, sys
from playwright.async_api import async_playwright
JS=r'''
() => {
 const svg=document.querySelector('svg'); const all=[...svg.querySelectorAll('path,polygon,rect,circle,ellipse,polyline,line')];
 const cls={}; all.forEach(e=>{ const cs=getComputedStyle(e); const k=(e.getAttribute('class')||'-'); if(!cls[k]) cls[k]={n:0,fill:cs.fill,stroke:cs.stroke,sw:cs.strokeWidth,op:cs.opacity,tag:e.tagName}; cls[k].n++; });
 const groups=[...svg.querySelectorAll('g[data-name]')].map(g=>({id:g.id,name:g.dataset.name,n:g.querySelectorAll('path').length}));
 return {cls,groups};
}'''
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page()
    for y in sys.argv[1:]:
      await pg.goto(f'http://localhost:8765/maps/original/{y}.svg'); r=await pg.evaluate(JS)
      print('==',y)
      for k,v in sorted(r['cls'].items(), key=lambda x:-x[1]['n']): print(' ',k,v)
      print(r['groups'])
    await b.close()
asyncio.run(main())
