/* GitHub Pages용 시세 어댑터: 휴대폰은 정적 JSON만 읽고 가락시장 API를 직접 호출하지 않습니다. */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const history = nativeFetch("./market/history.json", { cache: "no-store" })
    .then(response => response.ok ? response.json() : [])
    .catch(() => []);
  const idFromQuery = value => new URL(value, location.href).searchParams;
  window.fetch = async (resource, options) => {
    const url = String(resource);
    if (!url.startsWith("/api/market")) return nativeFetch(resource, options);
    const query = idFromQuery(url), id = query.get("item"), date = query.get("date");
    const snapshots = await history;
    const snapshot = snapshots.find(entry => entry.date === date);
    const rows = snapshot?.items?.[id]?.rows || [];
    return new Response(JSON.stringify({ resultData: rows, collectedAt: snapshot?.collectedAt || null }), {
      headers: { "Content-Type": "application/json" }
    });
  };
})();
