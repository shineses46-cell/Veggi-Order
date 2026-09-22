import fs from 'node:fs';

const items = {
  'lettuce-green': '청상추', cucumber: '취청오이', carrot: '당근 수입',
  iceberg: '양상추(일반)', 'red-cabbage': '빨간양배추 국산', chili: '청양고추',
  perilla: '깻잎', 'green-onion': '대파(일반)'
};

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : Number(args[index + 1] || fallback);
};
const days = Math.max(1, Math.min(45, option('--days', 1)));
const endOffset = Math.max(0, option('--end-offset', 1));
const onlyIndex = args.indexOf('--only');
const only = onlyIndex < 0 ? null : args[onlyIndex + 1];
const selectedItems = only ? Object.fromEntries(Object.entries(items).filter(([key]) => key === only)) : items;
if (only && !Object.keys(selectedItems).length) throw new Error(`알 수 없는 품목 ID: ${only}`);

if (!process.env.GARAK_API_ID || !process.env.GARAK_API_PASSWORD) {
  throw new Error('GARAK_API_ID와 GARAK_API_PASSWORD 환경 변수가 필요합니다.');
}

const ymd = (offset) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
  .format(new Date(Date.now() + offset * 86400000)).replaceAll('-', '');
const previousTradeDate = (offset) => {
  let candidate = offset - 1;
  while (new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', weekday: 'short' })
    .format(new Date(Date.now() + candidate * 86400000)) === 'Sun') candidate -= 1;
  return ymd(candidate);
};
const offsets = Array.from({ length: days }, (_, index) => -(endOffset + days - 1 - index));

async function collectItem(date, previous, weekBefore, key, name) {
  const query = new URLSearchParams({
    id: process.env.GARAK_API_ID, passwd: process.env.GARAK_API_PASSWORD,
    dataid: 'data36', pagesize: '50', pageidx: '1', 'portal.templet': 'false',
    s_date: date, s_date_p: previous, s_date_p7: weekBefore,
    p_pos_gubun: '1', s_pum_nm: '2', s_pummok: name
  });
  try {
    const response = await fetch(`https://www.garak.co.kr/homepage/publicdata/dataJsonOpen.do?${query}`);
    const raw = await response.text();
    let payload = {};
    try { payload = JSON.parse(raw); }
    catch { payload = { ApiErrorMsg: raw.match(/ApiErrorMsg:([^}<]+)/)?.[1]?.trim() || '데이터가 없습니다.' }; }
    const rows = Array.isArray(payload.resultData) ? payload.resultData : [];
    return { name, rows, format: 'json', ...(rows.length ? {} : { apiMessage: String(payload.ApiErrorMsg || payload.message || '데이터가 없습니다.') }) };
  } catch (error) {
    return { name, rows: [], error: String(error.message || error) };
  }
}

const snapshots = [];
for (const offset of offsets) {
  const date = ymd(offset);
  const previous = previousTradeDate(offset);
  const weekBefore = ymd(offset - 7);
  const itemRows = await Promise.all(Object.entries(selectedItems).map(async ([key, name]) => [key, await collectItem(date, previous, weekBefore, key, name)]));
  const snapshot = { collectedAt: new Date().toISOString(), date, items: Object.fromEntries(itemRows) };
  snapshots.push(snapshot);
  const found = itemRows.reduce((count, [, item]) => count + (item.rows.length ? 1 : 0), 0);
  console.log(`${date}: ${found}/${itemRows.length}개 품목 가격 행 수집`);
}

fs.mkdirSync('market', { recursive: true });
let history = [];
try { history = JSON.parse(fs.readFileSync('market/history.json', 'utf8')); } catch {}
const existing = new Map((Array.isArray(history) ? history : []).map(snapshot => [snapshot.date, snapshot]));
for (const snapshot of snapshots) {
  const before = existing.get(snapshot.date);
  existing.set(snapshot.date, before ? { ...before, collectedAt: snapshot.collectedAt, items: { ...before.items, ...snapshot.items } } : snapshot);
}
history = [...existing.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-45);
fs.writeFileSync('market/history.json', `${JSON.stringify(history, null, 2)}\n`);
fs.writeFileSync('market/latest.json', `${JSON.stringify(history.at(-1) || {}, null, 2)}\n`);
console.log(`완료: ${snapshots.length}일치, history ${history.length}일치 저장`);
