(() => {
  const card = document.getElementById('detailCard');
  if (!card) return;
  function enhance() {
    if (card.querySelector('.shipment-detail-layout') || !card.querySelector('#packageBtn')) return;
    card.dataset.detailEnhanced = '1';
    const header = card.querySelector(':scope > .dh');
    const rows = [...card.querySelectorAll(':scope > .drow')];
    const timeline = card.querySelector(':scope > .stl-section');
    const order = [...card.querySelectorAll(':scope > .sf-section')].find(section => section.querySelector('#docOrderList'));
    const docs = card.querySelector('#docActionsGrid');
    const comments = card.querySelector('.cmt-section');
    const notes = card.querySelector('.comments-box');
    const archive = [...card.querySelectorAll(':scope > .sf-section')].find(section => section.querySelector('#sfList'));
    const packageAttachments = card.querySelector('#pkgAttSection');
    const actions = card.querySelector(':scope > .detail-actions');
    const review = card.querySelector(':scope > .rework-note');
    if (!header || !actions) return;

    const title = header.querySelector('h2')?.textContent?.trim() || 'تفاصيل الشحنة';
    const layout = document.createElement('div'); layout.className = 'shipment-detail-layout';
    const sidebar = document.createElement('aside'); sidebar.className = 'shipment-detail-sidebar';
    const main = document.createElement('main'); main.className = 'shipment-detail-main';
    const hero = document.createElement('section'); hero.className = 'shipment-hero';
    hero.innerHTML = `<small>تفاصيل الشحنة</small><strong>${title}</strong><span class="shipment-pill">الحالة الحالية</span>`;
    const summary = document.createElement('section'); summary.className = 'shipment-summary';
    rows.forEach(row => summary.append(row));
    const append = (parent, ...nodes) => nodes.filter(Boolean).forEach(node => parent.append(node));
    append(sidebar, hero, timeline, order);
    append(main, review, summary, docs, comments, notes, archive, packageAttachments, actions);
    layout.append(sidebar, main); card.append(layout);
  }
  new MutationObserver(enhance).observe(card, {childList:true});
  enhance();
})();
