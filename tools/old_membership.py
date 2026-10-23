# 1969–1980 지도의 '臺灣省第N' 선거구가 어느 현·시를 품는지: 1992년 현·시 라벨 점이 어느 면에 드는지로 판정
import asyncio, json
from playwright.async_api import async_playwright
SP='/tmp/claude-0/-home-claude/6a81df4d-04f1-532a-932b-e22fa6852a02/scratchpad'
meta=json.load(open(SP+'/mapmeta.json'))
pts=meta['1992']['pts']
JS='''(pts)=>{ const svg=document.querySelector('svg'); const ps=[...svg.querySelectorAll('.dist path')]; const P=svg.createSVGPoint();
 const o={}; for(const [n,[x,y]] of Object.entries(pts)){ P.x=x;P.y=y; const h=ps.find(p=>p.isPointInFill(P)); o[n]=h?h.dataset.k:null; } return o; }'''
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(); res={}
    for y in ['1969','1972','1980','1989','1998']:
      await pg.goto(f'http://localhost:8765/maps/{y}.svg'); r=await pg.evaluate(JS,pts); res[y]=r; print(y,r)
    json.dump(res,open(SP+'/member.json','w'),ensure_ascii=False)
    await b.close()
asyncio.run(main())
