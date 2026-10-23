# index.html(한국어) · en.html · zh.html 생성. 스크립트 목록·테마 버튼을 한곳에서 관리합니다.
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YEARS=[1969,1972,1975,1980,1983,1986,1989,1992,1995,1998,2001,2004,2008,2012,2016,2020,2024]
SKIN_STYLE={'auto':'','light':'background:#ffffff','dark':'background:#181b21','gold':'background:linear-gradient(135deg,#f6d77a,#a87a00)','win9x':'background:#008080;border-color:#c0c0c0','winxp':'background:linear-gradient(180deg,#0997ff,#003dd7);border-color:#2f9e2f','paper':'background:#d9c49a'}
L={
 'ko':dict(file='index.html',html='ko',title='입법원 시뮬레이터',brand='입법원 시뮬레이터',
  desc='1969–2024 중화민국 입법위원 선거 17번을 내 입장으로 다시 치르는 시뮬레이터. 반원 의석, 입법원장·총통 선거, 선거구 지도.',
  skins=['자동','화이트','다크','황금','윈도우 9x','윈도우 XP','올드 페이퍼'],home='선거 다시 고르기',lang_aria='언어',theme_aria='테마',
  foot='질문과 정당 위치는 각 선거의 대표 쟁점을 단순화한 것으로, 실제 당론·표결과 다를 수 있습니다. 1969–1989년 증보·증액 선거는 선거를 치르지 않은 1948년 의원을 빼고 선거 의석만 계산하며, 교포 의석은 실제대로 고정합니다. 무소속은 한 묶음으로 계산합니다. 선거구 지도는 받은 입법위원 선거 지도(maps/original)의 라벨을 읽어 선거구를 인식한 뒤 라벨을 지운 것이며, 지도 위 배치는 추정입니다.'),
 'en':dict(file='en.html',html='en',title='Legislative Yuan Simulator',brand='Legislative Yuan Simulator',
  desc='Re-run 17 Republic of China legislative elections (1969–2024) with your own positions: hemicycle, Speaker and presidential votes, constituency map.',
  skins=['Auto','White','Dark','Gold','Windows 9x','Windows XP','Old paper'],home='Pick another election',lang_aria='Language',theme_aria='Theme',
  foot='Questions and party positions simplify each election’s main issues and may differ from actual party lines and votes. In the 1969–1989 supplementary elections only contested seats are counted, without the unelected 1948 members; overseas seats are fixed as they were. Independents are counted as one bloc. The constituency maps were made by reading the labels of the supplied election maps (maps/original), identifying each district and then removing the labels; placement on the map is an estimate.'),
 'zh':dict(file='zh.html',html='zh-Hant',title='立法院模擬器',brand='立法院模擬器',
  desc='用自己的立場重新進行1969–2024年17次中華民國立法委員選舉：半圓席次、立法院長與總統選舉、選區地圖。',
  skins=['自動','白色','深色','金色','Windows 9x','Windows XP','復古紙張'],home='重新選擇選舉',lang_aria='語言',theme_aria='佈景',
  foot='題目與政黨立場是將各次選舉主要議題簡化而成，可能與實際黨意・表決不同。1969–1989年增補・增額選舉不計未改選的1948年委員，只計算改選席次，僑選名額依實際固定。無黨籍視為一個整體計算。選區地圖是讀取所提供選舉地圖（maps/original）的標籤辨識各選區後再刪除標籤，地圖上的分配為推估。'),
}
def page(k):
  c=L[k]
  navs=[('./','ko','한국어'),('en.html','en','English'),('zh.html','zh-Hant','繁體中文')]
  nav=''.join(f'<a href="{h}" hreflang="{l}" lang="{l}"'+(' aria-current="page"' if l==c['html'] else '')+f'>{t}</a>' for h,l,t in navs)
  sk=''.join(f'<button type="button" data-skin="{s}">'+(f'<i style="{SKIN_STYLE[s]}"></i>' if SKIN_STYLE[s] else '')+f'{n}</button>' for s,n in zip(SKIN_STYLE,c['skins']))
  scripts=['data/elections.js','data/districts.js','data/presidents.js']+[f'questions/{y}.js' for y in YEARS]
  if k=='ko': scripts+=['i18n/ko.js']
  else: scripts+=[f'i18n/{k}.js',f'i18n/{k}-data.js']+[f'questions/{k}/{y}.js' for y in YEARS]+['i18n/apply.js']
  scripts+=['js/engine.js','js/card.js','js/app.js']
  sc='\n'.join(f'<script src="{s}"></script>' for s in scripts)
  return f'''<!doctype html>
<html lang="{c['html']}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{c['title']}</title>
<meta name="description" content="{c['desc']}">
<link rel="alternate" hreflang="ko" href="./"><link rel="alternate" hreflang="en" href="en.html"><link rel="alternate" hreflang="zh-Hant" href="zh.html">
<link rel="icon" type="image/svg+xml" href="favicon/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Noto+Serif+TC:wght@600;800&family=Noto+Sans+TC:wght@400;500;700&family=Gowun+Batang:wght@400;700&family=DotGothic16&display=swap">
<link rel="stylesheet" href="css/style.css">
</head><body>
<div class="wrap">
  <div class="top">
    <div class="brand">
      <svg viewBox="0 0 30 24" aria-hidden="true"><path d="M3 22h24M6 22v-8M10 22v-8M14 22v-8M16 22v-8M20 22v-8M24 22v-8M4 14h22M7 14l8-5 8 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="15" cy="4.5" r="2.4" fill="currentColor"/></svg>
      <div>{c['brand']}<small>立法院 · 1969 — 2024</small></div>
    </div>
    <div class="topr">
      <nav class="lang" aria-label="{c['lang_aria']}">{nav}</nav>
      <div class="skin" id="skin" role="group" aria-label="{c['theme_aria']}">{sk}</div>
      <button type="button" class="link" id="toHome" hidden>{c['home']}</button>
    </div>
  </div>
  <main id="app"></main>
  <p class="foot">{c['foot']}</p>
</div>
{sc}
</body></html>
'''
for k in L: open(os.path.join(ROOT,L[k]['file']),'w').write(page(k))
print('ok')
