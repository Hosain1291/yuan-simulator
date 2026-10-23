/* 번역 적용 — en.html·zh.html에서 I18N.data(번역 데이터)를 DATA·QSET·ERAS·DISTRICTS에 덮어씁니다.
   I18N.data 구조:
     eras: [시대 이름…]                ERAS 순서대로
     parties: { 키: 이름, '키@연도': 이름 }   (zh는 한자 이름을 그대로 씀)
     people: { 한자 이름: 로마자 }      영어판의 대표·원장 후보 이름
     dn: { 선거구 키: 이름 }            영어판 선거구 이름 (zh는 키 자체가 한자 이름)
     E: { 연도: { ord, era, pres, prem, term, desc, spReal, P: { 키: 설명 } } }
     Q: { 연도: [[제목, A안, B안]…] }   questions/en/YYYY.js·questions/zh/YYYY.js가 채움
     pres: { 총통 선거 연도: 설명 } · mins: { 한국어 부처 이름: 번역 } · pd: { 정당 키: 기본 설명 } */
(function () {
  const I = window.I18N, D = I && I.data;
  if (!D) return;
  const zh = I.lang === 'zh', R = D.people || {}, PN = D.parties || {};
  if (D.eras) window.ERAS.forEach((e, i) => { if (D.eras[i]) e[0] = D.eras[i]; });
  window.DATA.forEach(a => {
    const x = (D.E || {})[a.y] || {};
    ['ord', 'era', 'pres', 'prem', 'desc', 'spReal', 'term'].forEach(k => { if (x[k] != null) a[k] = x[k]; });
    a.P.forEach(p => {
      p.n = zh ? p.zh : (PN[p.k + '@' + a.y] || PN[p.k] || p.n);
      p.d = (x.P && x.P[p.k] != null) ? x.P[p.k] : (D.pd && D.pd[p.k] != null ? D.pd[p.k] : '');
      if (zh) { p.ldk = p.ld; if (p.spc) p.spc = [p.spc[0], p.spc[0]]; }
      else { p.ldk = p.ld ? (R[p.ld] || p.ld) : ''; if (p.spc) p.spc = [p.spc[0], R[p.spc[0]] || p.spc[0]]; }
    });
    const q = (D.Q || {})[a.y];
    (window.QSET[a.y] || []).forEach((row, i) => { const t = q && q[i]; if (t) { row[0] = t[0]; row[3] = t[1]; row[4] = t[2]; } });
  });
  if (D.pres && window.PRES) Object.values(window.PRES).forEach(P => { if (D.pres[P.y]) P.note = D.pres[P.y]; });
  if (D.mins) I.ui.mins = D.mins;
})();
