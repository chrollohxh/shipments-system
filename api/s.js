const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vthcmqqiexaedukduquv.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[char]);
const text = value => String(value ?? '').trim();
const field = (label, value) => value ? `<div class="field"><b>${esc(label)}</b><span>${esc(value)}</span></div>` : '';

function shipmentItems(record) {
  const items = [];
  for (let number = 1; number <= 15; number += 1) {
    const suffix = number === 1 ? '' : number;
    const item = {
      description: text(record[`item${suffix}Desc`] || (number === 1 ? record.itemDesc : '')),
      quantity: text(record[`item${suffix}Qty`] || (number === 1 ? record.qty : '')),
      packaging: text(record[`item${suffix}Unit`] || (number === 1 ? record.qtyUnit : '')),
      hsCode: text(record[`item${suffix}HsCode`] || (number === 1 ? record.hsCode : '')),
      price: text(record[`item${suffix}Price`] || (number === 1 ? record.unitPrice : '')),
      amount: text(record[`item${suffix}Amount`] || (number === 1 ? record.totalAmount : ''))
    };
    if (item.description || item.quantity || item.amount) items.push(item);
  }
  return items.length ? items : [{ description: record.itemDesc || '—', quantity: record.qty || '', packaging: record.qtyUnit || '', hsCode: record.hsCode || '', price: record.unitPrice || '', amount: record.totalAmount || '' }];
}

