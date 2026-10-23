import asyncio, json, sys
from playwright.async_api import async_playwright
JS=r'''
() => { const svg=document.querySelector('svg'); const out=[];
 [...svg.querySelectorAll('path,rect,polygon,polyline,line')].forEach(e=>{ const cs=getComputedStyle(e); if(cs.stroke==='rgb(17, 17, 17)'||cs.stroke==='rgb(0, 0, 0)'&&e.tagName!=='rect'){ const b=e.getBBox(); out.push([e.tagName,e.getAttribute('class'),cs.fill,cs.stroke,[b.x,b.y,b.width,b.height].map(v=>+v.toFixed(1))]); } });
 return out; }'''
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page()
    for y in sys.argv[1:]:
      await pg.goto(f'http://localhost:8765/maps/original/{y}.svg'); r=await pg.evaluate(JS)
      print('==',y); [print(' ',x) for x in r]
    await b.close()
asyncio.run(main())
