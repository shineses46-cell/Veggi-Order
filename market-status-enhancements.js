/* 실제 수집 이력이 준비된 뒤, 휴장일 보정 방식을 안내 문구에도 동일하게 알린다. */
(() => {
  function updateNotice() {
    const view = document.querySelector("#marketView.active");
    const notice = view?.querySelector(".notice");
    const firstCardStatus = view?.querySelector(".market-card .market-top p")?.textContent || "";
    if (!notice || notice.dataset.marketStatusEnhanced === "true" || notice.textContent.includes("시세를 불러오는 중") || !firstCardStatus.includes("실제 거래")) return;
    notice.innerHTML = "시세는 가락시장 실제 거래 자료입니다.<br>짙은 빨간 점과 <b>휴</b> 표시는 거래가 없는 날이며, 그래프에는 직전 거래일 가격을 이어서 보여줍니다. 날짜를 누르면 최고가와 평균가를 확인할 수 있어요.";
    notice.dataset.marketStatusEnhanced = "true";
  }

  new MutationObserver(updateNotice).observe(document.body, { childList: true, subtree: true, characterData: true });
  updateNotice();
})();
