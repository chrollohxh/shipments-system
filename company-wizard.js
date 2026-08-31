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
  const invoicePreviewSettingsKey = 'baharSwakenInvoicePreviewSettings';
  const invoicePreviewDraftKey = 'baharSwakenInvoicePreviewDraft';
  let invoiceSettingsPanel = null;

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
    function addLayoutEditor(panel) {
      const defaults = {
        logo: { top: 4, left: 72, width: 20 },
        letterhead: { top: 1, left: 0, width: 100 },
        footer: { top: 87, left: 0, width: 100 }
      };
      company.brandLayout = company.brandLayout || {};
      Object.keys(defaults).forEach(key => company.brandLayout[key] = Object.assign({}, defaults[key], company.brandLayout[key] || {}));
      const editor = document.createElement('section'); editor.className = 'cew-layout-editor';
      editor.innerHTML = `<div class="cew-layout-head"><strong>استوديو هوية الشركة</strong><span>محرر خاص بالشعارات والأختام والترويسة والتذييل لهذه الشركة فقط. اسحب العنصر ثم غيّر حجمه واحفظ الشركة.</span></div><div class="cew-layout-body"><div class="cew-layout-canvas"></div><div class="cew-layout-tools"><h4>العنصر المحدد</h4><p id="cewLayoutHint">اختر عنصراً أو اسحبه.</p><div class="cew-layout-select"><button type="button" data-key="logo">الشعار</button><button type="button" data-key="stamp">الختم</button><button type="button" data-key="letterhead">الترويسة</button><button type="button" data-key="footer">التذييل</button></div><div class="cew-layout-size"><label>الحجم: <span class="cew-layout-value">—</span></label><input type="range" min="5" max="100" step="1" disabled></div><button type="button" class="btn btn-ghost btn-small cew-layout-reset">استرجاع موضع العنصر</button></div></div>`;
      const canvas = editor.querySelector('.cew-layout-canvas');
      const hint = editor.querySelector('#cewLayoutHint');
      const size = editor.querySelector('input[type="range"]');
      const value = editor.querySelector('.cew-layout-value');
      let selected = 'stamp';
      const itemInfo = {
        logo: { label: 'الشعار', source: () => company.logo, pos: () => company.brandLayout.logo, max: 45 },
        stamp: { label: 'الختم', source: () => company.stamp, pos: () => company.stampPos, max: 45 },
        letterhead: { label: 'الترويسة', source: () => company.letterheadImg, pos: () => company.brandLayout.letterhead, max: 100 },
        footer: { label: 'التذييل', source: () => company.footerImg, pos: () => company.brandLayout.footer, max: 100 }
      };
      const syncExistingControls = key => {
        const p = itemInfo[key].pos();
        if (key === 'stamp') {
          ['W','T','L'].forEach((part, index) => { const input = document.getElementById('ce_stamp' + part); if (input) input.value = [p.width,p.top,p.left][index]; });
          document.getElementById('ce_stampWVal').textContent = p.width; document.getElementById('ce_stampTVal').textContent = p.top; document.getElementById('ce_stampLVal').textContent = p.left;
        }
        if (key === 'logo') { company.logoWidth = Math.round(p.width * 6.5); document.getElementById('ce_logoW').value = company.logoWidth; document.getElementById('ce_logoWVal').textContent = company.logoWidth; }
        if (key === 'letterhead') { company.letterheadWidth = Math.round(p.width); document.getElementById('ce_letterheadW').value = company.letterheadWidth; document.getElementById('ce_letterheadWVal').textContent = company.letterheadWidth; }
        if (key === 'footer') { company.footerWidth = Math.round(p.width); document.getElementById('ce_footerW').value = company.footerWidth; document.getElementById('ce_footerWVal').textContent = company.footerWidth; }
      };
      const draw = () => {
        canvas.querySelectorAll('.cew-layout-item').forEach(el => el.remove());
        Object.entries(itemInfo).forEach(([key, info]) => {
          const p = info.pos(); const item = document.createElement('div'); item.className = 'cew-layout-item' + (selected === key ? ' selected' : ''); item.dataset.key = key;
          item.style.cssText = `top:${p.top}%;left:${p.left}%;width:${p.width}%;`;
          const src = info.source(); item.innerHTML = src ? `<img src="${src}" alt="${info.label}">` : `<div class="cew-layout-placeholder">${info.label}</div>`;
          item.addEventListener('pointerdown', event => {
            selected = key;
            canvas.querySelectorAll('.cew-layout-item').forEach(el => el.classList.toggle('selected', el === item));
            hint.textContent = info.label + ' — اسحبه لتغيير الموضع.'; size.max = info.max; size.value = p.width; value.textContent = Math.round(p.width) + '%';
            item.setPointerCapture(event.pointerId);
            const start = { x:event.clientX, y:event.clientY, top:p.top, left:p.left };
            const move = moveEvent => { const rect = canvas.getBoundingClientRect(); p.left = Math.max(0, Math.min(100 - p.width, start.left + (moveEvent.clientX-start.x)/rect.width*100)); p.top = Math.max(0, Math.min(100 - 4, start.top + (moveEvent.clientY-start.y)/rect.height*100)); item.style.left = p.left + '%'; item.style.top = p.top + '%'; };
            item.addEventListener('pointermove', move); item.addEventListener('pointerup', () => { item.removeEventListener('pointermove', move); syncExistingControls(key); }, { once:true });
          }); canvas.append(item);
        });
        const current = itemInfo[selected]; const p = current.pos();
        hint.textContent = current.label + ' — اسحبه لتغيير الموضع.'; size.disabled = false; size.max = current.max; size.value = p.width; value.textContent = Math.round(p.width) + '%';
        editor.querySelectorAll('.cew-layout-select button').forEach(button => button.classList.toggle('active', button.dataset.key === selected));
      };
      editor.querySelectorAll('.cew-layout-select button').forEach(button => button.addEventListener('click', () => { selected = button.dataset.key; draw(); }));
      size.addEventListener('input', () => { itemInfo[selected].pos().width = Number(size.value); syncExistingControls(selected); draw(); });
      editor.querySelector('.cew-layout-reset').addEventListener('click', () => { if (selected === 'stamp') Object.assign(company.stampPos, { top:66, left:10, width:20 }); else Object.assign(company.brandLayout[selected], defaults[selected]); syncExistingControls(selected); draw(); });
      panel.append(editor); draw();
    }
    append(panels[0], initialGrid);
    const docs = document.createElement('div'); docs.className = 'cew-upload-card'; append(docs, imagesTitle, imageGrid, brandTitle, brandGrid, brandFiles); panels[1].append(docs);
    append(panels[2], stampTitle, stampGrid, footerTitle, footerGrid);
    // محرر النماذج العام خاص بمستندات الشحن؛ لا نعرضه في إعدادات الشركة.
    const legacyTemplateButton = document.getElementById('ceTplEditBtn');
    if (legacyTemplateButton) legacyTemplateButton.style.display = 'none';
    const summary = document.createElement('div'); summary.className = 'cew-summary'; summary.id = 'cewSummary';
    append(panels[3], previewTitle);
    addLayoutEditor(panels[3]);
    // Bahar Swaken's invoice controls belong at the start of its company setup.
    invoiceSettingsPanel = panels[0];
    append(panels[3], summary, previewBar, preview, actions);
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
    // Opening Bahar Swaken always starts from its invoice-template settings.
    overlay.showBaharInvoiceSettings = () => setStep(1);
    [...stepLinks.children].forEach((link, index) => link.addEventListener('click', () => setStep(index + 1)));
    overlay.addEventListener('input', () => { updateSummary(); updateProgress([...panels].findIndex(p => p.classList.contains('active'))); });
    overlay.addEventListener('change', () => { updateSummary(); updateProgress([...panels].findIndex(p => p.classList.contains('active'))); });
    setStep(isBaharSwaken() ? 1 : (Number(sessionStorage.getItem(storageKey)) || 1));
  }

  function isBaharSwaken() {
    const ar = (document.getElementById('ce_nameAr')?.value || '').trim();
    const en = (document.getElementById('ce_nameEn')?.value || '').trim();
    return /بحر\s*سواكن|bahar\s*swaken/i.test(ar + ' ' + en);
  }

  function invoicePreviewDefaults() {
    return { name:'Bahar Swaken — Commercial Invoice', accent:'#86191f', tableHeader:'#86191f', tableFont:'IBM Plex Sans', background:'', watermark:'', watermarkOpacity:7, showWatermark:false, signature:'', stamp:'', showStamp:true, showSigLine:true, stampPosition:{xPercent:78,yPercent:78,widthPercent:13,rotate:0}, signaturePosition:{xPercent:10,yPercent:81,widthPercent:23,rotate:0} };
  }

  function getInvoicePreviewSettings() {
    try { return Object.assign({}, invoicePreviewDefaults(), JSON.parse(localStorage.getItem(invoicePreviewSettingsKey) || '{}')); }
    catch (e) { return invoicePreviewDefaults(); }
  }

  function renderBaharSimpleSettings() {
    const host = overlay.querySelector('.cew-host');
    if (!host) return;
    let simple = document.getElementById('baharSimpleSettings');
    if (!isBaharSwaken()) {
      host.style.display = '';
      const modal = overlay.querySelector('.detail-card');
      if (modal?.dataset.baharOriginalStyle !== undefined) {
        modal.setAttribute('style', modal.dataset.baharOriginalStyle);
        modal.classList.remove('bahar-wide-editor');
        delete modal.dataset.baharOriginalStyle;
      }
      if (simple) simple.style.display = 'none';
      return;
    }
    host.style.display = 'none';
    const modal = overlay.querySelector('.detail-card');
    if (modal) {
      if (modal.dataset.baharOriginalStyle === undefined) modal.dataset.baharOriginalStyle = modal.getAttribute('style') || '';
      modal.classList.add('bahar-wide-editor');
      modal.style.cssText = modal.dataset.baharOriginalStyle + ';width:96vw;max-width:none;height:92vh;max-height:none;display:flex;flex-direction:column;overflow:hidden;';
    }
    if (!simple) {
      simple = document.createElement('section');
      simple.id = 'baharSimpleSettings';
      simple.style.cssText = 'margin:0;padding:24px 28px 30px;background:#fff;direction:rtl;';
      host.insertAdjacentElement('afterend', simple);
    }
    simple.style.display = '';
    const settings = getInvoicePreviewSettings();
    settings.stamp = company.stamp || settings.stamp || '';
    settings.showStamp = document.getElementById('ce_showStamp')?.checked ?? settings.showStamp;
    settings.showSigLine = document.getElementById('ce_showSigLine')?.checked ?? settings.showSigLine;
    const fileControl = (key, title, accept, value, help) => `<div class="bs-file" data-key="${key}"><label>${title}</label><small>${help}</small><div class="bs-file-row"><button type="button" class="btn btn-ghost btn-small bs-pick">إضافة / استبدال</button><button type="button" class="btn btn-ghost btn-small bs-remove">إزالة</button><input type="file" accept="${accept}" hidden></div><div class="bs-thumb">${value ? `<img src="${value}" alt="${title}">` : '<span>لا توجد صورة مرفوعة</span>'}</div></div>`;
    const transformControls = (key, title, values) => `<div class="bs-transform" data-transform="${key}"><strong>${title}</strong><div class="bs-transform-grid"><label>أفقي <b data-value="xPercent">${values.xPercent}</b>%<input data-prop="xPercent" type="range" min="0" max="100" step="0.5" value="${values.xPercent}"></label><label>عمودي <b data-value="yPercent">${values.yPercent}</b>%<input data-prop="yPercent" type="range" min="0" max="100" step="0.5" value="${values.yPercent}"></label><label>الحجم <b data-value="widthPercent">${values.widthPercent}</b>%<input data-prop="widthPercent" type="range" min="4" max="42" step="0.5" value="${values.widthPercent}"></label><label>التدوير <b data-value="rotate">${values.rotate}</b>°<input data-prop="rotate" type="range" min="-180" max="180" step="1" value="${values.rotate}"></label></div></div>`;
    const stampPosition = Object.assign({xPercent:78,yPercent:78,widthPercent:13,rotate:0}, settings.stampPosition || {});
    const signaturePosition = Object.assign({xPercent:10,yPercent:81,widthPercent:23,rotate:0}, settings.signaturePosition || {});
    simple.innerHTML = `
      <style>
        #baharSimpleSettings{flex:1;min-height:0;overflow:hidden!important;padding:0!important}#baharSimpleSettings .bs-workspace{height:100%;display:grid;grid-template-columns:minmax(340px,39%) minmax(0,61%);background:#f7f9fc}#baharSimpleSettings .bs-card{min-height:0;overflow:auto;border-left:1px solid #dbe4ee;padding:24px;background:#fff;box-shadow:none}
        #baharSimpleSettings .bs-top{display:flex;gap:24px;align-items:center;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid #e8eef5}#baharSimpleSettings .bs-toggle{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;cursor:pointer}#baharSimpleSettings .bs-toggle input{width:auto}
        #baharSimpleSettings .bs-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}#baharSimpleSettings .bs-file{margin-top:18px;border-top:1px solid #edf1f5;padding-top:18px}#baharSimpleSettings .bs-file label{display:block;font-weight:800;margin-bottom:4px}#baharSimpleSettings .bs-file small{color:#748194;font-size:12px}#baharSimpleSettings .bs-file-row{display:flex;gap:8px;margin:10px 0}.bs-thumb{height:120px;border:1px dashed #cdd9e6;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fbfcfe;color:#94a0af;font-size:12px}.bs-thumb img{max-width:100%;max-height:100%;object-fit:contain}.bs-transform{margin-top:12px;padding:14px;border:1px solid #e7edf4;border-radius:10px;background:#fbfcfe}.bs-transform-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:10px}.bs-transform label{font-size:12px;font-weight:700}.bs-transform input{display:block;width:100%;margin-top:6px}.bs-actions{display:flex;gap:10px;margin-top:22px}.bs-card h3{margin:0 0 5px}.bs-card p{margin:0;color:#718096;font-size:13px;line-height:1.65}.bs-live{min-width:0;min-height:0;padding:20px;display:flex;flex-direction:column;overflow:hidden}.bs-live-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.bs-live-head strong,.bs-live-head small{display:block}.bs-live-head small{font-size:12px;color:#7a8795;margin-top:3px}.bs-zoom{display:flex;gap:6px}.bs-zoom button{border:1px solid #d3dfeb;background:#fff;border-radius:7px;padding:6px 9px;font-weight:700;cursor:pointer}.bs-zoom button.active{background:#1677ff;color:#fff;border-color:#1677ff}.bs-page-stage{position:relative;flex:1;min-height:0;overflow:auto;display:flex;justify-content:center;align-items:flex-start;padding:12px;background:#e8eef4;border:1px solid #d4e0eb;border-radius:12px}.bs-live-frame{width:210mm;height:297mm;border:0;flex:0 0 auto;transform:scale(.62);transform-origin:top center;box-shadow:0 12px 26px rgba(28,42,56,.22)}@media(max-width:900px){#baharSimpleSettings .bs-workspace{grid-template-columns:1fr;height:auto;overflow:auto}#baharSimpleSettings{overflow:auto!important}#baharSimpleSettings .bs-card{overflow:visible;border-left:0;border-bottom:1px solid #dbe4ee}.bs-live{min-height:650px}}@media(max-width:700px){#baharSimpleSettings .bs-grid,#baharSimpleSettings .bs-transform-grid{grid-template-columns:1fr}#baharSimpleSettings .bs-top{align-items:flex-start;flex-direction:column;gap:12px}}
      </style>
      <div class="bs-workspace"><div class="bs-card">
        <div class="bs-top"><label class="bs-toggle"><input class="bs-show-stamp" type="checkbox"> إظهار الختم على الفاتورة</label><label class="bs-toggle"><input class="bs-show-signature" type="checkbox"> إظهار خط التوقيع</label></div>
        <h3>جدول فاتورة Bahar Swaken</h3><p>إعدادات خاصة بمعاينة فاتورة بحر سواكن فقط، ولا تؤثر على الشركات الأخرى أو الفواتير الحالية.</p>
        <div class="bs-grid" style="margin-top:18px"><div class="field"><label>اسم النموذج</label><input class="bs-name" dir="ltr"></div><div class="field"><label>خط جدول البنود</label><select class="bs-font"><option value="IBM Plex Sans">IBM Plex Sans</option></select></div><div class="field"><label>لون التصميم الرئيسي</label><input class="bs-accent" type="color"></div><div class="field"><label>لون رأس الجدول</label><input class="bs-header" type="color"></div></div>
        ${fileControl('background', 'خلفية جدول الفاتورة', 'image/png,image/jpeg,image/webp', settings.background, 'PNG أو JPG. تستخدم الصورة الأصلية عند الطباعة وPDF.')}
        <label class="bs-toggle" style="margin-top:10px"><input class="bs-show-watermark" type="checkbox"> إظهار العلامة المائية</label>
        ${fileControl('watermark', 'العلامة المائية', 'image/png,image/jpeg,image/webp', settings.watermark, 'PNG أو JPG. تظهر في فاتورة بحر سواكن فقط، وفقط لو "إظهار العلامة المائية" مفعّل.')}
        <div class="field" style="margin-top:10px"><label>شفافية العلامة المائية: <b class="bs-opacity-value"></b>%</label><input class="bs-opacity" type="range" min="0" max="100" step="1"></div>
        ${fileControl('stamp', 'صورة الختم', 'image/png,image/jpeg,image/webp', settings.stamp, 'PNG أو JPG. يمكن استخدام الختم الموجود أو رفع ختم خاص بهذا القالب.')}
        ${transformControls('stamp', 'تحريك وتعديل الختم', stampPosition)}
        ${fileControl('signature', 'صورة التوقيع', 'image/png,image/jpeg,image/webp', settings.signature, 'يفضل PNG بخلفية شفافة. الصورة اختيارية.')}
        ${transformControls('signature', 'تحريك وتعديل التوقيع', signaturePosition)}
        <div class="bs-actions"><button type="button" class="btn btn-primary bs-save">حفظ إعدادات المعاينة</button><button type="button" class="btn btn-ghost bs-preview">معاينة الطباعة</button></div>
      </div><aside class="bs-live"><div class="bs-live-head"><div><strong>المعاينة الحية</strong><small>نموذج A4 حقيقي</small></div><div class="bs-zoom"><button type="button" data-zoom=".62">Fit</button><button type="button" data-zoom=".75">75%</button><button type="button" data-zoom="1">100%</button></div></div><div class="bs-page-stage"><iframe class="bs-live-frame" title="المعاينة الحية لفاتورة بحر سواكن" src="/invoice-template-preview/bahar-swaken/?embed=editor"></iframe></div></aside></div>`;
    const one = selector => simple.querySelector(selector);
    one('.bs-name').value = settings.name;
    one('.bs-font').value = settings.tableFont;
    one('.bs-accent').value = settings.accent;
    one('.bs-header').value = settings.tableHeader;
    one('.bs-opacity').value = settings.watermarkOpacity;
    one('.bs-opacity-value').textContent = settings.watermarkOpacity;
    one('.bs-show-stamp').checked = !!settings.showStamp;
    one('.bs-show-signature').checked = !!settings.showSigLine;
    one('.bs-show-watermark').checked = !!settings.showWatermark;
    one('.bs-opacity').addEventListener('input', event => one('.bs-opacity-value').textContent = event.target.value);
    simple.querySelectorAll('.bs-file').forEach(card => {
      const key = card.dataset.key, input = card.querySelector('input');
      card.querySelector('.bs-pick').addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
        const file = input.files?.[0]; if (!file) return;
        const reader = new FileReader(); reader.onload = () => { card.dataset.value = reader.result; card.querySelector('.bs-thumb').innerHTML = `<img src="${reader.result}" alt="${key}">`; scheduleLivePreview(); }; reader.readAsDataURL(file);
      });
      card.querySelector('.bs-remove').addEventListener('click', () => { card.dataset.value = ''; input.value = ''; card.querySelector('.bs-thumb').innerHTML = '<span>لا توجد صورة مرفوعة</span>'; scheduleLivePreview(); });
    });
    simple.querySelectorAll('.bs-transform').forEach(group => group.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
      group.querySelector(`[data-value="${input.dataset.prop}"]`).textContent = input.value;
    })));
    const transformValue = key => Object.fromEntries([...simple.querySelectorAll(`[data-transform="${key}"] input`)].map(input => [input.dataset.prop, Number(input.value)]));
    const collect = () => ({
      name:one('.bs-name').value.trim() || invoicePreviewDefaults().name, tableFont:one('.bs-font').value, accent:one('.bs-accent').value, tableHeader:one('.bs-header').value,
      background:simple.querySelector('[data-key="background"]').dataset.value || settings.background || '', watermark:simple.querySelector('[data-key="watermark"]').dataset.value || settings.watermark || '',
      signature:simple.querySelector('[data-key="signature"]').dataset.value || settings.signature || '', watermarkOpacity:Number(one('.bs-opacity').value), stamp:simple.querySelector('[data-key="stamp"]').dataset.value || settings.stamp || company.stamp || '', showStamp:one('.bs-show-stamp').checked, showSigLine:one('.bs-show-signature').checked, showWatermark:one('.bs-show-watermark').checked, stampPosition:transformValue('stamp'), signaturePosition:transformValue('signature')
    });
    const liveFrame = one('.bs-live-frame');
    let liveTimer;
    const sendLivePreview = () => {
      const draft = collect();
      localStorage.setItem(invoicePreviewDraftKey, JSON.stringify(draft));
      liveFrame.contentWindow?.postMessage({ type:'bahar-live-settings', settings:draft }, location.origin);
    };
    const scheduleLivePreview = () => { clearTimeout(liveTimer); liveTimer = setTimeout(sendLivePreview, 60); };
    liveFrame.addEventListener('load', sendLivePreview);
    simple.addEventListener('input', scheduleLivePreview);
    simple.addEventListener('change', scheduleLivePreview);
    one('.bs-zoom').addEventListener('click', event => {
      const button = event.target.closest('[data-zoom]'); if (!button) return;
      const zoom = Number(button.dataset.zoom);
      liveFrame.style.transform = `scale(${zoom})`;
      simple.querySelectorAll('[data-zoom]').forEach(item => item.classList.toggle('active', item === button));
    });
    one('[data-zoom=".62"]').classList.add('active');
    if (overlay._baharLiveMessageHandler) window.removeEventListener('message', overlay._baharLiveMessageHandler);
    overlay._baharLiveMessageHandler = event => {
      if (event.origin !== location.origin || event.data?.type !== 'bahar-live-position') return;
      const group = simple.querySelector(`[data-transform="${event.data.key}"]`); if (!group) return;
      Object.entries(event.data.position || {}).forEach(([prop, value]) => {
        const input = group.querySelector(`[data-prop="${prop}"]`); if (!input) return;
        input.value = value; group.querySelector(`[data-value="${prop}"]`).textContent = value;
      });
      scheduleLivePreview();
    };
    window.addEventListener('message', overlay._baharLiveMessageHandler);
    const store = () => {
      const next = collect(); localStorage.setItem(invoicePreviewSettingsKey, JSON.stringify(next)); localStorage.removeItem(invoicePreviewDraftKey);
      const stampToggle = document.getElementById('ce_showStamp'), signatureToggle = document.getElementById('ce_showSigLine');
      if (stampToggle) { stampToggle.checked = next.showStamp; stampToggle.dispatchEvent(new Event('change', { bubbles:true })); }
      if (signatureToggle) { signatureToggle.checked = next.showSigLine; signatureToggle.dispatchEvent(new Event('change', { bubbles:true })); }
    };
    one('.bs-save').addEventListener('click', () => { store(); if (typeof toast === 'function') toast('تم حفظ إعدادات معاينة Bahar Swaken'); });
    one('.bs-preview').addEventListener('click', () => { store(); window.open('/invoice-template-preview/bahar-swaken/', '_blank', 'noopener'); });
  }

  function syncBaharInvoiceSettings() {
    if (!invoiceSettingsPanel) return;
    const existing = invoiceSettingsPanel.querySelector('.cew-bahar-invoice');
    const legacyPreviewTitle = [...overlay.querySelectorAll('.section-title')]
      .find(el => el.textContent.trim() === 'معاينة المستند');
    renderBaharSimpleSettings();
    if (isBaharSwaken()) return;
    if (!isBaharSwaken()) {
      if (existing) existing.remove();
      const previewBox = document.getElementById('cePreview');
      const previewButton = document.getElementById('cePreviewBtn');
      if (previewBox?.dataset.baharPreview) {
        delete previewBox.dataset.baharPreview;
        previewBox.classList.remove('cew-bahar-preview');
        previewBox.innerHTML = '<span class="ce-hint">اضغط "تحديث المعاينة" لعرض شكل الفاتورة</span>';
      }
      if (previewButton) previewButton.textContent = 'تحديث المعاينة';
      if (legacyPreviewTitle) {
        legacyPreviewTitle.style.display = '';
        if (legacyPreviewTitle.nextElementSibling) legacyPreviewTitle.nextElementSibling.style.display = '';
        if (legacyPreviewTitle.nextElementSibling?.nextElementSibling) legacyPreviewTitle.nextElementSibling.nextElementSibling.style.display = '';
      }
      return;
    }
    if (existing) return;
    const settings = getInvoicePreviewSettings();
    // The standard company preview renders the legacy invoice. Keep it for all
    // other companies, but do not show it while configuring Bahar Swaken.
    if (legacyPreviewTitle) {
      legacyPreviewTitle.style.display = 'none';
      if (legacyPreviewTitle.nextElementSibling) legacyPreviewTitle.nextElementSibling.style.display = 'none';
      if (legacyPreviewTitle.nextElementSibling?.nextElementSibling) legacyPreviewTitle.nextElementSibling.nextElementSibling.style.display = 'none';
    }
    const section = document.createElement('section');
    section.className = 'cew-bahar-invoice cew-upload-card';
    section.innerHTML = `
      <div class="section-title">جدول فاتورة Bahar Swaken</div>
      <p style="margin:-4px 0 14px;color:#718096;font-size:12px;line-height:1.65;">إعدادات خاصة بمعاينة فاتورة بحر سواكن فقط، ولا تؤثر على الشركات الأخرى أو الفواتير الحالية.</p>
      <div class="grid">
        <div class="field"><label>اسم النموذج</label><input class="bi-name" dir="ltr"></div>
        <div class="field"><label>خط جدول البنود</label><select class="bi-font"><option value="IBM Plex Sans">IBM Plex Sans</option></select></div>
        <div class="field"><label>لون التصميم الرئيسي</label><input class="bi-accent" type="color"></div>
        <div class="field"><label>لون رأس الجدول</label><input class="bi-header" type="color"></div>
        <div class="field"><label>خلفية جدول الفاتورة (ترويسة وتذييل)</label><input class="bi-background" type="file" accept="image/png,image/jpeg,image/webp"><div class="bi-background-status"></div></div>
        <div class="field"><label>العلامة المائية</label><input class="bi-watermark" type="file" accept="image/*"><div class="bi-watermark-status"></div></div>
        <div class="field"><label>شفافية العلامة المائية: <b class="bi-opacity-value"></b>%</label><input class="bi-opacity" type="range" min="0" max="25" step="1"></div>
      </div>
      <div class="cew-actions"><button type="button" class="btn btn-primary bi-save">حفظ إعدادات المعاينة</button><button type="button" class="btn btn-ghost bi-preview">فتح معاينة التصميم</button><button type="button" class="btn btn-ghost bi-reset">استرجاع المعتمد</button></div>
      <div class="section-title" style="margin-top:18px">معاينة جدول بحر سواكن</div>
      <div class="bi-inline-preview" style="width:100%;height:360px;overflow:hidden;border:1px solid #d8e3f0;border-radius:12px;background:#eef3f8;padding:10px;display:flex;justify-content:center;align-items:flex-start">
        <iframe title="معاينة فاتورة بحر سواكن" src="/invoice-template-preview/bahar-swaken/?embed=1" style="width:210mm;height:297mm;border:0;transform:scale(.36);transform-origin:top center;pointer-events:none"></iframe>
      </div>`;
    // Put the Bahar invoice controls first, before the ordinary company fields.
    invoiceSettingsPanel.insertBefore(section, invoiceSettingsPanel.querySelector('.cew-panel-head')?.nextElementSibling || null);
    const one = selector => section.querySelector(selector);
    one('.bi-name').value = settings.name;
    one('.bi-font').value = settings.tableFont;
    one('.bi-accent').value = settings.accent;
    one('.bi-header').value = settings.tableHeader;
    one('.bi-opacity').value = settings.watermarkOpacity;
    one('.bi-background-status').textContent = settings.background ? 'تم اختيار خلفية الفاتورة' : 'لا توجد خلفية مرفوعة';
    one('.bi-opacity-value').textContent = settings.watermarkOpacity;
    one('.bi-watermark-status').textContent = settings.watermark ? 'تم اختيار علامة مائية' : 'لا توجد صورة مرفوعة';
    one('.bi-opacity').addEventListener('input', event => one('.bi-opacity-value').textContent = event.target.value);
    one('.bi-background').addEventListener('change', event => {
      const file = event.target.files && event.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { one('.bi-background').dataset.value = reader.result; one('.bi-background-status').textContent = file.name; };
      reader.readAsDataURL(file);
    });
    one('.bi-watermark').addEventListener('change', event => {
      const file = event.target.files && event.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { one('.bi-watermark').dataset.value = reader.result; one('.bi-watermark-status').textContent = file.name; };
      reader.readAsDataURL(file);
    });
    one('.bi-save').addEventListener('click', () => {
      const current = getInvoicePreviewSettings();
      localStorage.setItem(invoicePreviewSettingsKey, JSON.stringify({
        name:one('.bi-name').value.trim() || invoicePreviewDefaults().name,
        tableFont:one('.bi-font').value, accent:one('.bi-accent').value, tableHeader:one('.bi-header').value,
        background:one('.bi-background').dataset.value || current.background || '',
        watermark:one('.bi-watermark').dataset.value || current.watermark || '', watermarkOpacity:Number(one('.bi-opacity').value)
      }));
      if (typeof toast === 'function') toast('تم حفظ إعدادات معاينة Bahar Swaken');
      refreshBaharPreview();
    });
    one('.bi-preview').addEventListener('click', () => window.open('/invoice-template-preview/bahar-swaken/', '_blank', 'noopener'));
    one('.bi-reset').addEventListener('click', () => { localStorage.removeItem(invoicePreviewSettingsKey); section.remove(); syncBaharInvoiceSettings(); });
    const refreshBaharPreview = () => {
      const box = document.getElementById('cePreview');
      if (!box) return;
      box.dataset.baharPreview = '1';
      box.classList.add('cew-bahar-preview');
      box.innerHTML = '<iframe title="معاينة فاتورة بحر سواكن" src="/invoice-template-preview/bahar-swaken/?embed=1&v=' + Date.now() + '" style="width:210mm;height:297mm;border:0;transform:scale(.36);transform-origin:top center;pointer-events:none"></iframe>';
      const button = document.getElementById('cePreviewBtn');
      if (button) button.textContent = 'تحديث معاينة قالب بحر سواكن';
    };
    const previewButton = document.getElementById('cePreviewBtn');
    if (previewButton && !previewButton.dataset.baharPreviewBound) {
      previewButton.dataset.baharPreviewBound = '1';
      previewButton.addEventListener('click', event => {
        if (!isBaharSwaken()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        refreshBaharPreview();
      }, true);
    }
    refreshBaharPreview();
  }

  new MutationObserver(() => {
    if (!overlay.classList.contains('open')) return;
    build();
    const legacyTemplateButton = document.getElementById('ceTplEditBtn');
    if (legacyTemplateButton) legacyTemplateButton.style.display = 'none';
    setTimeout(() => {
      syncBaharInvoiceSettings();
      if (isBaharSwaken()) overlay.showBaharInvoiceSettings?.();
    }, 0);
  }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  if (overlay.classList.contains('open')) build();
})();

