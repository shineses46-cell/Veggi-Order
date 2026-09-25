# Veggi Order 시세 예약 실행기

Cloudflare Worker Cron Trigger가 GitHub Actions의 `collect-market.yml`을 호출합니다.
Worker는 가락시장 API를 직접 호출하거나 가격 데이터를 보관하지 않습니다.

## Cloudflare에 넣을 값

Cloudflare Dashboard → Workers & Pages → `veggi-order-market-scheduler` → Settings → Variables and Secrets에서 다음을 **Secret**으로 추가합니다.

- 이름: `GITHUB_DISPATCH_TOKEN`
- 값: GitHub Fine-grained personal access token

같은 화면에 다음 3개는 **일반 Variable**로 추가합니다. 값은 비밀이 아니며 Worker가 어느 GitHub 작업을 호출할지 지정합니다.

- `GITHUB_REPOSITORY`: `shineses46-cell/Veggi-Order`
- `GITHUB_WORKFLOW`: `collect-market.yml`
- `GITHUB_REF`: `main`

토큰은 GitHub에서 다음처럼 제한해 만듭니다.

- Resource owner: 본인 계정
- Repository access: `Only select repositories` → `Veggi-Order`만 선택
- Repository permissions → `Actions`: `Read and write`만 허용
- 만료일: 1년 이하 권장. 만료 전에 새 토큰으로 교체합니다.

`GARAK_API_ID`, `GARAK_API_PASSWORD`는 계속 GitHub Actions Secrets에만 둡니다. Cloudflare에는 절대 입력하지 않습니다.

## 배포

1. Cloudflare Dashboard에서 Workers & Pages → Create → Worker를 선택합니다.
2. 이름을 `veggi-order-market-scheduler`로 지정합니다.
3. Worker 편집기에 `src/index.js` 내용을 붙여넣어 배포합니다.
4. Settings → Triggers → Cron Triggers에 `17 * * * *`를 추가합니다. Cloudflare Cron은 UTC 기준이며, 한국시간 기준으로도 매시 17분(00:17~23:17) 실행됩니다.
5. 위 Secret과 일반 Variable을 추가한 뒤, Cron Trigger의 Test 버튼으로 한 번 실행합니다.
6. GitHub Actions에서 `workflow_dispatch` 실행 기록이 생기고, `market/availability-log.json`이 갱신되는지 확인합니다.

## 운영 전환

Cloudflare 테스트가 성공하면 GitHub 내부 `schedule`은 제거합니다. 저녁 경매까지 포함해 일주일 동안 24시간 기록을 모은 다음, 가장 이른 안정 수집 시각과 백업 시각만 남겨 호출 수를 줄입니다.
