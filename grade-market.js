/* 정적 이력의 품목·등급·거래단위별 AV_P(평균 경락가)를 차트에 표시한다. */
(() => {
  const apiGrade = g => g === "중" ? "보통" : g;
  const won = n => `₩${Math.round(n || 0).toLocaleString("ko-KR")}`;
  const number = v => Number(String(v ?? "").replace(/[^0-9.-]/g, "")) || 0;
  const cache = new WeakMap(), prepared = new WeakSet();
  const dates = days => Array.from({length:days},(_,i)=>{const raw=window.VeggiMarketLatestDate;const d=/^\d{8}$/.test(raw||"")?new Date(+raw.slice(0,4),+raw.slice(4,6)-1,+raw.slice(6,8),12):new Date();d.setDate(d.getDate()-(days-1-i));return d});
  const daysOf = card => Number(card.querySelector("svg")?.getAttribute("aria-label")?.match(/(7|30)일/)?.[1]||7);

  function priceInfo(card, points, grade, index) {
    const point=points[index], d=dates(points.length)[index], price=card.querySelector(".market-price"), clock=card.querySelector(".market-clock");
    if(price)price.firstChild.textContent=won(point.avg);
    if(clock)clock.textContent=point.traded?`🕘 ${d.getMonth()+1}월 ${d.getDate()}일 · ${grade}등급 평균 경락가`:`🕘 ${d.getMonth()+1}월 ${d.getDate()}일 · 휴장/거래 없음 · 직전 거래일 ${grade}등급 평균가`;
  }
  function draw(card, points, grade, selected=points.length-1) {
    const svg=card.querySelector("svg");if(!svg)return;const values=points.map(p=>p.avg),w=350,h=190,l=38,r=14,t=16,b=38,cw=w-l-r,ch=h-t-b,lo=Math.min(...values),hi=Math.max(...values),min=Math.floor(lo/10000)*10000,max=Math.max(min+10000,Math.ceil(hi/10000)*10000),x=i=>l+cw*i/(values.length-1),y=v=>t+(max-v)/(max-min)*ch,pts=values.map((v,i)=>`${x(i)},${y(v)}`).join(" "),ds=dates(values.length),selectedIndex=Math.max(0,Math.min(values.length-1,selected)),sx=x(selectedIndex),sy=y(values[selectedIndex]),tw=86,tx=Math.max(l,Math.min(w-tw-4,sx-tw/2)),ty=Math.max(3,sy-45);
    const grid=Array.from({length:Math.round((max-min)/10000)+1},(_,i)=>{const v=max-i*10000,yy=y(v);return `<line class="chart-grid" x1="${l}" x2="${l+cw}" y1="${yy}" y2="${yy}"/><text class="chart-axis" x="2" y="${yy+4}">${Math.round(v/10000)}만</text>`}).join("");
    const dots=values.map((v,i)=>`<g class="chart-hit" data-grade-point="${i}"><circle class="chart-hit-area" cx="${x(i)}" cy="${y(v)}" r="15"/><circle class="chart-dot ${i===selectedIndex?"selected":""}" cx="${x(i)}" cy="${y(v)}" r="${i===selectedIndex?5:3.2}"/></g>`).join("");
    const labels=ds.map((d,i)=>`<text class="chart-date ${values.length===30?"compact":""}" x="${x(i)}" y="${h-10}" text-anchor="middle">${d.getDate()}</text>`).join("");
    svg.innerHTML=`${grid}<rect class="chart-surface" data-grade-surface x="${l}" y="${t}" width="${cw}" height="${ch}"/><polygon class="chart-area" points="${l},${t+ch} ${pts} ${l+cw},${t+ch}"/><polyline class="chart-line" points="${pts}"/>${dots}<g class="chart-tooltip"><rect x="${tx}" y="${ty}" width="${tw}" height="37" rx="7"/><path d="M ${sx-5} ${ty+37} L ${sx+5} ${ty+37} L ${sx} ${ty+42}Z"/><text x="${tx+tw/2}" y="${ty+13}" text-anchor="middle">${ds[selectedIndex].getMonth()+1}/${ds[selectedIndex].getDate()}</text><text x="${tx+tw/2}" y="${ty+29}" text-anchor="middle">${won(values[selectedIndex])}</text></g>${labels}`;
    card.dataset.gradeSelectedIndex=selectedIndex;card.querySelectorAll("[data-grade-value]").forEach(b=>b.classList.toggle("active",b.dataset.value===grade));const sub=card.querySelector(".market-top p");if(sub)sub.textContent=sub.textContent.replace(/(특|상|중)등급/,`${grade}등급`);priceInfo(card,points,grade,selectedIndex);
  }
  async function charts(card) {
    const days=daysOf(card),item=card.dataset.marketId,responses=await Promise.all(dates(days).map(d=>fetch(`/api/market?item=${encodeURIComponent(item)}&date=${d.toISOString().slice(0,10).replaceAll("-","")}`).then(r=>r.json()))),result={};
    ["특","상","중"].forEach(g=>{const raw=responses.map(res=>(res.resultData||[]).find(row=>String(row.G_NAME||"").trim()===apiGrade(g))||null),first=raw.find(Boolean);if(!first)return;let last={avg:number(first.AV_P),unit:String(first.U_NAME||"").trim(),traded:false};result[g]=raw.map(row=>{if(row)last={avg:number(row.AV_P),unit:String(row.U_NAME||"").trim(),traded:true};return {...last}})});if(!Object.keys(result).length)throw Error("no data");return result;
  }
  async function selectGrade(button) {const card=button.closest(".market-card");if(!card)return;const wanted=button.dataset.value;try{let data=cache.get(card);if(!data){data=await charts(card);cache.set(card,data)}const grade=data[wanted]?wanted:Object.keys(data)[0];if(!data[wanted]){const note=card.querySelector(".market-advice");if(note)note.textContent=`${wanted}등급 거래가 없어 ${grade}등급 실제 시세를 표시합니다.`}draw(card,data[grade],grade,Number(card.dataset.gradeSelectedIndex??data[grade].length-1))}catch{card.querySelector("svg")?.replaceChildren();const note=card.querySelector(".market-advice");if(note)note.textContent=`${wanted}등급의 실제 거래 데이터가 없습니다.`}}
  function selectPoint(card,index){const data=cache.get(card),grade=card?.querySelector("[data-grade-value].active")?.dataset.value;if(data?.[grade])draw(card,data[grade],grade,index)}
  window.addEventListener("click",e=>{const b=e.target.closest?.("[data-grade-value]");if(!b)return;e.preventDefault();e.stopImmediatePropagation();selectGrade(b)},true);
  window.addEventListener("click",e=>{const p=e.target.closest?.("[data-grade-point]");if(!p)return;e.preventDefault();e.stopImmediatePropagation();selectPoint(p.closest(".market-card"),Number(p.dataset.gradePoint))},true);
  window.addEventListener("click",e=>{const s=e.target.closest?.("[data-grade-surface]");if(!s)return;const svg=s.ownerSVGElement,box=svg.getBoundingClientRect(),days=daysOf(s.closest(".market-card")),x=(e.clientX-box.left)/box.width*350,index=Math.max(0,Math.min(days-1,Math.round((x-38)/298*(days-1))));e.preventDefault();e.stopImmediatePropagation();selectPoint(s.closest(".market-card"),index)},true);
  const prepare=()=>document.querySelectorAll(".market-card").forEach(card=>{if(prepared.has(card))return;prepared.add(card);const active=card.querySelector("[data-grade-value].active")||card.querySelector('[data-grade-value][data-value="특"]');if(active)selectGrade(active)});new MutationObserver(prepare).observe(document.body,{childList:true,subtree:true});prepare();
})();