function table(headers, rows) {
  return `<table><thead><tr>${headers.map(header => `<th>${esc(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function documentPage(id, title, number, date, content, total) {
  return `<article class="document" id="${id}"><header class="doc-head"><div><div class="brand">BAHAR SWAKEN GENERAL TRADING L.L.C</div><h2>${esc(title)}</h2></div><div class="doc-meta"><b>${esc(number)}</b><span>${esc(date)}</span></div></header>${content}${total ? `<div class="total"><span>TOTAL AMOUNT</span><b>${esc(total)}</b></div>` : ''}</article>`;
}

function page(title, content) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | ملف العملية</title><style>
    @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#eef3f8;color:#102a43;font-family:Tahoma,'IBM Plex Sans Arabic',sans-serif}.shell{max-width:1000px;margin:26px auto 48px}.hero,.document{background:#fff;border:1px solid #dce6f1;border-radius:16px;box-shadow:0 12px 30px #17355d12}.hero{padding:30px;margin-bottom:16px}.head,.doc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:3px solid #9b1c24;padding-bottom:18px}.brand{color:#9b1c24;font-size:12px;font-weight:900;letter-spacing:.8px}.head h1{margin:7px 0;font-size:27px}.doc-head h2{margin:7px 0 0;font-size:22px;direction:ltr}.operation{display:inline-block;background:#edf5ff;color:#1769e8;border-radius:999px;padding:7px 12px;font-size:13px;font-weight:800;direction:ltr}.buttons{display:flex;gap:8px;flex-wrap:wrap}.print,.jump{border:1px solid #cad8e6;border-radius:9px;padding:10px 13px;background:#fff;color:#17355d;font:inherit;font-size:12px;font-weight:800;text-decoration:none;cursor:pointer}.print{background:#1769e8;border-color:#1769e8;color:#fff}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:22px}.field{border:1px solid #dbe5ef;border-radius:10px;padding:11px;background:#fbfdff;min-width:0}.field b{display:block;font-size:11px;color:#64748b;margin-bottom:5px}.field span{display:block;font-size:13px;font-weight:700;word-break:break-word;direction:auto}.documents-label{font-size:14px;font-weight:900;color:#526a83;margin:25px 0 10px}.document{margin-top:18px;padding:15mm;min-height:267mm;page-break-after:always;break-after:page}.doc-meta{display:grid;gap:5px;text-align:left;direction:ltr;font-size:12px;color:#50637a}.doc-meta b{font-size:14px;color:#102a43}.intro{line-height:1.8;margin:20px 0;color:#344b63}table{width:100%;border-collapse:collapse;margin-top:18px;direction:ltr}th{background:#9b1c24;color:#fff;border:1px solid #9b1c24;padding:9px 7px;text-align:left;font-size:11px}td{border:1px solid #bfcbd6;padding:8px 7px;font-size:11px;vertical-align:top;word-break:break-word}.total{margin-top:14px;margin-inline-start:auto;max-width:300px;display:flex;justify-content:space-between;gap:18px;padding:11px 13px;background:#fbe9ea;border:1px solid #9b1c24;color:#801720;direction:ltr;font-size:12px}.total b{font-size:14px}.data-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border:1px solid #bfcbd6;margin-top:18px;direction:ltr}.data-list div{padding:10px;border-bottom:1px solid #d9e1e9;min-height:50px}.data-list b{display:block;font-size:10px;color:#66778a;margin-bottom:4px}.data-list span{font-size:12px;font-weight:700;word-break:break-word}.note{white-space:pre-line;line-height:1.8;border:1px solid #dbe5ef;border-radius:10px;padding:13px;background:#fbfdff;margin-top:18px}@media(max-width:680px){.shell{margin:0}.hero,.document{border-radius:0;border-inline:0}.hero{padding:20px}.head,.doc-head{display:block}.buttons{margin-top:16px}.grid,.data-list{grid-template-columns:1fr}.document{padding:20px;min-height:0}.doc-meta{margin-top:12px;text-align:right;direction:rtl}}@media print{body{background:#fff}.shell{max-width:none;margin:0}.hero{box-shadow:none;border:0;border-radius:0;padding:14mm;page-break-after:always;break-after:page}.document{box-shadow:none;border:0;border-radius:0;margin:0;min-height:297mm;padding:15mm;page-break-after:always;break-after:page}.document:last-child{page-break-after:auto;break-after:auto}.buttons{display:none}.head,.doc-head{border-bottom-color:#000}.brand{color:#000}th{background:#fff!important;color:#000!important;border-color:#000!important}td,.data-list{border-color:#000!important}.total{background:#fff!important;color:#000!important;border-color:#000!important}}
  </style></head><body><main class="shell">${content}</main></body></html>`;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const id = String(req.query.i || req.query.id || '').trim();
  if (!id) return res.status(400).send(page('رابط غير مكتمل', '<section class="hero"><h1>رابط الشحنة غير مكتمل</h1><p>امسح رمز QR مرة أخرى.</p></section>'));
  if (!SERVICE_KEY) return res.status(503).send(page('إعداد العرض العام', '<section class="hero"><h1>العرض العام غير جاهز بعد</h1><p>يلزم ربط مفتاح خادم قاعدة البيانات.</p></section>'));

  try {
    const headers = { apikey: SERVICE_KEY };
    if (!SERVICE_KEY.startsWith('sb_secret_')) headers.Authorization = `Bearer ${SERVICE_KEY}`;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/shipments?select=id,status,data&id=eq.${encodeURIComponent(id)}`, { headers });
    if (!response.ok) throw new Error(await response.text());
    const row = (await response.json())[0];
    if (!row) return res.status(404).send(page('الشحنة غير موجودة', '<section class="hero"><h1>الشحنة غير موجودة أو تم حذفها</h1></section>'));

    const r = Object.assign({}, row.data || {});
    const items = shipmentItems(r);
    const totalText = text(r.totalAmount);
    const currency = text(r.currency);
    const amount = totalText && currency && !totalText.toUpperCase().startsWith(currency.toUpperCase()) ? `${currency} ${totalText}` : (totalText || currency);
    const invoiceRows = items.map((item, index) => [index + 1, item.description, item.quantity, item.packaging, item.hsCode, item.price, item.amount]);
    const packingRows = items.map((item, index) => [index + 1, item.description, item.quantity, item.packaging, item.hsCode]);
    const docs = [];
    if (r.invoiceNo) docs.push({ id:'invoice', label:'فاتورة', html:documentPage('invoice', 'COMMERCIAL INVOICE', r.invoiceNo, r.invoiceDate, table(['#','DESCRIPTION','QTY','PACKING','HS CODE','UNIT PRICE','AMOUNT'], invoiceRows), amount) });
    if (r.proformaNo) docs.push({ id:'proforma', label:'بروفورما', html:documentPage('proforma', 'PROFORMA INVOICE', r.proformaNo, r.proformaDate, table(['#','DESCRIPTION','QTY','PACKING','HS CODE','UNIT PRICE','AMOUNT'], invoiceRows), amount) });
    if (items.length) docs.push({ id:'packing', label:'كشف تعبئة', html:documentPage('packing', 'PACKING LIST', r.invoiceNo || r.proformaNo, r.invoiceDate || r.proformaDate, table(['#','DESCRIPTION','QTY','PACKING','HS CODE'], packingRows)) });
    if (r.billNo || r.billOfLadingNo) docs.push({ id:'bill', label:'بوليصة', html:documentPage('bill', 'BILL OF LADING DATA', r.billNo || r.billOfLadingNo, r.invoiceDate || r.proformaDate, `<div class="data-list"><div><b>CONSIGNEE</b><span>${esc(r.consignee)}</span></div><div><b>ADDRESS</b><span>${esc(r.consigneeAddress)}</span></div><div><b>PORT OF LOADING</b><span>${esc(r.portLoading)}</span></div><div><b>PORT OF DISCHARGE</b><span>${esc(r.portDischarge)}</span></div><div><b>INCOTERM</b><span>${esc(r.incoterm)}</span></div><div><b>COUNTRY OF ORIGIN</b><span>${esc(r.countryOrigin)}</span></div></div>`) });
    if (r.destBank || r.bankName || r.bankDetails || r.paymentTerm) docs.push({ id:'collection', label:'تحصيل', html:documentPage('collection', 'COLLECTION DETAILS', r.operationNo, r.invoiceDate || r.proformaDate, `<div class="data-list"><div><b>COLLECTING BANK</b><span>${esc(r.destBank || r.bankName)}</span></div><div><b>PAYMENT TERM</b><span>${esc(r.paymentTerm)}</span></div><div><b>BANK DETAILS</b><span>${esc(r.bankDetails)}</span></div><div><b>AMOUNT</b><span>${esc(amount)}</span></div></div>`) });
    const overview = [
      ['رقم العملية', r.operationNo || row.id], ['حالة الشحنة', row.status], ['رقم الفاتورة', r.invoiceNo], ['تاريخ الفاتورة', r.invoiceDate],
      ['رقم البروفورما', r.proformaNo], ['رقم البوليصة', r.billNo || r.billOfLadingNo], ['العميل / المستلم', r.consignee], ['العنوان', r.consigneeAddress],
      ['وصف البضاعة', r.itemDesc], ['الكمية', [r.totalQty || r.qty, r.qtyUnit].filter(Boolean).join(' ')], ['القيمة الإجمالية', amount], ['ميناء التحميل', r.portLoading], ['ميناء الوصول', r.portDischarge], ['شرط الدفع', r.paymentTerm], ['البنك', r.destBank || r.bankName]
    ].map(([label, item]) => field(label, item)).join('');
    const links = docs.map(doc => `<a class="jump" href="#${doc.id}">${doc.label}</a>`).join('');
    const content = `<section class="hero"><header class="head"><div><div class="brand">BAHAR SWAKEN GENERAL TRADING L.L.C</div><h1>${esc(r.itemDesc || r.operationNo || 'ملف العملية')}</h1><div class="operation">${esc(r.operationNo || row.id)}</div></div><div class="buttons"><button class="print" onclick="window.print()">طباعة ملف العملية</button>${links}</div></header><section class="grid">${overview}</section>${r.notes ? `<section class="note"><b>ملاحظات</b><br>${esc(r.notes)}</section>` : ''}<p class="documents-label">المستندات المتاحة في هذه العملية: ${docs.length}</p></section>${docs.map(doc => doc.html).join('')}`;
    return res.status(200).send(page(r.itemDesc || r.operationNo || 'ملف العملية', content));
  } catch (error) {
    console.error('public shipment', error);
    return res.status(500).send(page('تعذر عرض الشحنة', '<section class="hero"><h1>تعذر عرض بيانات الشحنة الآن</h1><p>حاول المسح مرة أخرى لاحقاً.</p></section>'));
  }
};
