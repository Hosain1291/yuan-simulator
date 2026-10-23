import asyncio, json, sys, subprocess, os
from playwright.async_api import async_playwright
SP='/tmp/claude-0/-home-claude/6a81df4d-04f1-532a-932b-e22fa6852a02/scratchpad'
data=json.load(open(SP+'/newprobe.json'))
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':600,'height':300})
    res={}
    for y in sys.argv[1:]:
      await pg.goto(f'http://localhost:8765/maps/original/{y}.svg')
      os.makedirs(f'{SP}/ocr/{y}',exist_ok=True); res[y]={}
      for j,d in enumerate(data[y]):
        if not d['g'] or len(d['g'])>6: continue
        ids=[g['i'] for g in d['g']]
        xs=[g['bb'][0] for g in d['g']]; ys=[g['bb'][1] for g in d['g']]
        x1=[g['bb'][0]+g['bb'][2] for g in d['g']]; y1=[g['bb'][1]+g['bb'][3] for g in d['g']]
        vb=[min(xs)-1,min(ys)-1,max(x1)-min(xs)+2,max(y1)-min(ys)+2]
        svgtxt=await pg.evaluate('''([ids,vb])=>{ const ps=[...document.querySelectorAll('path')]; return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb.join(' ')+'" style="width:'+(vb[2]/vb[3]*90)+'px;height:'+90+'px;background:#fff">'+ids.map(i=>'<path fill="#000" d="'+ps[i].getAttribute('d')+'"/>').join('')+'</svg>'; }''',[ids,vb])
        p2=await b.new_page(viewport={'width':1200,'height':140})
        await p2.set_content('<body style="margin:20px;background:#fff">'+svgtxt+'</body>')
        f=f'{SP}/ocr/{y}/{j}.png'; await p2.screenshot(path=f); await p2.close()
        t=subprocess.run(['tesseract',f,'-','--psm','7','-c','tessedit_char_whitelist=0123456789'],capture_output=True,text=True).stdout.strip()
        res[y][j]=t
      print(y,res[y])
    json.dump(res,open(SP+'/ocr.json','w'),ensure_ascii=False)
    await b.close()
asyncio.run(main())