// Bahar Swaken uses a dedicated shipment invoice sheet. Keeping this override
// here lets the company settings load it without changing other templates.
(() => {
  if (window.__baharShipmentInvoicePatch || typeof window.invoiceSheet !== 'function') return;
  window.__baharShipmentInvoicePatch = true;

  const legacyInvoiceSheet = window.invoiceSheet;
  const isBaharSwaken = value => /بحر\s*سواكن|bahar\s*swaken/i.test(`${value?.nameAr || ''} ${value?.nameEn || ''}`);
  const setting = () => {
    try { return JSON.parse(localStorage.getItem('baharSwakenInvoicePreviewSettings') || '{}'); }
    catch (_) { return {}; }
  };
  const safe = value => typeof esc === 'function' ? esc(value ?? '') : String(value ?? '');

  const baharSheet = (record, kind) => {
    const currentCompany = company;
    const settings = setting();
    const proforma = kind === 'proforma';
    const rows = Array.from({ length: 15 }, (_, index) => {
      if (index === 0) {
        return {
          description: record.itemDesc || '',
          quantity: record.qty || '',
          packaging: record.qtyUnit || '',
          hsCode: record.hsCode || '',
          price: record.unitPrice || '',
          amount: record.totalAmount || ''
        };
      }
      const suffix = String(index + 1);
      return {
        description: record[`item${suffix}Desc`] || '',
        quantity: record[`item${suffix}Qty`] || '',
        packaging: record[`item${suffix}Unit`] || '',
        hsCode: record[`item${suffix}HsCode`] || '',
        price: record[`item${suffix}Price`] || '',
        amount: record[`item${suffix}Amount`] || ''
      };
    }).filter((row, index) => index === 0 || row.description || row.quantity || row.packaging);
    const visibleRows = Array.from({ length: Math.max(5, rows.length) }, (_, index) => rows[index] || {});
    // Shrink the items table as row count grows, so it can never grow tall enough to
    // collide with the stamp/signature (which sit at fixed page positions).
    const rowCount = visibleRows.length;
    let itemsFs = '8.4px', thFs = '7.2px', thPad = '2.4mm 1.5mm', tdH = '8.2mm', tdPad = '1.5mm';
    if (rowCount >= 13) { itemsFs = '6px'; thFs = '5.6px'; thPad = '1mm 1mm'; tdH = '4.4mm'; tdPad = '0.6mm'; }
    else if (rowCount >= 10) { itemsFs = '6.8px'; thFs = '6.2px'; thPad = '1.4mm 1.2mm'; tdH = '5.4mm'; tdPad = '0.9mm'; }
    else if (rowCount >= 7) { itemsFs = '7.5px'; thFs = '6.8px'; thPad = '1.8mm 1.3mm'; tdH = '6.5mm'; tdPad = '1.1mm'; }
    const accent = settings.tableHeader || settings.accent || currentCompany.accent || '#86191f';
    const background = settings.background || '';
    const watermark = settings.showWatermark ? (settings.watermark || currentCompany.watermark || currentCompany.logo || '') : '';
    const stamp = settings.showStamp === false ? '' : (settings.stamp || currentCompany.stamp || '');
    const sign = settings.signature || '';
    const stampPos = Object.assign({ xPercent: 78, yPercent: 78, widthPercent: 13, rotate: 0 }, settings.stampPosition || {});
    const signPos = Object.assign({ xPercent: 10, yPercent: 81, widthPercent: 23, rotate: 0 }, settings.signaturePosition || {});
    const date = typeof fmtDateByLang === 'function' ? fmtDateByLang(proforma ? record.proformaDate : record.invoiceDate, 'en') : (proforma ? record.proformaDate : record.invoiceDate);
    const itemRows = visibleRows.map(row => `<tr><td class="desc">${safe(row.description)}</td><td>${safe(row.quantity)}</td><td>${safe(row.packaging)}</td><td>${safe(row.hsCode)}</td><td>${safe(record.grossWeight || '—')}</td><td>${safe(row.price)}</td><td>${safe(row.amount)}</td></tr>`).join('');
    const body = `
      <style>
        .bahar-shipment-sheet{position:relative;width:210mm;height:297mm;margin:0 auto;overflow:hidden;background:#fff;color:#17202b;font-family:'IBM Plex Sans',Arial,sans-serif;page-break-after:always;break-after:page;direction:ltr;text-align:left}.bahar-shipment-sheet *{box-sizing:border-box}.bahar-shipment-sheet .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;z-index:0}.bahar-shipment-sheet main{position:relative;z-index:2;padding:${background ? '56mm 14mm 37mm' : '18mm 14mm'}}.bahar-shipment-sheet .wm{position:absolute;z-index:1;top:25%;left:22%;width:56%;max-height:52%;object-fit:contain;opacity:.06}.bahar-shipment-sheet .brand{height:24mm;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid var(--red);margin-bottom:8mm}.bahar-shipment-sheet .brand b{font-size:17px;letter-spacing:1.5px}.bahar-shipment-sheet .brand small{display:block;font-size:10px}.bahar-shipment-sheet .brand img{max-width:34mm;max-height:20mm;object-fit:contain}.bahar-shipment-sheet .title{background:var(--red);color:#fff;text-align:center;padding:3.2mm;font-size:15px;font-weight:800;letter-spacing:1px}.bahar-shipment-sheet .meta{display:grid;grid-template-columns:1fr 1.2fr;border:1px solid var(--red);border-top:0}.bahar-shipment-sheet .meta>div{min-height:15mm;padding:3mm;border-inline-end:1px solid #dfc9ca;display:flex;flex-direction:column;gap:2mm}.bahar-shipment-sheet .meta .wide{grid-column:1/-1;border-top:1px solid #dfc9ca;border-inline-end:0;min-height:13mm}.bahar-shipment-sheet b{font-size:7px;letter-spacing:.5px}.bahar-shipment-sheet .meta b,.bahar-shipment-sheet .terms b{color:var(--red)}.bahar-shipment-sheet .meta span,.bahar-shipment-sheet .terms span{font-size:9px;font-weight:700;line-height:1.35}.bahar-shipment-sheet table{width:100%;border-collapse:collapse;margin-top:4mm;font-size:${itemsFs}}.bahar-shipment-sheet th{background:var(--red);color:#fff;border:1px solid var(--red);padding:${thPad};font-size:${thFs};white-space:nowrap}.bahar-shipment-sheet td{height:${tdH};border:1px solid #d8dce0;padding:${tdPad};text-align:center;background:transparent}.bahar-shipment-sheet .desc{text-align:left;font-weight:700}.bahar-shipment-sheet .totals{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:3mm}.bahar-shipment-sheet .totals>div{background:transparent;border:1px solid #d8dce0;padding:3mm 4mm;display:flex;justify-content:space-between}.bahar-shipment-sheet .totals>div:last-child{background:var(--red);color:#fff;border-color:var(--red)}.bahar-shipment-sheet .totals strong{font-size:12px;color:var(--red)}.bahar-shipment-sheet .totals>div:last-child strong{color:#fff}.bahar-shipment-sheet .words{background:var(--red);color:#fff;text-align:center;font-size:8px;font-weight:800;padding:2.8mm;margin-top:3mm}.bahar-shipment-sheet .terms{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--red);margin-top:3mm;background:transparent}.bahar-shipment-sheet .terms>div{min-height:18mm;padding:3mm;border-inline-end:1px solid #dfc9ca;display:flex;flex-direction:column;gap:2mm}.bahar-shipment-sheet .line{position:absolute;left:14mm;bottom:${background ? '37mm' : '18mm'};width:80mm;border-bottom:1px solid #7c8490;padding-bottom:2mm;font-size:8px;color:#59616a;font-weight:700}.bahar-shipment-sheet .stamp,.bahar-shipment-sheet .signature{position:absolute;z-index:3;object-fit:contain;transform-origin:center}@media print{.bahar-shipment-sheet{page-break-after:auto;break-after:auto}}
      </style>
      <div class="bahar-shipment-sheet" style="--red:${safe(accent)}">
        ${background ? `<img class="bg" src="${background}" alt="">` : ''}
        ${watermark ? `<img class="wm" src="${watermark}" alt="">` : ''}
        <main>
          ${background ? '' : `<header class="brand"><div><b>${safe(currentCompany.nameEn || 'BAHAR SWAKEN GENERAL TRADING L.L.C')}</b><small>${safe(currentCompany.nameAr || '')}</small></div>${currentCompany.logo ? `<img src="${currentCompany.logo}" alt="">` : ''}</header>`}
          <div class="title">${proforma ? 'PROFORMA INVOICE' : 'COMMERCIAL INVOICE'}</div>
          <section class="meta"><div><b>INVOICE NO &amp; DATE</b><span>${safe(proforma ? record.proformaNo : record.invoiceNo)} · ${safe(date)}</span></div><div><b>CONSIGNEE</b><span>${safe(record.consignee)}</span></div><div class="wide"><b>ADDRESS</b><span>${safe(record.consigneeAddress || record.portDischarge || '')}</span></div></section>
          <table><thead><tr><th>DESCRIPTION</th><th>QUANTITY</th><th>PACKAGING TYPE</th><th>HS CODE</th><th>WEIGHT</th><th>AED U. PRICE</th><th>AED AMOUNT</th></tr></thead><tbody>${itemRows}</tbody></table>
          <section class="totals"><div><b>TOTAL PACKAGES</b><strong>${safe(record.totalQty || record.qty || '')} ${safe(record.qtyUnit || '')}</strong></div><div><b>TOTAL AMOUNT</b><strong>${safe(record.totalAmount || rows[0]?.amount || '')}</strong></div></section>
          ${record.amountInWords ? `<div class="words">${safe(record.amountInWords)}</div>` : ''}
          <section class="terms"><div><b>INCOTERM</b><span>${safe(record.incoterm || '')}</span></div><div><b>PORT OF DELIVERY</b><span>${safe(record.portDischarge || '')}</span></div><div><b>COUNTRY OF ORIGIN</b><span>${safe(record.countryOfOrigin || '')}</span></div><div><b>TERM OF PAYMENTS</b><span>${safe(record.paymentTerm || '')}</span></div></section>
          ${settings.showSigLine === false ? '' : '<div class="line">Authorized Signature &amp; Company Stamp</div>'}
        </main>
        ${stamp ? `<img class="stamp" src="${stamp}" alt="" style="left:${stampPos.xPercent}%;top:${stampPos.yPercent}%;width:${stampPos.widthPercent}%;transform:rotate(${stampPos.rotate}deg)">` : ''}
        ${sign ? `<img class="signature" src="${sign}" alt="" style="left:${signPos.xPercent}%;top:${signPos.yPercent}%;width:${signPos.widthPercent}%;transform:rotate(${signPos.rotate}deg)">` : ''}
      </div>`;
    return body;
  };

  window.invoiceSheet = function baharAwareInvoiceSheet(record, kind, lang) {
    if (isBaharSwaken(company) && (kind === 'proforma' || kind === 'invoice')) return baharSheet(record, kind);
    return legacyInvoiceSheet(record, kind, lang);
  };
})();
