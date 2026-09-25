/* GitHub Pages용 시세 어댑터: 휴대폰은 정적 JSON만 읽고 가락시장 API를 직접 호출하지 않습니다. */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const readJson = path => nativeFetch(path, { cache: "no-store" }).then(response => response.ok ? response.json() : []).catch(() => []);
  const history = readJson("./market/history.json");
  const availability = readJson("./market/availability-log.json");
  const koreaYmd = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "");
  // 매년 공식 달력 기준으로 갱신한다. 일요일은 매년 공통인 달력상 빨간 날이다.
  const redDates = new Set(["20260101", "20260216", "20260217", "20260218", "20260301", "20260302", "20260505", "20260524", "20260525", "20260603", "20260606", "20260815", "20260817", "20260924", "20260925", "20260926", "20261003", "20261005", "20261009", "20261225"]);
  const isRedCalendarDay = date => {
    const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    return redDates.has(date) || new Date(`${iso}T12:00:00+09:00`).getDay() === 0;
  };
  const statusFor = (date, log) => {
    const checks = log.filter(entry => entry.date === date);
    const allEmpty = checks.length >= 24 && checks.every(entry => Number(entry.itemsWithRows) === 0);
    const redCalendarDay = isRedCalendarDay(date);
    return { redCalendarDay, checks: checks.length, allEmpty, holidayClosed: redCalendarDay && allEmpty, holidayChecking: redCalendarDay && checks.length > 0 && !allEmpty, today: date === koreaYmd() };
  };
  window.VeggiMarketHistoryReady = Promise.all([history, availability]);
  window.VeggiMarketHistoryReady.then(([snapshots]) => {
    const latest = snapshots.at?.(-1);
    window.VeggiMarketLatestDate = latest?.date || null;
    window.dispatchEvent(new Event("veggi-market-history-ready"));
  });
  const idFromQuery = value => new URL(value, location.href).searchParams;
  window.fetch = async (resource, options) => {
    const url = String(resource);
    if (!url.startsWith("/api/market")) return nativeFetch(resource, options);
    const query = idFromQuery(url), id = query.get("item"), date = query.get("date");
    const [snapshots, log] = await Promise.all([history, availability]);
    const snapshot = snapshots.find(entry => entry.date === date);
    const rows = snapshot?.items?.[id]?.rows || [];
    return new Response(JSON.stringify({ resultData: rows, collectedAt: snapshot?.collectedAt || null, collected: Boolean(snapshot), marketStatus: statusFor(date, log) }), { headers: { "Content-Type": "application/json" } });
  };
  const refreshAtMidnight = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
    setTimeout(() => { window.dispatchEvent(new Event("veggi-market-history-ready")); refreshAtMidnight(); }, Math.max(1000, next - now));
  };
  refreshAtMidnight();
})();
