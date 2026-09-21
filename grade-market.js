(() => {
  const apiGrade = g => g === "중" ? "보통" : g;
  const won = v => `₩${Math.round(v || 0).toLocaleString("ko-KR")}`;
  const n = v => Number(String(v ?? "").replace(/[^0-9.-]/g, "")) || 0;
  const dates = days => Array.from({length: days}, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (days - 1 - i)); return d; });
  const idFromCard = card => card.dataset.marketId;
  const gradeCache = new WeakMap();
  const preparedCards = new WeakSet();
  function draw(card, values, grade) {
    const svg = card.querySelector("svg"); if (!svg || !values.length) return;
    const w=350,h=190,l=38,r=14,t=16,b=38,cw=w-l-r,ch=h-t-b,lo=Math.min(...values),hi=Math.max(...values),min=Math.floor(lo/10000)*10000,max=Math.max(min+10000,Math.ceil(hi/10000)*10000);
    const x=i=>l+cw*i/(values.length-1), y=v=>t+(max-v)/(max-min)*ch, pts=values.map((v,i)=>`${x(i)},${y(v)}`).join(" ");
    const grid=Array.from({length:Math.round((max-min)/10000)+1},(_,i)=>{const v=max-i*10000,yy=y(v);return `<line class="chart-grid" x1="${l}" x2="${l+cw}" y1="${yy}" y2="${yy}"/><text class="chart-axis" x="2" y="${yy+4}">${Math.round(v/10000)}만</text>`}).join("");
    const ds=dates(values.length); const dots=values.map((v,i)=>`<circle class="chart-dot ${i===values.length-1?"selected":""}" data-grade-point="${i}" cx="${x(i)}" cy="${y(v)}" r="${i===values.length-1?5:3.2}"/>`).join("");
    const labels=ds.map((d,i)=>`<text class="chart-date ${values.length===30?"compact":""}" x="${x(i)}" y="${h-10}" text-anchor="middle">${d.getDate()}</text>`).join("");
    svg.innerHTML=`${grid}<polygon class="chart-area" points="${l},${t+ch} ${pts} ${l+cw},${t+ch}"/><polyline class="chart-line" points="${pts}"/>${dots}${labels}`;
    card.querySelectorAll("[data-grade-value]").forEach(b=>b.classList.toggle("active",b.dataset.value===grade));
    const price=card.querySelector(".market-price"); if(price) price.firstChild.textContent=won(values.at(-1));
    const sub=card.querySelector(".market-top p"); if(sub) sub.textContent=sub.textContent.replace(/(특|상|중)등급/,`${grade}등급`);
  }
  async function select(button) {
    const card=button.closest(".market-card"), grade=button.dataset.value, id=idFromCard(card); if(!card||!id) return;
    card.querySelectorAll("[data-grade-value]").forEach(b=>b.classList.toggle("active",b===button));
    const days=Number(card.querySelector("svg")?.getAttribute("aria-label")?.match(/(7|30)일/)?.[1]||7), ds=dates(days), key=apiGrade(grade);
    try {
      let charts=gradeCache.get(card);
      if(!charts){const rows=await Promise.all(ds.map(d=>fetch(`/api/market?item=${encodeURIComponent(id)}&date=${d.toISOString().slice(0,10).replaceAll("-","")}`).then(r=>r.json())));charts={};["특","상","중"].forEach(g=>{const raw=rows.map(r=>{const row=(r.resultData||[]).find(x=>String(x.G_NAME||"").trim()===apiGrade(g));return row?n(row.AV_P):null});if(raw.every(v=>v===null))throw new Error("missing grade");let next=raw.find(v=>v!==null);charts[g]=raw.map(v=>{if(v!==null)next=v;return next})});gradeCache.set(card,charts)}
      const values=charts[grade];
      if(values.some(v=>v===null)) throw new Error("missing grade");
      draw(card,values,grade);
    } catch { card.querySelectorAll("[data-grade-value]").forEach(b=>b.classList.toggle("active",b.dataset.value===grade)); const note=card.querySelector(".market-advice");if(note)note.textContent=`${grade}등급 API 거래값 없음 · 품목명 또는 등급명을 확인하세요.`; }
  }
  window.addEventListener("click",e=>{const b=e.target.closest?.("[data-grade-value]");if(!b)return;e.preventDefault();e.stopImmediatePropagation();select(b)},true);
  window.addEventListener("click",e=>{const dot=e.target.closest?.("[data-grade-point]");if(!dot)return;const card=dot.closest(".market-card"),charts=gradeCache.get(card),grade=card?.querySelector("[data-grade-value].active")?.dataset.value,index=Number(dot.dataset.gradePoint);if(!charts||!grade)return;const d=dates(charts[grade].length)[index],clock=card.querySelector(".market-clock");if(clock)clock.textContent=`🕘 ${d.getMonth()+1}월 ${d.getDate()}일 · ${grade}등급 평균가 ${won(charts[grade][index])}`},true);
  // 기본 특등급도 버튼 선택 뒤와 동일한 API 데이터 묶음으로 먼저 그린다.
  const prepare = () => document.querySelectorAll(".market-card").forEach(card => { if(preparedCards.has(card)) return; preparedCards.add(card); const special=card.querySelector('[data-grade-value][data-value="특"]'); if(special) select(special); });
  new MutationObserver(prepare).observe(document.body,{childList:true,subtree:true});
  prepare();
})();
