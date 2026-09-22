/* 재고 잔여일과 발주 수량 증감 조작을 기존 화면에 보강한다. */
(() => {
  const catalog = {
    'lettuce-green': { received: 4, cycle: 3 }, cucumber: { received: 50, cycle: 3 }, carrot: { received: 10, cycle: 3 },
    iceberg: { received: 2, cycle: 4 }, 'red-cabbage': { received: 4, cycle: 4 }, chili: { received: 1.5, cycle: 7 },
    perilla: { received: 1, cycle: 10 }, 'green-onion': { received: 2, cycle: 10 }
  };
  const format = value => value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  function enhanceStock() {
    document.querySelectorAll('input[data-stock]').forEach(input => {
      const parent = input.closest('.stock-row'), info = parent?.querySelector('.stock-name'), meta = catalog[input.dataset.stock];
      if (!info || !meta || info.querySelector('.days-left')) return;
      if (input.value === '') return;
      const stock = Number(input.value);
      if (!Number.isFinite(stock)) return;
      const days = stock / (meta.received / meta.cycle);
      const label = document.createElement('small');
      label.className = 'days-left';
      label.textContent = `기본 입고 주기 기준 약 ${format(Math.max(0, days))}일치`;
      info.append(label);
    });
  }
  function enhanceOrders() {
    document.querySelectorAll('input[data-order-qty]').forEach(input => {
      if (input.parentElement?.classList.contains('order-stepper')) return;
      const step = input.step === '0.1' ? 0.1 : 1, holder = document.createElement('div');
      holder.className = 'order-stepper';
      const make = (direction, text) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.addEventListener('click', () => { input.value = Math.max(0, Math.round((Number(input.value || 0) + direction * step) * 10) / 10); input.dispatchEvent(new Event('change', { bubbles: true })); }); return button; };
      input.replaceWith(holder); holder.append(make(-1, '−'), input, make(1, '+'));
    });
  }
  const run = () => { enhanceStock(); enhanceOrders(); };
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('change', () => setTimeout(run, 0));
  run();
})();
