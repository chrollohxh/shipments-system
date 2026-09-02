/* Experimental, read-only collection lab. It never writes to Supabase. */
const SB_URL = 'https://vthcmqqiexaedukduquv.supabase.co';
const SB_KEY = 'sb_publishable_kYEMmAQ2KTETIabDTMz2ig_fNB8vo02';
const sb = supabase.createClient(SB_URL, SB_KEY, {auth:{storageKey:'shipdocs-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const $ = id => document.getElementById(id);
const state = {shipments:[], selected:new Set(), overrides:{}, preview:'application', settings:{collectionDate:new Date().toISOString().slice(0,10),remittingBank:'ADIB',collectingBank:'SAUDI SUDANESE BANK',collectingBankAddress:'MAIN BRANCH, FREE ZONE AREA, PORT SUDAN, SUDAN',term:'D/A 90 DAYS FROM BILL OF EXCHANGE DATE',drawer:'BAHAR SWAKEN GENERAL TRADING L.L.C',authorizedPerson:'JAWAD ELMASRI',title:'MANAGER',draweeAddress:''}};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rowToShipment = row => Object.assign({}, row.data||{}, {id:row.id,status:row.status,companyId:row.company_id,shipmentNo:row.task_ref||row.id.slice(0,8)});
const moneyInfo = value => { const text=String(value||''); const currency=(text.match(/\b[A-Z]{3}\b/)||[])[0]||''; const number=parseFloat((text.match(/-?[\d,]+(?:\.\d+)?/)||['0'])[0].replace(/,/g,'')); return {currency:currency||'—',number:Number.isFinite(number)?number:0}; };
const effective = shipment => Object.assign({}, shipment, state.overrides[shipment.id]||{});
const selectedShipments = () => state.shipments.filter(s=>state.selected.has(s.id)).map(effective);
const valueOrDash = v => v === undefined || v === null || v === '' ? '-' : v;
function amountWords(number){
  if(!Number.isFinite(number)) return 'ZERO'; if(number===0) return 'ZERO';
  const ones=['','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'];
  const tens=['','','TWENTY','THIRTY','FORTY','FIFTY','SIXTY','SEVENTY','EIGHTY','NINETY'];
  const chunk=n=>{let out=''; if(n>=100){out+=ones[Math.floor(n/100)]+' HUNDRED';n%=100;if(n)out+=' ';} if(n>=20){out+=tens[Math.floor(n/10)];if(n%10)out+=' '+ones[n%10];}else if(n)out+=ones[n];return out;};
  const parts=[[1000000000,'BILLION'],[1000000,'MILLION'],[1000,'THOUSAND'],[1,'']]; let left=Math.round(number*100)/100, whole=Math.floor(left), out=[];
  parts.forEach(([size,label])=>{if(whole>=size){const n=Math.floor(whole/size);out.push(chunk(n)+(label?' '+label:''));whole%=size;}}); if(left%1) out.push('AND '+Math.round((left%1)*100)+'/100'); return out.join(' ');
}
function detected(){const rows=selectedShipments();const currencies=[...new Set(rows.map(r=>moneyInfo(r.totalAmount).currency).filter(c=>c!=='—'))];const consignees=[...new Set(rows.map(r=>r.consignee).filter(Boolean))];const totals={};rows.forEach(r=>{const m=moneyInfo(r.totalAmount);if(m.currency!=='—') totals[m.currency]=(totals[m.currency]||0)+m.number;});return {rows,currencies,consignees,totals};}
function formatMoney(currency, value){return `${currency} ${value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function renderPicker(){
  const search=$('searchInput').value.trim().toLowerCase(), cur=$('currencyFilter').value, consignee=$('consigneeFilter').value;
  const list=state.shipments.filter(s=>{const m=moneyInfo(s.totalAmount);const hay=[s.shipmentNo,s.itemDesc,s.invoiceNo,s.billNo,s.consignee].join(' ').toLowerCase();return (!search||hay.includes(search))&&(!cur||m.currency===cur)&&(!consignee||s.consignee===consignee);});
  $('shipmentCount').textContent=`${list.length} شحنة BSGT متاحة للقراءة`;
  $('shipmentList').innerHTML=list.length?list.map(s=>{const m=moneyInfo(s.totalAmount);return `<label class="shipment-card ${state.selected.has(s.id)?'is-selected':''}"><input type="checkbox" data-select="${esc(s.id)}" ${state.selected.has(s.id)?'checked':''}><div><h3>${esc(s.itemDesc||'-')}</h3><p>${esc(s.consignee||'-')}</p><div class="shipment-meta"><span class="shipment-ref">${esc(s.shipmentNo)}</span><span>${esc(s.invoiceNo||'-')}</span><span>${esc(m.currency)} ${m.number?m.number.toLocaleString('en-US'):'-'}</span></div></div></label>`}).join(''):'<div class="empty-state">لا توجد نتائج مطابقة.</div>';
  document.querySelectorAll('[data-select]').forEach(input=>input.addEventListener('change',()=>{input.checked?state.selected.add(input.dataset.select):state.selected.delete(input.dataset.select);renderAll();}));
}
function renderDraft(){
  const {rows,currencies,consignees,totals}=detected(); $('selectionHint').textContent=rows.length?`${rows.length} شحنة مختارة في المسودة المحلية.`:'اختر شحنة واحدة أو أكثر لبدء المعاينة.';
  $('warnings').innerHTML=(currencies.length>1?'<div class="warning currency">الشحنات المختارة تحتوي على أكثر من عملة. لا يمكن إنشاء حزمة تحصيل واحدة متعددة العملات؛ أنشئ حزمة منفصلة لكل عملة.</div>':'')+(consignees.length>1?'<div class="warning consignee">الشحنات المختارة تحتوي على أكثر من مستورد / Drawee. المعاينة متاحة، لكن مستندات التحصيل عادة تحتاج مستورداً واحداً داخل الحزمة.</div>':'');
  $('selectedTableWrap').innerHTML=rows.length?`<table class="draft-table"><thead><tr><th>Shipment</th><th>Invoice No</th><th>Invoice Date</th><th>B/L No</th><th>Consignee</th><th>Currency</th><th>Amount</th><th></th></tr></thead><tbody>${rows.map(r=>{const original=state.shipments.find(s=>s.id===r.id),changed=state.overrides[r.id]||{},m=moneyInfo(r.totalAmount);return `<tr><td>${esc(r.shipmentNo)}</td>${['invoiceNo','invoiceDate','billNo','totalAmount'].map(key=>`<td class="${changed[key]!==undefined?'changed':''}">${esc(valueOrDash(r[key]))}${changed[key]!==undefined?'<span class="override-tag">قيمة معدلة للمعاينة فقط</span>':''}</td>`).join('')}<td>${esc(valueOrDash(r.consignee))}</td><td>${esc(m.currency)}</td><td>${esc(formatMoney(m.currency,m.number))}</td><td><button class="mini-btn" data-edit="${esc(r.id)}">تعديل لهذا التحصيل فقط</button></td></tr>${changed._editing?`<tr><td colspan="8"><div class="edit-grid"><label>Invoice No <input data-override="invoiceNo" data-id="${esc(r.id)}" value="${esc(r.invoiceNo||'')}"></label> <label>Invoice Date <input type="date" data-override="invoiceDate" data-id="${esc(r.id)}" value="${esc(r.invoiceDate||'')}"></label> <label>B/L No <input data-override="billNo" data-id="${esc(r.id)}" value="${esc(r.billNo||'')}"></label> <label>Amount <input data-override="totalAmount" data-id="${esc(r.id)}" value="${esc(r.totalAmount||'')}"></label></div></td></tr>`:''}`}).join('')}</tbody></table>`:'<div class="empty-state">لا توجد شحنات مختارة بعد.</div>';
  $('totalsBar').innerHTML=Object.entries(totals).map(([c,n])=>`<div class="total-card"><span>${currencies.length===1?'TOTAL COLLECTION AMOUNT':c+' Total'}</span><strong>${esc(formatMoney(c,n))}</strong><span>${esc(amountWords(n))} ONLY</span></div>`).join('');
  $('groupByConsignee').hidden=consignees.length<2;$('consigneeGroups').hidden=true;
  document.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.edit;state.overrides[id]=Object.assign({},state.overrides[id],{_editing:!state.overrides[id]?true:!state.overrides[id]._editing});renderAll();}));
  document.querySelectorAll('[data-override]').forEach(input=>input.addEventListener('input',()=>{const id=input.dataset.id;state.overrides[id]=Object.assign({},state.overrides[id],{[input.dataset.override]:input.value,_editing:true});renderAll();}));
}
function docRows(rows){return rows.map(r=>{const m=moneyInfo(r.totalAmount);return `<tr><td>${esc(valueOrDash(r.invoiceNo))}</td><td>${esc(valueOrDash(r.invoiceDate))}</td><td>${esc(valueOrDash(r.billNo))}</td><td>${esc(formatMoney(m.currency,m.number))}</td></tr>`}).join('');}
function renderPreview(){
  const {rows,currencies,consignees,totals}=detected(), s=state.settings, c=currencies[0]||'—', n=totals[c]||0, amount=formatMoney(c,n), words=`${c} ${amountWords(n)} ONLY`, drawee=consignees.join(' / ')||'-', refs=rows.map(r=>`${r.invoiceNo||'-'} (${r.invoiceDate||'-'})`).join(', ')||'-';
  let body='';
  if(!rows.length) body='<div class="empty-state">اختر شحنات أولاً لعرض مستندات التحصيل.</div>';
  else if(state.preview==='application') body=`<article class="document-paper"><h2>COLLECTION APPLICATION</h2><p><b>Date:</b> ${esc(s.collectionDate)}<br><b>Remitting Bank:</b> ${esc(s.remittingBank)}<br><b>Collecting Bank:</b> ${esc(s.collectingBank)}</p><h3>Documents / Commercial Invoices</h3><table><thead><tr><th>Invoice No</th><th>Date</th><th>B/L No</th><th>Total Amount</th></tr></thead><tbody>${docRows(rows)}</tbody></table><div class="document-total"><span>TOTAL AMOUNT</span><span>${esc(amount)}</span></div><p><b>Drawer:</b> ${esc(s.drawer)}<br><b>Drawee:</b> ${esc(drawee)}<br><b>Term:</b> ${esc(s.term)}</p></article>`;
  else if(state.preview==='letter') body=`<article class="document-paper"><h2>COLLECTION LETTER</h2><p>Date: ${esc(s.collectionDate)}<br>The Manager<br>${esc(s.remittingBank)}<br>Trade Finance Department<br>Abu Dhabi, UAE</p><p>Dear Sir/Madam,</p><p>Please forward the enclosed documents for collection through <b>${esc(s.collectingBank)}</b>${s.collectingBankAddress?' — '+esc(s.collectingBankAddress):''}, and advise us of payment at maturity.</p><p><b>Amount:</b> ${esc(amount)}<br><b>Amount in Words:</b> ${esc(words)}<br><b>Tenor:</b> ${esc(s.term)}<br><b>Drawee:</b> ${esc(drawee)}<br><b>Drawee Address:</b> ${esc(s.draweeAddress||rows[0].consigneeAddress||'-')}</p><h3>Documents Enclosed</h3><table><thead><tr><th>Invoice No</th><th>Date</th><th>B/L No</th><th>Total Amount</th></tr></thead><tbody>${docRows(rows)}</tbody></table><div class="signature">${esc(s.drawer)}<br>${esc(s.authorizedPerson)}<br>${esc(s.title)}</div></article>`;
  else if(state.preview==='undertaking') body=`<article class="document-paper"><h2>UNDERTAKING LETTER</h2><p>Date: ${esc(s.collectionDate)}</p><table><thead><tr><th>REF #</th><th>B/L No</th><th>Currency</th><th>Amount</th></tr></thead><tbody>${rows.map(r=>{const m=moneyInfo(r.totalAmount);return `<tr><td>${esc(r.shipmentNo)}</td><td>${esc(valueOrDash(r.billNo))}</td><td>${esc(m.currency)}</td><td>${esc(formatMoney(m.currency,m.number))}</td></tr>`}).join('')}</tbody></table><p>We hereby undertake that the enclosed documents are submitted for collection according to the stated terms and that the collection amount is ${esc(amount)} (${esc(words)}).</p><div class="signature">${esc(s.drawer)}<br>${esc(s.authorizedPerson)}<br>${esc(s.title)}<br><br>Signature</div></article>`;
  else body=`<article class="document-paper"><h2>BILL OF EXCHANGE</h2><p><b>Date:</b> ${esc(s.collectionDate)}<br><b>For:</b> ${esc(amount)}<br><b>Amount in Words:</b> ${esc(words)}</p><p>At ${esc(s.term)}, pay to the order of <b>${esc(s.drawer)}</b> the sum of <b>${esc(amount)}</b> for value received against commercial invoices: ${esc(refs)}.</p><p><b>To:</b> ${esc(drawee)}<br><b>Address:</b> ${esc(s.draweeAddress||rows[0].consigneeAddress||'-')}</p><div class="signature">Drawer: ${esc(s.drawer)}<br>${esc(s.authorizedPerson)}<br>${esc(s.title)}</div></article>`;
  $('documentPreview').innerHTML=body;
}
function renderDebug(){const d=detected();$('debugOutput').textContent=JSON.stringify({selectedShipmentIds:[...state.selected],originalValues:state.shipments.filter(s=>state.selected.has(s.id)),overrides:state.overrides,totals:d.totals,detectedCurrency:d.currencies,detectedConsignee:d.consignees},null,2);}
function renderAll(){renderPicker();renderDraft();renderPreview();renderDebug();}
function fillFilters(){const currencies=[...new Set(state.shipments.map(s=>moneyInfo(s.totalAmount).currency).filter(c=>c!=='—'))].sort(), consignees=[...new Set(state.shipments.map(s=>s.consignee).filter(Boolean))].sort();$('currencyFilter').innerHTML='<option value="">كل العملات</option>'+currencies.map(v=>`<option>${esc(v)}</option>`).join('');$('consigneeFilter').innerHTML='<option value="">كل المستوردين</option>'+consignees.map(v=>`<option>${esc(v)}</option>`).join('');}
async function init(){
  Object.entries(state.settings).forEach(([key, value])=>{
    const input = $('settingsForm').elements[key];
    if(input) input.value = value;
  });
  try{const [{data:companies,error:ce},{data:rows,error:se}]=await Promise.all([sb.from('companies').select('*'),sb.from('shipments').select('*').order('updated_at',{ascending:false})]);if(ce)throw ce;if(se)throw se;const bsgt=(companies||[]).find(c=>/بحر\s*سواكن|bahar\s*swaken/i.test(`${c.name_ar||''} ${c.name_en||''}`));if(!bsgt)throw new Error('لم يتم العثور على شركة بحر سواكن في بيانات الشركات.');state.shipments=(rows||[]).map(rowToShipment).filter(s=>s.companyId===bsgt.id);fillFilters();renderAll();}catch(error){$('shipmentList').innerHTML=`<div class="empty-state">تعذّر تحميل مختبر التحصيل: ${esc(error.message||error)}. تأكد من تسجيل الدخول في النظام الأساسي أولاً.</div>`;$('shipmentCount').textContent='لم تُحمّل البيانات';}}
['searchInput','currencyFilter','consigneeFilter'].forEach(id=>$(id).addEventListener('input',renderPicker));
$('settingsForm').addEventListener('input',event=>{state.settings[event.target.name]=event.target.value;renderPreview();renderDebug();});
$('settingsForm').addEventListener('change',event=>{state.settings[event.target.name]=event.target.value;renderPreview();renderDebug();});
$('previewTabs').addEventListener('click',event=>{const button=event.target.closest('[data-preview]');if(!button)return;state.preview=button.dataset.preview;document.querySelectorAll('[data-preview]').forEach(b=>b.classList.toggle('active',b===button));renderPreview();});
$('groupByConsignee').addEventListener('click',()=>{const groups={};selectedShipments().forEach(r=>(groups[r.consignee||'غير محدد']??=[]).push(r));$('consigneeGroups').hidden=false;$('consigneeGroups').innerHTML=Object.entries(groups).map(([name,rows])=>`<b>${esc(name)}</b>: ${rows.map(r=>esc(r.shipmentNo)).join('، ')}`).join('<br>');});
$('resetBtn').addEventListener('click',()=>{state.selected.clear();state.overrides={};$('settingsForm').reset();Object.assign(state.settings,{collectionDate:new Date().toISOString().slice(0,10),remittingBank:'ADIB',collectingBank:'SAUDI SUDANESE BANK',collectingBankAddress:'MAIN BRANCH, FREE ZONE AREA, PORT SUDAN, SUDAN',term:'D/A 90 DAYS FROM BILL OF EXCHANGE DATE',drawer:'BAHAR SWAKEN GENERAL TRADING L.L.C',authorizedPerson:'JAWAD ELMASRI',title:'MANAGER',draweeAddress:''});Object.entries(state.settings).forEach(([key,value])=>{const input=$('settingsForm').elements[key];if(input)input.value=value;});renderAll();});
$('printBtn').addEventListener('click',()=>window.print());
$('printAllBtn').addEventListener('click', printAllCollectionDocuments);
$('resetStampBtn').addEventListener('click',()=>{ try { localStorage.removeItem('bsCollectionStampOffset'); } catch (_) {} renderPreview(); });

function printAllCollectionDocuments(){
  if(!selectedShipments().length){ alert('اختر شحنة واحدة على الأقل قبل طباعة المستندات.'); return; }
  const originalPreview = state.preview;
  const previews = ['application','letter','undertaking','exchange'].map(kind=>{
    state.preview = kind;
    renderPreview();
    return $('documentPreview').innerHTML;
  });
  state.preview = originalPreview;
  renderPreview();
  const brandCss = document.getElementById('collectionBrandStyle')?.textContent || '';
  const popup = window.open('', '_blank');
  if(!popup){ alert('المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.'); return; }
  popup.opener = null;
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>BSGT Collection Documents</title><link rel="stylesheet" href="/experiments/bs-collection/collection-lab.css"><style>${brandCss}.print-page{break-after:page;page-break-after:always}.print-page:last-child{break-after:auto;page-break-after:auto}@media screen{body{background:#eaf0f6}.print-page{padding:12mm 0}}</style></head><body>${previews.map(page=>`<section class="print-page">${page}</section>`).join('')}</body></html>`);
  popup.document.close();
  popup.onload = ()=>setTimeout(()=>popup.print(), 450);
}
function referenceDocumentsEnclosed(){
  return `<table><thead><tr><th>No</th><th>Type of Document</th><th>Original</th><th>Duplicate</th></tr></thead><tbody>
    <tr><td>1</td><td>BILL OF EXCHANGE</td><td>1</td><td>0</td></tr>
    <tr><td>2</td><td>COMMERCIAL INVOICE</td><td>2</td><td>0</td></tr>
    <tr><td>3</td><td>COPY B/L</td><td>0</td><td>2</td></tr>
    <tr><td>4</td><td>Certificate of Origin</td><td>2</td><td>0</td></tr>
  </tbody></table>`;
}

function renderPreview(){
  const {rows,currencies,consignees,totals}=detected();
  const s=state.settings;
  if(!rows.length){ $('documentPreview').innerHTML='<div class="empty-state">اختر شحنات أولاً لعرض مستندات التحصيل.</div>'; return; }
  if(currencies.length!==1){ $('documentPreview').innerHTML='<div class="empty-state">لا يمكن إنشاء معاينة موحدة لمستند تحصيل متعدد العملات. اختر شحنات بعملة واحدة.</div>'; return; }
  const currency=currencies[0], total=totals[currency]||0, amount=formatMoney(currency,total), words=`${currency} ${amountWords(total)} ONLY`;
  const drawee=consignees.join(' / ')||'-';
  const draweeAddress=s.draweeAddress||rows[0].consigneeAddress||'-';
  const invoiceRefs=rows.map(r=>`${r.invoiceNo||'-'} dated ${r.invoiceDate||'-'}`).join('; ');
  let body='';
  if(state.preview==='application'){
    body=`<article class="document-paper"><h2>COLLECTION APPLICATION</h2><p><b>REMITTING BANK:</b> ${esc(s.remittingBank)}<br><b>REMITTING BANK ADD:</b> ${esc(s.remittingBank)}<br><b>COLLECTING BANK:</b> ${esc(s.collectingBank)}<br><b>COLLECTING BANK ADD:</b> ${esc(s.collectingBankAddress||'-')}<br><b>Consignee:</b> ${esc(drawee)}<br><b>Con Address:</b> ${esc(draweeAddress)}</p><table><thead><tr><th>INVOICE NO.</th><th>DATE</th><th>B/L NO.</th><th>Total Amount</th></tr></thead><tbody>${docRows(rows)}</tbody></table><div class="document-total"><span>TOTAL AMOUNT</span><span>${esc(amount)}</span></div><h3>DOCUMENTS ENCLOSED</h3>${referenceDocumentsEnclosed()}<p><b>Bill of Lading Type:</b> Copy of Original Bill of Lading<br><b>Bill By:</b> Kindly send SWIFT message to collecting bank for docs and share SWIFT copy with us.<br><b>Term Of Payment:</b> ${esc(s.term)}</p></article>`;
  }else if(state.preview==='letter'){
    body=`<article class="document-paper"><p>Date: ${esc(s.collectionDate)}<br><br>The Manager<br>Abu Dhabi Islamic Bank<br>Trade Finance Department<br>Abu Dhabi, UAE</p><p>Dear Sir,</p><p>We enclose herewith the following documents and request you to forward the same to collecting bank without any responsibility on your part, requesting them to release the documents to drawee only against their acceptance for payment on due date and only upon receipt of funds from them. Please credit the proceeds to our account held with you after deduction of your charges under advice to us.</p><p>All bank charges outside UAE are to be collected from buyer/drawee.</p><h3>COLLECTION DOCUMENTS for:</h3><p><b>Amount:</b> ${esc(amount)}<br><b>SAY:</b> ${esc(words)}<br><b>Tenor:</b> ${esc(s.term)}<br><b>COLLECTING BANK:</b> ${esc(s.collectingBank)}<br>${esc(s.collectingBankAddress||'')}<br><b>DRAWEE:</b> ${esc(drawee)}<br>${esc(draweeAddress)}</p><h3>DOCUMENTS ENCLOSED:</h3>${referenceDocumentsEnclosed()}<p><b>KINDLY SEND SWIFT MESSAGE TO COLLECTING BANK FOR DOCS AND SHARE SWIFT COPY WITH US.</b></p><div class="signature">Yours faithfully,<br>For and on behalf of<br>${esc(s.drawer)}<br>${esc(s.authorizedPerson)}<br>${esc(s.title)}</div></article>`;
  }else if(state.preview==='undertaking'){
    body=`<article class="document-paper"><p>THE MANAGER<br>TRADE FINANCE DEPARTMENT<br>ABU DHABI ISLAMIC BANK<br>BANIYAS BRANCH BUILDING, 2ND FLOOR, BANIYAS EAST, P.O.BOX 313, ABU DHABI, UAE.</p><h2>UNDERTAKING LETTER UNDER EXPORT COLLECTION DOCS</h2><table><thead><tr><th>REF #</th><th>B/L No</th><th>Currency</th><th>Amount</th></tr></thead><tbody>${rows.map(r=>{const m=moneyInfo(r.totalAmount);return `<tr><td>${esc(r.invoiceNo||r.shipmentNo)}</td><td>${esc(r.billNo||'-')}</td><td>${esc(m.currency)}</td><td>${esc(formatMoney(m.currency,m.number))}</td></tr>`}).join('')}</tbody></table><p>Dear Sir / Madam,</p><p>We hereby certify to Abu Dhabi Islamic Bank PJSC that all enclosed Documents and any other document in relation to the underlying shipment or goods as described in the enclosed documents are accurate, correct and complete documents in full force and effect at the date of this letter.</p><p>We acknowledge that the Bank is the only bank handling the collection as the remitting bank and that the documents will not be submitted as a duplicate presentation to any other bank.</p><p>The Bank shall be under no obligation to make any payment to us as seller/exporter/drawer in respect of the collection until it has received full payment from the collecting/presenting bank. The collection documents will be handled in accordance with the Uniform Rules for Collections, ICC publication number 522 (URC 522).</p><div class="signature">Sincerely,<br>For and on behalf of:<br>${esc(s.drawer)}<br>Name: ${esc(s.authorizedPerson)}<br>Title: ${esc(s.title)}<br><br>Signature:</div></article>`;
  }else{
    body=`<article class="document-paper"><h2>BILL OF EXCHANGE</h2><p><b>Amount:</b> ${esc(amount)}<br><b>DATED:</b> ${esc(s.collectionDate)}</p><p>AT ${esc(s.term)} PAY TO THE ORDER OF <b>${esc(s.remittingBank)}, ABU DHABI - UAE</b> A SUM OF <b>${esc(amount)}</b>.</p><p><b>${esc(words)}</b> BEING VALUE DRAWN UNDER INVOICE # ${esc(invoiceRefs)}</p><p><b>Drawn On:</b> ${esc(drawee)}<br>${esc(draweeAddress)}</p><div class="signature">Drawer<br>${esc(s.drawer)}<br>${esc(s.authorizedPerson)}<br>${esc(s.title)}</div></article>`;
  }
  $('documentPreview').innerHTML=body;
  applyCollectionBranding();
}

function collectionBrandingSettings(){
  try { return JSON.parse(localStorage.getItem('baharSwakenInvoicePreviewSettings') || '{}'); }
  catch (_) { return {}; }
}

function applyCollectionBranding(){
  const paper = document.querySelector('#documentPreview .document-paper');
  if(!paper) return;
  const settings = collectionBrandingSettings();
  const stamp = settings.showStamp === false ? '' : (settings.stamp || '');
  const signature = settings.signature || '';
  const stampPos = Object.assign({xPercent:78,yPercent:78,widthPercent:13,rotate:0}, settings.stampPosition || {});
  const signaturePos = Object.assign({xPercent:10,yPercent:81,widthPercent:23,rotate:0}, settings.signaturePosition || {});
  if(!document.getElementById('collectionBrandStyle')){
    document.head.insertAdjacentHTML('beforeend', `<style id="collectionBrandStyle">
      .collection-a4{position:relative;isolation:isolate;width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;padding:0!important;overflow:hidden!important}
      .collection-a4>.collection-brand-layer{position:absolute;display:block;pointer-events:none}
      .collection-a4>.collection-brand-bg{inset:0;width:100%;height:100%;object-fit:fill;z-index:0}
      .collection-a4>.collection-page-content{position:relative;z-index:1;display:flex;flex-direction:column;height:297mm;padding:53mm 17mm 52mm;overflow-wrap:anywhere;transform-origin:top left}
      .collection-a4 .signature{margin-top:8mm!important;width:64mm!important;font-size:9.5px!important;line-height:1.25!important}
      .collection-a4 table,.collection-a4 table th,.collection-a4 table td{background:transparent!important;border-color:#000!important}
      .collection-a4 .document-total{background:transparent!important}
      .collection-a4 .collection-flow-seals{display:flex;align-items:flex-end;justify-content:space-between;gap:16mm;min-height:30mm;margin-top:auto;padding-top:8mm}
      .collection-a4 .collection-flow-seals img{position:relative;display:block;object-fit:contain;max-height:31mm;transform-origin:center}
      .collection-a4 .collection-flow-stamp{margin-inline-start:auto;pointer-events:auto!important;cursor:grab;touch-action:none}
      .collection-a4 .collection-flow-stamp:active{cursor:grabbing}
      .preview-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.preview-tools .preview-tabs{margin-bottom:0}.preview-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.stamp-hint{font-size:10px;color:#637d98}
      @media print{@page{size:A4;margin:0}.collection-a4{width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;box-shadow:none!important}.collection-a4>.collection-page-content{height:297mm;padding:53mm 17mm 52mm}}
    </style>`);
  }
  paper.classList.add('collection-a4');
  const content = document.createElement('div');
  content.className = 'collection-page-content';
  Array.from(paper.childNodes).forEach(node=>content.append(node));
  const flowImage = (className, source, position) => source ? `<img class="${className}" src="${esc(source)}" alt="" style="width:${Math.max(10,Math.min(Number(position.widthPercent)||16,35))}%;transform:rotate(${Number(position.rotate)||0}deg)">` : '';
  if(stamp || signature){
    content.insertAdjacentHTML('beforeend', `<div class="collection-flow-seals">${flowImage('collection-flow-signature', signature, signaturePos)}${flowImage('collection-flow-stamp', stamp, stampPos)}</div>`);
  }
  paper.append(content);
  const background = settings.background ? `<img class="collection-brand-layer collection-brand-bg" src="${esc(settings.background)}" alt="">` : '';
  paper.insertAdjacentHTML('afterbegin', background);
  fitCollectionContent(content);
  wireCollectionStampDrag(paper);
}

function fitCollectionContent(content){
  requestAnimationFrame(()=>{
    content.style.transform = '';
    content.style.width = '';
    const top = content.getBoundingClientRect().top;
    const usedHeight = Math.max(content.scrollHeight, ...Array.from(content.children).map(node=>node.getBoundingClientRect().bottom - top));
    const ratio = Math.min(1, content.clientHeight / Math.max(content.clientHeight, usedHeight));
    if(ratio < .998){
      const safeRatio = Math.max(.72, ratio);
      content.style.transform = `scale(${safeRatio})`;
      content.style.width = `${100 / safeRatio}%`;
    }
  });
}

function wireCollectionStampDrag(paper){
  const stamp = paper.querySelector('.collection-flow-stamp');
  if(!stamp) return;
  let saved = {x:0,y:0};
  try { saved = Object.assign(saved, JSON.parse(localStorage.getItem('bsCollectionStampOffset') || '{}')); } catch (_) {}
  const apply = () => { stamp.style.left = `${saved.x}px`; stamp.style.top = `${saved.y}px`; };
  apply();
  stamp.title = 'اسحب الختم لتحريك مكانه في مستندات التحصيل';
  stamp.addEventListener('pointerdown', event=>{
    event.preventDefault();
    const start = {x:event.clientX,y:event.clientY,baseX:saved.x,baseY:saved.y};
    stamp.setPointerCapture(event.pointerId);
    const move = point=>{ saved.x = start.baseX + point.clientX - start.x; saved.y = start.baseY + point.clientY - start.y; apply(); };
    const finish = ()=>{ try { localStorage.setItem('bsCollectionStampOffset', JSON.stringify(saved)); } catch (_) {} ; stamp.removeEventListener('pointermove', move); stamp.removeEventListener('pointerup', finish); stamp.removeEventListener('pointercancel', finish); };
    stamp.addEventListener('pointermove', move);
    stamp.addEventListener('pointerup', finish);
    stamp.addEventListener('pointercancel', finish);
  });
}

init();
