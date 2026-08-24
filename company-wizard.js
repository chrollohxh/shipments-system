(() => {
  const overlay = document.getElementById('companyEditOverlay');
  if (!overlay) return;

  const steps = [
    ['المعلومات الأساسية', 'بيانات الشركة الأساسية'],
    ['المستندات والملفات', 'الشعار والختم والترويسة'],
    ['التفاصيل الإضافية', 'إعدادات المستند والتواصل'],
    ['التحقق والمراجعة', 'راجع البيانات قبل الحفظ']
  ];
  const storageKey = 'company_wizard_step';

  function valueOf(id) {
    const el = document.getElementById(id);
    if (!el) return '—';
    if (el.type === 'checkbox') return el.checked ? 'نعم' : 'لا';
    return (el.value || '').trim() || '—';
  }

  function build() {
    if (overlay.dataset.companyWizardReady) return;
    const host = document.getElementById('ceSaveBtn').closest('div[style]');
    if (!host) return;
    overlay.dataset.companyWizardReady = '1';
    host.classList.add('cew-host');
    const children = [...host.children];
    const initialGrid = children.find(el => el.classList.contains('grid') && el.querySelector('#ce_nameAr'));
    const imagesTitle = children.find(el => el.classList.contains('section-title') && el.textContent.trim() === 'الصور');
    const stampTitle = children.find(el => el.classList.contains('section-title') && el.textContent.trim() === 'مكان الختم والتوقيع');
    const footerTitle = children.find(el => el.classList.contains('section-title') && el.textContent.trim() === 'التذييل');
    const brandTitle = children.find(el => el.classList.contains('section-title') && el.textContent.trim() === 'رأس وتذييل الفاتورة');
    const previewTitle = children.find(el => el.classList.contains('section-title') && el.textContent.trim() === 'معاينة المستند');
    const nextOf = el => el ? el.nextElementSibling : null;
    const imageGrid = nextOf(imagesTitle), stampGrid = nextOf(stampTitle), footerGrid = nextOf(footerTitle);
    const brandGrid = nextOf(brandTitle), brandFiles = nextOf(brandGrid);
    const previewBar = nextOf(previewTitle), preview = nextOf(previewBar);
    const actions = document.getElementById('ceSaveBtn').closest('.detail-actions');

    const shell = document.createElement('div'); shell.className = 'cew-shell';
    const side = document.createElement('aside'); side.className = 'cew-sidebar';
    side.innerHTML = '<div class="cew-ring" data-value="0%"></div><div class="cew-sidebar-title">تقدم تعبئة البيانات</div><div class="cew-steps"></div>';
    const main = document.createElement('main'); main.className = 'cew-main';
    main.innerHTML = '<div class="cew-progress-card"><div class="cew-progress-top"><strong>إعداد الشركة خطوة بخطوة</strong><span>الخطوة 1 من 4</span></div><div class="cew-progress-track"><div class="cew-progress-fill"></div></div></div>';
    const stepLinks = side.querySelector('.cew-steps');
    const panels = steps.map((step, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'cew-step-link';
      button.innerHTML = `<b>${index + 1}</b><span>${step[0]}<small>${step[1]}</small></span>`;
      stepLinks.append(button);
      const panel = document.createElement('section'); panel.className = 'cew-panel';
      panel.innerHTML = `<div class="cew-panel-head"><h3>${step[0]}</h3><p>${step[1]}</p></div>`;
      main.append(panel); return panel;
    });
    shell.append(side, main); host.append(shell);

    const append = (panel, ...nodes) => nodes.filter(Boolean).forEach(node => panel.append(node));
    append(panels[0], initialGrid);
    const docs = document.createElement('div'); docs.className = 'cew-upload-card'; append(docs, imagesTitle, imageGrid, brandTitle, brandGrid, brandFiles); panels[1].append(docs);
    append(panels[2], stampTitle, stampGrid);
    const templateActions = document.createElement('div'); templateActions.className = 'cew-template-actions';
    templateActions.innerHTML = '<span>يمكنك ضبط المقاس هنا، ولتحريك الختم والترويسة بحرية افتح محرر النماذج.</span>';
    const templateButton = document.getElementById('ceTplEditBtn');
    if (templateButton) templateActions.append(templateButton);
    panels[2].append(templateActions);
    append(panels[2], footerTitle, footerGrid);
    const summary = document.createElement('div'); summary.className = 'cew-summary'; summary.id = 'cewSummary';
    append(panels[3], previewTitle, summary, previewBar, preview, actions);
    panels.forEach((panel, index) => {
      const nav = document.createElement('div'); nav.className = 'cew-actions';
      if (index) { const back = document.createElement('button'); back.type = 'button'; back.className = 'btn btn-ghost'; back.textContent = 'السابق'; back.addEventListener('click', () => setStep(index)); nav.append(back); }
      if (index < 3) { const next = document.createElement('button'); next.type = 'button'; next.className = 'btn btn-primary'; next.textContent = 'التالي'; next.addEventListener('click', () => setStep(index + 2)); nav.append(next); }
      panel.append(nav);
    });

    function updateSummary() {
      summary.innerHTML = [
        ['اسم الشركة', valueOf('ce_nameAr') !== '—' ? valueOf('ce_nameAr') : valueOf('ce_nameEn')],
        ['الاسم الإنجليزي', valueOf('ce_nameEn')], ['الكود', valueOf('ce_code')],
        ['الوصف', valueOf('ce_tagline')], ['شرط الدفع', valueOf('ce_term')],
        ['شركة افتراضية', valueOf('ce_default')], ['التواصل', valueOf('ce_contact')],
        ['لون المستندات', valueOf('ce_accent')]
      ].map(([label, value]) => `<div class="cew-summary-item"><small>${label}</small><b>${value.replace(/</g, '&lt;')}</b></div>`).join('');
    }
    function updateProgress(index) {
      const nameAr = valueOf('ce_nameAr') !== '—', nameEn = valueOf('ce_nameEn') !== '—';
      const percentage = !nameAr && !nameEn ? 0 : (nameAr && nameEn ? 100 : 60);
      const color = percentage === 0 ? '#e34d4d' : percentage < 70 ? '#ed9d27' : '#16a26d';
      const ring = side.querySelector('.cew-ring'), fill = main.querySelector('.cew-progress-fill');
      ring.style.setProperty('--cew-progress', percentage + '%'); ring.dataset.value = percentage + '%';
      fill.style.width = percentage + '%'; fill.style.background = color;
      main.querySelector('.cew-progress-top span').textContent = `الخطوة ${index + 1} من 4`;
      [...stepLinks.children].forEach((link, i) => link.classList.toggle('done', i < index));
    }
    function setStep(number) {
      const index = Math.max(0, Math.min(3, number - 1));
      panels.forEach((panel, i) => panel.classList.toggle('active', i === index));
      [...stepLinks.children].forEach((link, i) => link.classList.toggle('active', i === index));
      updateSummary(); updateProgress(index); sessionStorage.setItem(storageKey, String(index + 1));
    }
    [...stepLinks.children].forEach((link, index) => link.addEventListener('click', () => setStep(index + 1)));
    overlay.addEventListener('input', () => { updateSummary(); updateProgress([...panels].findIndex(p => p.classList.contains('active'))); });
    overlay.addEventListener('change', () => { updateSummary(); updateProgress([...panels].findIndex(p => p.classList.contains('active'))); });
    setStep(Number(sessionStorage.getItem(storageKey)) || 1);
  }
  new MutationObserver(() => { if (overlay.classList.contains('open')) build(); }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  if (overlay.classList.contains('open')) build();
})();
