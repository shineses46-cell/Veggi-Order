/* GitHub Pages용 시세 어댑터: 휴대폰은 정적 JSON만 읽고 가락시장 API를 직접 호출하지 않습니다. */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const history = nativeFetch("./market/history.json", { cache: "no-store" })
    .then(response => response.ok ? response.json() : [])
    .catch(() => []);
  // 수집 이력은 API 최신일을 알려주되, 차트 날짜 끝점은 각 기기의 오늘을 사용한다.
  window.VeggiMarketHistoryReady = history;
  history.then(snapshots => {
    const latest = snapshots.at?.(-1);
    window.VeggiMarketLatestDate = latest?.date || null;
    window.dispatchEvent(new Event("veggi-market-history-ready"));
  });
  const idFromQuery = value => new URL(value, location.href).searchParams;
  window.fetch = async (resource, options) => {
    const url = String(resource);
    if (!url.startsWith("/api/market")) return nativeFetch(resource, options);
    const query = idFromQuery(url), id = query.get("item"), date = query.get("date");
    const snapshots = await history;
    const snapshot = snapshots.find(entry => entry.date === date);
    const rows = snapshot?.items?.[id]?.rows || [];
    return new Response(JSON.stringify({ resultData: rows, collectedAt: snapshot?.collectedAt || null, collected: Boolean(snapshot) }), {
      headers: { "Content-Type": "application/json" }
    });
  };
  // 자정 전에 앱을 열어둔 경우에도 한국 시간 자정 뒤 오늘 날짜를 그래프에 추가한다.
  const refreshAtMidnight = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
    setTimeout(() => { window.dispatchEvent(new Event("veggi-market-history-ready")); refreshAtMidnight(); }, Math.max(1000, next - now));
  };
  refreshAtMidnight();
})();
