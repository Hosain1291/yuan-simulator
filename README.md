# yuan-simulator
대만 입법원 시뮬레이터입니다.

1969년 첫 증보선거부터 2024년까지 중화민국 입법위원 선거 17번을 내 입장으로 다시 치르는 시뮬레이터입니다. 분야별 중요도를 정하고 쟁점마다 막대를 움직여 답하면, 당시 선거제도(중대선거구 SNTV·소선거구 병립제·교포 의석 등)대로 입법원이 다시 구성됩니다. 결과 화면에는 반원 의석, 입법원장 선거, 총통 선거, 선거구 지도, 정당 스펙트럼, 정족수, 질문별 표결이 나옵니다.

- 언어: 한국어(`index.html`) · English(`en.html`) · 繁體中文(`zh.html`)
- 테마: 자동 · 화이트 · 다크 · 황금 · 윈도우 9x · 윈도우 XP · 올드 페이퍼
- 화면 구성은 [중의원 시뮬레이터](https://github.com/Hosain1291/jp-parliament-simulator)를 바탕으로 했습니다.

## 폴더

| 폴더 | 내용 |
|---|---|
| `maps/` | 라벨을 지우고 선거구마다 `data-k`(선거구 이름)를 붙인 지도 SVG. 원본은 `maps/original/` |
| `questions/` | 선거별 질문(한국어) `YYYY.js`, 번역은 `questions/en/`·`questions/zh/` |
| `data/` | 선거·정당 데이터(`elections.js`), 선거구 정수·지역 성향(`districts.js`), 총통 선거(`presidents.js`) |
| `i18n/` | 화면 문구(`ko.js`·`en.js`·`zh.js`), 데이터 번역(`en-data.js`·`zh-data.js`), 번역 적용(`apply.js`) |
| `js/` | 계산 엔진(`engine.js`), 화면(`app.js`), 결과 카드 이미지(`card.js`) |
| `css/` | 스타일과 테마 |

## 질문 형식

`questions/YYYY.js`의 한 줄은 `[제목, A안 정당, B안 정당, A안, B안, {정당: -1(A)…1(B)}, 축, 분야, 시점]`입니다.
축은 `e`(경제) · `s`(정체성·질서) · `''`(스펙트럼 제외), 분야는 `pol` `cs` `def` `eco` `wel` `soc` `reg`입니다.
질문을 고치면 같은 순서로 `questions/en/YYYY.js`·`questions/zh/YYYY.js`의 `[제목, A안, B안]`도 고쳐 주세요.

## GitHub Pages

빌드 과정 없는 정적 사이트입니다. 저장소 Settings → Pages에서 `main` 브랜치의 `/ (root)`를 고르면
`https://hosain1291.github.io/yuan-simulator/`에서 열립니다(지도는 `fetch`로 불러오므로 파일을 직접 여는 대신 웹 서버로 열어야 합니다).

중대선거구 시기(1983·1986·1989–2004) 일부 선거구 정수는 인구 비례로 추정했고, 지도 위 의석 배치는 지역 성향에 따른 추정입니다.
