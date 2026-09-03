/* Experimental, read-only collection lab. It never writes to Supabase. */
const SB_URL = 'https://vthcmqqiexaedukduquv.supabase.co';
const SB_KEY = 'sb_publishable_kYEMmAQ2KTETIabDTMz2ig_fNB8vo02';
const sb = supabase.createClient(SB_URL, SB_KEY, {auth:{storageKey:'shipdocs-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const $ = id => document.getElementById(id);
const state = {shipments:[], payments:{}, selected:new Set(), overrides:{}, preview:'letter', convertToAed:false, exchangeRate:3.6725, settings:{collectionDate:new Date().toISOString().slice(0,10),remittingBank:'Abu Dhabi Islamic Bank',remittingBankLetterAddress:'Abu Dhabi, UAE',remittingBankAddress:'BANIYAS BRANCH BUILDING, 2ND FLOOR, BANIYAS EAST, P.O.BOX 313, ABU DHABI, UAE.',remittingBankAccountNo:'19567664',collectingBank:'SAUDI SUDANESE BANK',collectingBankAddress:'MAIN BRANCH, FREE ZONE AREA, PORT SUDAN, SUDAN',billOfLadingType:'Copy of  Original Bill of Lading',billBy:'KINDLY SEND SWIFT MESSAGE TO COLLECTING BANK FOR DOCS AND SHARE SWIFT COPY WITH US.',term:'D/A 90 DAYS FROM BILL OF EXCHANGE DATE.',drawer:'BAHAR SWAKEN GENERAL TRADING LLC',authorizedPerson:'JAWAD ELMASRI',title:'MANAGER',draweeAddress:''}};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const collectionListStorageKey = 'bsCollectionDataLists';
const collectionTextOffsetStorageKey = 'bsCollectionTextOffsets';
const collectionTextBlockOffsetStorageKey = 'bsCollectionTextBlockOffsets';
const collectionTextStyleStorageKey = 'bsCollectionTextStyles';
let textBlockEditMode = false;
let selectedTextBlock = null;
let selectedTextStyle = null;
const collectionListFields = {
  remittingBank:{label:'البنك المُرسِل',defaults:['Abu Dhabi Islamic Bank']}, remittingBankLetterAddress:{label:'عنوان بنك الإرسال للخطاب',defaults:['Abu Dhabi, UAE']}, remittingBankAddress:{label:'عنوان بنك الإرسال للتعهد',defaults:['BANIYAS BRANCH BUILDING, 2ND FLOOR, BANIYAS EAST, P.O.BOX 313, ABU DHABI, UAE.']}, remittingBankAccountNo:{label:'رقم حساب بنك الإرسال',defaults:['19567664']}, collectingBank:{label:'بنك التحصيل',defaults:['SAUDI SUDANESE BANK']},
  collectingBankAddress:{label:'عنوان بنك التحصيل',defaults:['MAIN BRANCH, FREE ZONE AREA, PORT SUDAN, SUDAN']},
  billOfLadingType:{label:'نوع بوليصة الشحن',defaults:['Copy of  Original Bill of Lading']},
  billBy:{label:'تعليمات Bill By',defaults:['Kindly send SWIFT message to collecting bank for docs and share SWIFT copy with us.']},
  term:{label:'شرط الدفع',defaults:['D/A 90 DAYS FROM BILL OF EXCHANGE DATE.']}, drawer:{label:'المُصدّر / Drawer',defaults:['BAHAR SWAKEN GENERAL TRADING LLC']},
  authorizedPerson:{label:'الشخص المفوض',defaults:['JAWAD ELMASRI']}, title:{label:'المنصب',defaults:['MANAGER']}, draweeAddress:{label:'عنوان المستورد',defaults:[]}
};
let collectionLists = {};
function loadCollectionLists(){
  let saved={}; try { saved=JSON.parse(localStorage.getItem(collectionListStorageKey)||'{}')||{}; } catch (_) {}
  collectionLists=Object.fromEntries(Object.entries(collectionListFields).map(([key,field])=>[key,[...new Set([...(field.defaults||[]),...((saved[key]||[]).filter(Boolean))])]]));
}
function saveCollectionLists(){ try { localStorage.setItem(collectionListStorageKey,JSON.stringify(collectionLists)); } catch (_) {} }
function collectionTextOffsets(){ try { return JSON.parse(localStorage.getItem(collectionTextOffsetStorageKey)||'{}')||{}; } catch (_) { return {}; } }
function textOffsetForPreview(){ return Object.assign({x:0,y:0}, collectionTextOffsets()[state.preview]||{}); }
function updateTextOffsetControls(){
  const x=$('textOffsetX'), y=$('textOffsetY'); if(!x||!y) return;
  const offset=textOffsetForPreview(); x.value=offset.x; y.value=offset.y;
  $('textOffsetXValue').textContent=`${offset.x} mm`;
  $('textOffsetYValue').textContent=`${offset.y} mm`;
}
function saveTextOffset(axis, value){
  const offsets=collectionTextOffsets(), current=Object.assign({x:0,y:0},offsets[state.preview]||{});
  current[axis]=Number(value)||0; offsets[state.preview]=current;
  try { localStorage.setItem(collectionTextOffsetStorageKey,JSON.stringify(offsets)); } catch (_) {}
  renderPreview();
}
function collectionTextBlockOffsets(){ try { return JSON.parse(localStorage.getItem(collectionTextBlockOffsetStorageKey)||'{}')||{}; } catch (_) { return {}; } }
function textBlockOffset(preview, index){ return Object.assign({x:0,y:0}, collectionTextBlockOffsets()[preview]?.[index]||{}); }
function saveTextBlockOffset(preview, index, offset){
  const offsets=collectionTextBlockOffsets(); offsets[preview]=offsets[preview]||{}; offsets[preview][index]=offset;
  try { localStorage.setItem(collectionTextBlockOffsetStorageKey,JSON.stringify(offsets)); } catch (_) {}
}
function collectionTextStyles(){ try { return JSON.parse(localStorage.getItem(collectionTextStyleStorageKey)||'{}')||{}; } catch (_) { return {}; } }
function textStyleFor(preview, id){ return Object.assign({weight:'',size:0,x:0,y:0},collectionTextStyles()[preview]?.[id]||{}); }
function saveTextStyle(preview, id, style){
  const styles=collectionTextStyles(); styles[preview]=styles[preview]||{}; styles[preview][id]=style;
  try { localStorage.setItem(collectionTextStyleStorageKey,JSON.stringify(styles)); } catch (_) {}
}
function applyTextStyle(node){
  const style=textStyleFor(state.preview,node.dataset.textStyleId);
  node.style.fontWeight=style.weight||'';
  node.style.fontSize=style.size?`calc(1em + ${style.size}px)`:'';
  if(!node.dataset.textBlock){
    node.style.display=style.x||style.y?'inline-block':'';
    node.style.transform=style.x||style.y?`translate(${style.x}px, ${style.y}px)`:'';
  }
}
function updateTextStyleControls(){
  const enabled=Boolean(selectedTextStyle&&selectedTextStyle.preview===state.preview);
  ['textStyleNormalBtn','textStyleBoldBtn','textStyleSmallerBtn','textStyleLargerBtn'].forEach(id=>$(id).disabled=!enabled);
}
function setSelectedTextStyle(change){
  if(!selectedTextStyle||selectedTextStyle.preview!==state.preview) return;
  const style=Object.assign(textStyleFor(selectedTextStyle.preview,selectedTextStyle.id),change);
  saveTextStyle(selectedTextStyle.preview,selectedTextStyle.id,style);
  renderPreview();
}
function updateTextBlockControls(){
  const reset=$('resetSelectedTextBlockBtn'); if(!reset) return;
  reset.hidden=!selectedTextBlock || selectedTextBlock.preview!==state.preview;
  $('toggleTextBlockModeBtn').classList.toggle('is-active',textBlockEditMode);
  $('toggleTextBlockModeBtn').innerHTML=textBlockEditMode?'<i class="bx bx-check"></i> اضغط على فقرة للتحريك':'<i class="bx bx-target-lock"></i> تحريك فقرة بالنقر';
  updateTextStyleControls();
}
function prepareTextBlocks(content){
  if(selectedTextBlock && selectedTextBlock.preview!==state.preview) selectedTextBlock=null;
  if(selectedTextStyle && selectedTextStyle.preview!==state.preview) selectedTextStyle=null;
  const blocks=[...content.children].filter(node=>!node.classList.contains('collection-flow-seals'));
  content.classList.toggle('is-text-layout-editing',textBlockEditMode);
  blocks.forEach((block,index)=>{
    const offset=textBlockOffset(state.preview,index);
    block.dataset.textBlock=String(index);
    block.dataset.textStyleId=block.dataset.textStyleId||`block-${index}`;
    block.style.transform=`translate(${offset.x}px, ${offset.y}px)`;
    block.classList.toggle('is-text-block-selected',selectedTextBlock?.preview===state.preview&&selectedTextBlock.index===index);
    applyTextStyle(block);
    const textNodes=[];
    const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT,{acceptNode(node){
      const styledParent=node.parentElement?.closest('[data-text-style-id]');
      if(!node.nodeValue.trim()||(styledParent&&styledParent!==block)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    while(walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node,textIndex)=>{
      const segment=document.createElement('span');
      segment.dataset.textStyleId=`block-${index}-text-${textIndex}`;
      node.parentNode.replaceChild(segment,node);
      segment.append(node);
    });
    block.querySelectorAll('[data-text-style-id]').forEach(node=>{
      applyTextStyle(node);
      node.classList.toggle('is-text-style-selected',selectedTextStyle?.preview===state.preview&&selectedTextStyle.id===node.dataset.textStyleId);
    });
  });
  if(textBlockEditMode) content.addEventListener('click',event=>{
    const block=event.target.closest('[data-text-block]'); if(!block||!content.contains(block)) return;
    event.preventDefault(); selectedTextBlock={preview:state.preview,index:Number(block.dataset.textBlock)};
    const styleTarget=event.target.closest('[data-text-style-id]')||block;
    selectedTextStyle={preview:state.preview,id:styleTarget.dataset.textStyleId};
    content.querySelectorAll('[data-text-block]').forEach(node=>node.classList.toggle('is-text-block-selected',node===block));
    content.querySelectorAll('[data-text-style-id]').forEach(node=>node.classList.toggle('is-text-style-selected',node===styleTarget));
    updateTextBlockControls();
  });
  updateTextBlockControls();
}
function populateCollectionSelects(){
  Object.keys(collectionListFields).forEach(key=>{
    const select=$('settingsForm').elements[key]; if(!select) return;
    const values=[...(collectionLists[key]||[])];
    if(state.settings[key] && !values.includes(state.settings[key])) values.push(state.settings[key]);
    const auto=key==='draweeAddress'?'<option value="">من الشحنة المختارة تلقائياً</option>':'';
    select.innerHTML=auto+values.map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');
    select.value=state.settings[key]||'';
  });
}
function renderCollectionListManager(){
  const field=$('collectionListField'), values=$('collectionListValues'); if(!field||!values) return;
  if(!field.options.length) field.innerHTML=Object.entries(collectionListFields).map(([key,meta])=>`<option value="${key}">${esc(meta.label)}</option>`).join('');
  const key=field.value||'remittingBank';
  values.innerHTML=(collectionLists[key]||[]).length?(collectionLists[key]||[]).map(value=>`<span class="collection-list-value"><span title="${esc(value)}">${esc(value)}</span><button type="button" title="حذف" data-remove-list-value="${esc(value)}">×</button></span>`).join(''):'<small>لا توجد قيم محفوظة بعد.</small>';
}
const rowToShipment = row => Object.assign({}, row.data||{}, {id:row.id,status:row.status,companyId:row.company_id,shipmentNo:row.task_ref||row.id.slice(0,8)});
const moneyInfo = value => { const text=String(value||''); const currency=(text.match(/\b[A-Z]{3}\b/)||[])[0]||''; const number=parseFloat((text.match(/-?[\d,]+(?:\.\d+)?/)||['0'])[0].replace(/,/g,'')); return {currency:currency||'—',number:Number.isFinite(number)?number:0}; };
const paidOf = id => (state.payments[id]||[]).reduce((sum,payment)=>sum+(Number(payment.amount)||0),0);
const remainingOf = shipment => Math.max(0,moneyInfo(shipment.totalAmount).number-paidOf(shipment.id));
const collectionState = shipment => { const total=moneyInfo(shipment.totalAmount).number, paid=paidOf(shipment.id); return paid>=total-.01&&total>0?'settled':paid>0?'partial':''; };
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
function collectionDateText(value){
  const parts=String(value||'').split('-'); if(parts.length!==3) return value||'';
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${parts[2]}-${months[Number(parts[1])-1]||parts[1]}-${parts[0]}`;
}
function detected(){const rows=selectedShipments();const currencies=[...new Set(rows.map(r=>moneyInfo(r.totalAmount).currency).filter(c=>c!=='—'))];const consignees=[...new Set(rows.map(r=>r.consignee).filter(Boolean))];const totals={};rows.forEach(r=>{const m=moneyInfo(r.totalAmount);if(m.currency!=='—') totals[m.currency]=(totals[m.currency]||0)+m.number;});return {rows,currencies,consignees,totals};}
function formatMoney(currency, value){return `${currency} ${value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function collectionMoney(value){
  const source=moneyInfo(value), rate=Number(state.exchangeRate)||0;
  if(state.convertToAed&&source.currency!=='AED'&&rate>0) return {source,currency:'AED',number:source.number*rate,converted:true,rate};
  return {source,currency:source.currency,number:source.number,converted:false,rate};
}
function collectionTotal(rows){
  const sourceCurrency=moneyInfo(rows[0]?.totalAmount).currency;
  const sourceTotal=rows.reduce((sum,row)=>sum+moneyInfo(row.totalAmount).number,0);
  return collectionMoney(`${sourceCurrency} ${sourceTotal}`);
}
function updateConversionControls(){
  const button=$('convertToAedBtn'), rate=$('collectionExchangeRate'), preview=$('collectionConversionPreview');
  if(!button||!rate||!preview)return;
  button.classList.toggle('is-active',state.convertToAed);
  rate.disabled=!state.convertToAed; rate.value=state.exchangeRate||'';
  const rows=selectedShipments();
  const currencyLabel=$('compactCollectionCurrency');
  if(!rows.length){ if(currencyLabel) currencyLabel.textContent='AED'; preview.textContent='اختر شحنة لعرض التحويل.'; return; }
  const result=collectionTotal(rows);
  if(currencyLabel) currencyLabel.textContent=state.convertToAed?'AED':result.source.currency;
  button.title=state.convertToAed?'التحصيل بالدرهم AED - اضغط للعودة للعملة الأصلية':'اضغط للتحويل إلى AED';
  preview.textContent=result.converted?`${formatMoney(result.source.currency,result.source.number)} × ${result.rate} = ${formatMoney('AED',result.number)}`:state.convertToAed?'الشحنة بعملة AED بالفعل.':'يظهر التحويل هنا بعد التفعيل.';
}
function renderCollectionSummary(){
  const {rows,currencies}=detected(), action=$('compactRecordCollectionBtn');
  const collection=rows.length&&currencies.length===1?collectionTotal(rows):null;
  $('compactCollectionCount').textContent=rows.length;
  $('compactShipmentCount').textContent=rows.length;
  $('compactCollectionTotal').textContent=collection?formatMoney(collection.currency,collection.number):(rows.length?'عملات متعددة':'-');
  action.disabled=!rows.length;
}
function renderPicker(){
  const search=$('searchInput').value.trim().toLowerCase(), cur=$('currencyFilter').value, consignee=$('consigneeFilter').value;
  const list=state.shipments.filter(s=>{const m=moneyInfo(s.totalAmount);const hay=[s.shipmentNo,s.itemDesc,s.invoiceNo,s.billNo,s.consignee].join(' ').toLowerCase();return (!search||hay.includes(search))&&(!cur||m.currency===cur)&&(!consignee||s.consignee===consignee);});
  $('shipmentCount').textContent=`${list.length} شحنة BSGT متاحة للقراءة`;
  $('shipmentList').innerHTML=list.length?list.map(s=>{const m=moneyInfo(s.totalAmount),status=collectionState(s),paid=paidOf(s.id);const statusTag=status==='settled'?'<span class="collection-status settled">تم التحصيل بالكامل</span>':status==='partial'?`<span class="collection-status partial">تحصيل جزئي: ${esc(formatMoney(m.currency,paid))}</span>`:'';return `<label class="shipment-card ${state.selected.has(s.id)?'is-selected':''}"><input type="checkbox" data-select="${esc(s.id)}" ${state.selected.has(s.id)?'checked':''}><div><h3>${esc(s.itemDesc||'-')}</h3><p>${esc(s.consignee||'-')}</p><div class="shipment-meta"><span class="shipment-ref">${esc(s.shipmentNo)}</span><span>${esc(s.invoiceNo||'-')}</span><span>${esc(m.currency)} ${m.number?m.number.toLocaleString('en-US'):'-'}</span></div>${statusTag}</div></label>`}).join(''):'<div class="empty-state">لا توجد نتائج مطابقة.</div>';
  document.querySelectorAll('[data-select]').forEach(input=>input.addEventListener('change',()=>{input.checked?state.selected.add(input.dataset.select):state.selected.delete(input.dataset.select);renderAll();}));
}
function renderDraft(){
  const {rows,currencies,consignees,totals}=detected(); $('selectionHint').textContent=rows.length?`${rows.length} شحنة مختارة في المسودة المحلية.`:'اختر شحنة واحدة أو أكثر لبدء المعاينة.';
  $('warnings').innerHTML=(currencies.length>1?'<div class="warning currency">الشحنات المختارة تحتوي على أكثر من عملة. لا يمكن إنشاء حزمة تحصيل واحدة متعددة العملات؛ أنشئ حزمة منفصلة لكل عملة.</div>':'')+(consignees.length>1?'<div class="warning consignee">الشحنات المختارة تحتوي على أكثر من مستورد / Drawee. المعاينة متاحة، لكن مستندات التحصيل عادة تحتاج مستورداً واحداً داخل الحزمة.</div>':'');
  $('selectedTableWrap').innerHTML=rows.length?`<table class="draft-table"><thead><tr><th>Shipment</th><th>Invoice No</th><th>Invoice Date</th><th>B/L No</th><th>Consignee</th><th>Currency</th><th>Amount</th><th></th></tr></thead><tbody>${rows.map(r=>{const original=state.shipments.find(s=>s.id===r.id),changed=state.overrides[r.id]||{},m=moneyInfo(r.totalAmount);return `<tr><td>${esc(r.shipmentNo)}</td>${['invoiceNo','invoiceDate','billNo','totalAmount'].map(key=>`<td class="${changed[key]!==undefined?'changed':''}">${esc(valueOrDash(r[key]))}${changed[key]!==undefined?'<span class="override-tag">قيمة معدلة للمعاينة فقط</span>':''}</td>`).join('')}<td>${esc(valueOrDash(r.consignee))}</td><td>${esc(m.currency)}</td><td>${esc(formatMoney(m.currency,m.number))}</td><td><button class="mini-btn" data-edit="${esc(r.id)}">تعديل لهذا التحصيل فقط</button></td></tr>${changed._editing?`<tr><td colspan="8"><div class="edit-grid"><label>Invoice No <input data-override="invoiceNo" data-id="${esc(r.id)}" value="${esc(r.invoiceNo||'')}"></label> <label>Invoice Date <input type="date" data-override="invoiceDate" data-id="${esc(r.id)}" value="${esc(r.invoiceDate||'')}"></label> <label>B/L No <input data-override="billNo" data-id="${esc(r.id)}" value="${esc(r.billNo||'')}"></label> <label>Amount <input data-override="totalAmount" data-id="${esc(r.id)}" value="${esc(r.totalAmount||'')}"></label></div></td></tr>`:''}`}).join('')}</tbody></table>`:'<div class="empty-state">لا توجد شحنات مختارة بعد.</div>';
  const converted=currencies.length===1&&rows.length?collectionTotal(rows):null;
  const conversionCard=converted?.converted?`<div class="total-card"><span>إجمالي التحصيل بالدرهم (${converted.source.currency} × ${converted.rate})</span><strong>${esc(formatMoney('AED',converted.number))}</strong><span>قيمة التحصيل الفعلية</span></div>`:'';
  $('totalsBar').innerHTML=Object.entries(totals).map(([c,n])=>`<div class="total-card"><span>${currencies.length===1?'TOTAL COLLECTION AMOUNT':c+' Total'}</span><strong>${esc(formatMoney(c,n))}</strong><span>${esc(amountWords(n))} ONLY</span></div>`).join('')+conversionCard;
  $('groupByConsignee').hidden=consignees.length<2;$('consigneeGroups').hidden=true;
  document.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.edit;state.overrides[id]=Object.assign({},state.overrides[id],{_editing:!state.overrides[id]?true:!state.overrides[id]._editing});renderAll();}));
  document.querySelectorAll('[data-override]').forEach(input=>input.addEventListener('input',()=>{const id=input.dataset.id;state.overrides[id]=Object.assign({},state.overrides[id],{[input.dataset.override]:input.value,_editing:true});renderAll();}));
}
function docRows(rows){return rows.map(r=>{const m=collectionMoney(r.totalAmount);return `<tr><td>${esc(valueOrDash(r.invoiceNo))}</td><td>${esc(valueOrDash(r.invoiceDate))}</td><td>${esc(valueOrDash(r.billNo))}</td><td>${esc(formatMoney(m.currency,m.number))}</td></tr>`}).join('');}
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
function renderAll(){renderPicker();renderDraft();renderCollectionSummary();renderPreview();updateConversionControls();renderDebug();}
function fillFilters(){const currencies=[...new Set(state.shipments.map(s=>moneyInfo(s.totalAmount).currency).filter(c=>c!=='—'))].sort(), consignees=[...new Set(state.shipments.map(s=>s.consignee).filter(Boolean))].sort();$('currencyFilter').innerHTML='<option value="">كل العملات</option>'+currencies.map(v=>`<option>${esc(v)}</option>`).join('');$('consigneeFilter').innerHTML='<option value="">كل المستوردين</option>'+consignees.map(v=>`<option>${esc(v)}</option>`).join('');}
async function recordCollection(){
  const rows=selectedShipments();
  const eligible=rows.filter(row=>moneyInfo(row.totalAmount).number>0&&remainingOf(row)>.01);
  if(!eligible.length){ alert('كل الشحنات المختارة مسجلة كمحصلة بالفعل، أو لا تحتوي على مبلغ صالح للتحصيل.'); return; }
  const currencies=[...new Set(eligible.map(row=>moneyInfo(row.totalAmount).currency))];
  if(currencies.length!==1){ alert('سجل التحصيل لكل عملة في حزمة منفصلة حتى تكون قيمة التحويل صحيحة.'); return; }
  if(state.convertToAed&&currencies[0]!=='AED'&&!(Number(state.exchangeRate)>0)){ alert('أدخل سعر صرف صحيحاً قبل التحويل إلى AED.'); return; }
  const totalByCurrency={}; eligible.forEach(row=>{const info=moneyInfo(row.totalAmount);totalByCurrency[info.currency]=(totalByCurrency[info.currency]||0)+remainingOf(row);});
  const sourceSummary=Object.entries(totalByCurrency).map(([currency,total])=>formatMoney(currency,total)).join('\n');
  const convertedTotal=collectionTotal(eligible);
  const summary=convertedTotal.converted?`${sourceSummary}\n= ${formatMoney('AED',convertedTotal.number)} بسعر ${convertedTotal.rate}`:sourceSummary;
  if(!confirm(`سيتم تسجيل التحصيل الكامل المتبقي لـ ${eligible.length} شحنة:\n${summary}\n\nهل تؤكد تسجيل التحصيل؟`)) return;
  const buttons=[$('recordCollectionBtn'),$('compactRecordCollectionBtn')].filter(Boolean);
  const originals=buttons.map(button=>button.innerHTML);
  buttons.forEach(button=>{button.disabled=true;button.textContent='جارٍ تسجيل التحصيل...';});
  try{
    const paidOn=state.settings.collectionDate||new Date().toISOString().slice(0,10);
    const rowsToInsert=eligible.map(row=>{const source=moneyInfo(row.totalAmount), converted=collectionMoney(`${source.currency} ${remainingOf(row)}`); return {shipment_id:row.id,amount:remainingOf(row),currency:source.currency,paid_on:paidOn,method:'تحصيل مستندات BSGT',reference:row.invoiceNo||row.shipmentNo,note:`تم التسجيل من بوابة مستندات التحصيل - بحر سواكن${converted.converted?` | تم التحصيل فعلياً: ${formatMoney('AED',converted.number)} بسعر صرف ${converted.rate}`:''}`};});
    const {data,error}=await sb.from('payments').insert(rowsToInsert).select();
    if(error) throw error;
    (data||[]).forEach(payment=>(state.payments[payment.shipment_id]??=[]).push(payment));
    renderAll();
    alert(`تم تسجيل تحصيل ${eligible.length} شحنة بنجاح. ستظهر الآن ضمن «محصّلة» في قائمة التحصيل الرئيسية.`);
  }catch(error){
    const message=error?.message||String(error);
    alert(`تعذّر تسجيل التحصيل. ${message.includes('payments')?'تأكد من تشغيل ملف 6_التحصيل_والمستحقات.sql في Supabase ومن صلاحية المستخدم.':message}`);
  }finally{ buttons.forEach((button,index)=>{button.disabled=false;button.innerHTML=originals[index];}); }
}
async function init(){
  loadCollectionLists();
  populateCollectionSelects();
  renderCollectionListManager();
  Object.entries(state.settings).forEach(([key, value])=>{
    const input = $('settingsForm').elements[key];
    if(input) input.value = value;
  });
  try{const [{data:companies,error:ce},{data:rows,error:se},{data:paymentRows,error:pe}]=await Promise.all([sb.from('companies').select('*'),sb.from('shipments').select('*').order('updated_at',{ascending:false}),sb.from('payments').select('*').order('paid_on')]);if(ce)throw ce;if(se)throw se;if(pe)console.warn('payments',pe);state.payments={};(paymentRows||[]).forEach(payment=>(state.payments[payment.shipment_id]??=[]).push(payment));const bsgt=(companies||[]).find(c=>/بحر\s*سواكن|bahar\s*swaken/i.test(`${c.name_ar||''} ${c.name_en||''}`));if(!bsgt)throw new Error('لم يتم العثور على شركة بحر سواكن في بيانات الشركات.');state.shipments=(rows||[]).map(rowToShipment).filter(s=>s.companyId===bsgt.id);fillFilters();renderAll();}catch(error){$('shipmentList').innerHTML=`<div class="empty-state">تعذّر تحميل مختبر التحصيل: ${esc(error.message||error)}. تأكد من تسجيل الدخول في النظام الأساسي أولاً.</div>`;$('shipmentCount').textContent='لم تُحمّل البيانات';}}
['searchInput','currencyFilter','consigneeFilter'].forEach(id=>$(id).addEventListener('input',renderPicker));
$('settingsForm').addEventListener('input',event=>{if(!event.target.name)return;state.settings[event.target.name]=event.target.value;renderPreview();renderDebug();});
$('settingsForm').addEventListener('change',event=>{if(!event.target.name)return;state.settings[event.target.name]=event.target.value;renderPreview();renderDebug();});
$('convertToAedBtn').addEventListener('click',()=>{state.convertToAed=!state.convertToAed;renderAll();});
$('collectionExchangeRate').addEventListener('input',event=>{state.exchangeRate=Number(event.target.value)||0;renderAll();});
$('compactRecordCollectionBtn').addEventListener('click',recordCollection);
$('collectionListField').addEventListener('change',renderCollectionListManager);
$('addCollectionListValue').addEventListener('click',()=>{
  const key=$('collectionListField').value, input=$('collectionListValue'), value=input.value.trim();
  if(!value){ input.focus(); return; }
  if(!collectionLists[key].includes(value)) collectionLists[key].push(value);
  state.settings[key]=value; input.value=''; saveCollectionLists(); populateCollectionSelects(); renderCollectionListManager(); renderPreview(); renderDebug();
});
$('collectionListValues').addEventListener('click',event=>{
  const button=event.target.closest('[data-remove-list-value]'); if(!button) return;
  const key=$('collectionListField').value, value=button.dataset.removeListValue;
  collectionLists[key]=(collectionLists[key]||[]).filter(item=>item!==value);
  if(state.settings[key]===value) state.settings[key]=key==='draweeAddress'?'':(collectionLists[key][0]||'');
  saveCollectionLists(); populateCollectionSelects(); renderCollectionListManager(); renderPreview(); renderDebug();
});
$('previewTabs').addEventListener('click',event=>{const button=event.target.closest('[data-preview]');if(!button)return;state.preview=button.dataset.preview;document.querySelectorAll('[data-preview]').forEach(b=>b.classList.toggle('active',b===button));renderPreview();});
$('groupByConsignee').addEventListener('click',()=>{const groups={};selectedShipments().forEach(r=>(groups[r.consignee||'غير محدد']??=[]).push(r));$('consigneeGroups').hidden=false;$('consigneeGroups').innerHTML=Object.entries(groups).map(([name,rows])=>`<b>${esc(name)}</b>: ${rows.map(r=>esc(r.shipmentNo)).join('، ')}`).join('<br>');});
$('resetBtn').addEventListener('click',()=>{state.selected.clear();state.overrides={};$('settingsForm').reset();Object.assign(state.settings,{collectionDate:new Date().toISOString().slice(0,10),remittingBank:'Abu Dhabi Islamic Bank',remittingBankLetterAddress:'Abu Dhabi, UAE',remittingBankAddress:'BANIYAS BRANCH BUILDING, 2ND FLOOR, BANIYAS EAST, P.O.BOX 313, ABU DHABI, UAE.',remittingBankAccountNo:'19567664',collectingBank:'SAUDI SUDANESE BANK',collectingBankAddress:'MAIN BRANCH, FREE ZONE AREA, PORT SUDAN, SUDAN',billOfLadingType:'Copy of Original Bill of Lading',billBy:'KINDLY SEND SWIFT MESSAGE TO COLLECTING BANK FOR DOCS AND SHARE SWIFT COPY WITH US.',term:'D/A 90 DAYS FROM BILL OF EXCHANGE DATE.',drawer:'BAHAR SWAKEN GENERAL TRADING L.L.C',authorizedPerson:'JAWAD ELMASRI',title:'Manager',draweeAddress:''});populateCollectionSelects();Object.entries(state.settings).forEach(([key,value])=>{const input=$('settingsForm').elements[key];if(input)input.value=value;});renderAll();});
$('printBtn').addEventListener('click',()=>window.print());
$('recordCollectionBtn').addEventListener('click',recordCollection);
$('printAllBtn').addEventListener('click', printAllCollectionDocuments);
$('resetStampBtn').addEventListener('click',()=>{ try { localStorage.removeItem('bsCollectionStampOffset'); } catch (_) {} renderPreview(); });
$('textOffsetX').addEventListener('input',event=>saveTextOffset('x',event.target.value));
$('textOffsetY').addEventListener('input',event=>saveTextOffset('y',event.target.value));
$('resetTextOffsetBtn').addEventListener('click',()=>{
  const offsets=collectionTextOffsets(); delete offsets[state.preview];
  try { localStorage.setItem(collectionTextOffsetStorageKey,JSON.stringify(offsets)); } catch (_) {}
  renderPreview();
});
$('toggleTextBlockModeBtn').addEventListener('click',()=>{ textBlockEditMode=!textBlockEditMode; renderPreview(); });
$('textStyleNormalBtn').addEventListener('click',()=>setSelectedTextStyle({weight:'',size:0}));
$('textStyleBoldBtn').addEventListener('click',()=>setSelectedTextStyle({weight:'700'}));
$('textStyleSmallerBtn').addEventListener('click',()=>{
  if(!selectedTextStyle) return; const style=textStyleFor(selectedTextStyle.preview,selectedTextStyle.id); setSelectedTextStyle({size:Math.max(-5,style.size-1)});
});
$('textStyleLargerBtn').addEventListener('click',()=>{
  if(!selectedTextStyle) return; const style=textStyleFor(selectedTextStyle.preview,selectedTextStyle.id); setSelectedTextStyle({size:Math.min(8,style.size+1)});
});
$('resetSelectedTextBlockBtn').addEventListener('click',()=>{
  if(!selectedTextBlock) return;
  const offsets=collectionTextBlockOffsets();
  if(offsets[selectedTextBlock.preview]) delete offsets[selectedTextBlock.preview][selectedTextBlock.index];
  try { localStorage.setItem(collectionTextBlockOffsetStorageKey,JSON.stringify(offsets)); } catch (_) {}
  renderPreview();
});
document.addEventListener('keydown',event=>{
  if(!textBlockEditMode||!selectedTextBlock||selectedTextBlock.preview!==state.preview) return;
  if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName)) return;
  const movement={ArrowLeft:['x',-1],ArrowRight:['x',1],ArrowUp:['y',-1],ArrowDown:['y',1]}[event.key];
  if(!movement) return;
  event.preventDefault();
  const [axis,direction]=movement, step=event.shiftKey?5:1;
  if(selectedTextStyle&&selectedTextStyle.preview===state.preview&&selectedTextStyle.id!==`block-${selectedTextBlock.index}`){
    const style=textStyleFor(selectedTextStyle.preview,selectedTextStyle.id);
    style[axis]+=direction*step;
    saveTextStyle(selectedTextStyle.preview,selectedTextStyle.id,style);
  }else{
    const offset=textBlockOffset(selectedTextBlock.preview,selectedTextBlock.index);
    offset[axis]+=direction*step;
    saveTextBlockOffset(selectedTextBlock.preview,selectedTextBlock.index,offset);
  }
  renderPreview();
});

function printAllCollectionDocuments(){
  if(!selectedShipments().length){ alert('اختر شحنة واحدة على الأقل قبل طباعة المستندات.'); return; }
  const originalPreview = state.preview;
  const previews = ['letter','undertaking','exchange'].map(kind=>{
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
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>BSGT Collection Documents</title><link rel="stylesheet" href="/experiments/bs-collection/collection-lab.css"><link rel="stylesheet" href="/experiments/bs-collection/collection-lists.css"><style>${brandCss}.print-page{break-after:page;page-break-after:always}.print-page:last-child{break-after:auto;page-break-after:auto}@media screen{body{background:#eaf0f6}.print-page{padding:12mm 0}}</style></head><body>${previews.map(page=>`<section class="print-page">${page}</section>`).join('')}</body></html>`);
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
  const collection=collectionTotal(rows), currency=collection.currency, total=collection.number, amount=formatMoney(currency,total), words=`${currency} ${amountWords(total)} ONLY`;
  const drawee=consignees.join(' / ')||'-';
  const draweeAddress=s.draweeAddress||rows[0].consigneeAddress||'-';
  const invoiceRefs=rows.map(r=>`${r.invoiceNo||'-'} dated ${r.invoiceDate||'-'}`).join('; ');
  const undertakingRows=rows.map(r=>{const value=collectionMoney(r.totalAmount);return `<tr><td>${esc(r.invoiceNo||r.shipmentNo)}</td><td>${esc(r.billNo||'-')}</td><td>${esc(value.currency)}</td><td>${esc(value.number.toFixed(2))}</td></tr>`;}).join('');
  let body='';
  if(state.preview==='application'){
    body=`<article class="document-paper"><h2>COLLECTION APPLICATION</h2><p><b>REMITTING BANK:</b> ${esc(s.remittingBank)}<br><b>REMITTING BANK ADD:</b> ${esc(s.remittingBank)}<br><b>COLLECTING BANK:</b> ${esc(s.collectingBank)}<br><b>COLLECTING BANK ADD:</b> ${esc(s.collectingBankAddress||'-')}<br><b>Consignee:</b> ${esc(drawee)}<br><b>Con Address:</b> ${esc(draweeAddress)}</p><table><thead><tr><th>INVOICE NO.</th><th>DATE</th><th>B/L NO.</th><th>Total Amount</th></tr></thead><tbody>${docRows(rows)}</tbody></table><div class="document-total"><span>TOTAL AMOUNT</span><span>${esc(amount)}</span></div><h3>DOCUMENTS ENCLOSED</h3>${referenceDocumentsEnclosed()}<p><b>Bill of Lading Type:</b> ${esc(s.billOfLadingType)}<br><b>Bill By:</b> ${esc(s.billBy)}<br><b>Term Of Payment:</b> ${esc(s.term)}</p></article>`;
  }else if(state.preview==='letter'){
    body=`<article class="document-paper word-page-1"><p class="word-date">Date: <b>${esc(collectionDateText(s.collectionDate))}</b></p><p class="word-recipient">The Manager<br>${esc(s.remittingBank)}<br>Trade Finance Department<br>${esc(s.remittingBankLetterAddress)}</p><p>Dear sir,</p><p>We enclose herewith the following documents and request you to forward the same to collecting bank without any responsibility on your part requesting them to release the documents to drawee only against their <b>acceptance for payment on due date</b> without any responsibility on collecting bank and ${esc(s.remittingBank)}’s part and only upon receipt of funds from them, please credit the <b>proceeds</b> to our account no <b>${esc(s.remittingBankAccountNo)}</b> held with you after deduction of your charges under advice to us.</p><p><b>All bank charges outside UAE are to be collected from buyer/drawee</b></p><p class="word-collection-title">COLLECTION DOCUMENTS for:</p><p class="word-collection-data">Amount: <b>${esc(amount)}</b> SAY: <b>${esc(words)}</b></p><p>Tenor: <b>${esc(s.term)}</b></p><p class="word-bank-label">COLLECTING BANK<br><b>${esc(s.collectingBank)}</b><br><i>${esc(s.collectingBankAddress||'')}</i></p><p class="word-drawee">DRAWEE.<br><b>${esc(drawee)}</b><br><i>${esc(draweeAddress)}</i></p><p class="word-docs-title">DOCUMENTS ENCLOSED:</p><table class="word-documents"><thead><tr><th>No</th><th>Type of Document</th><th>Original</th><th>Duplicate</th></tr></thead><tbody><tr><td>1</td><td>BILL OF EXCHANGE</td><td>1</td><td>0</td></tr><tr><td>2</td><td>COMMERCIAL INVOICE</td><td>2</td><td>0</td></tr><tr><td>3</td><td>COPY B/L</td><td>0</td><td>2</td></tr><tr><td>4</td><td>Certificate of Origin</td><td>2</td><td>0</td></tr></tbody></table><p class="word-bill-by"><b>${esc(s.billBy)}</b></p><div class="word-signature">Yours faithfully,<br><br>For and on behalf of<br>${esc(s.drawer)}<br><br><b>${esc(s.authorizedPerson)}</b><br><b>${esc(s.title)}</b></div></article>`;
  }else if(state.preview==='undertaking'){
    body=`<article class="document-paper word-page-2"><div class="undertaking-head"><div class="undertaking-date">Dated: <b>${esc(collectionDateText(s.collectionDate))}</b></div><div>THE MANAGER<br>TRADE FINANCE DEPARTMENT<br>${esc(s.remittingBank)}<br>${esc(s.remittingBankAddress)}</div></div><h2>UNDERTAKING LETTER UNDER Export Collection Docs</h2><table class="undertaking-refs"><thead><tr><th>REF #:</th><th></th><th></th><th></th></tr></thead><tbody>${undertakingRows}</tbody></table><p class="undertaking-dear">Dear Sir / Madam,</p><ol class="undertaking-terms"><li>We hereby certify to ${esc(s.remittingBank)} PJSC (the “<u><b>Bank</b></u>”) that all enclosed Documents and any other document in relation to the underlying shipment or goods as described in the enclosed documents are accurate, correct and complete documents in full force and effect at the date of this letter.</li><li>[We hereby acknowledge that we have submitted <mark>${esc(s.billOfLadingType)}</mark> and certify that the Bank is the only bank handling the collection as the remitting bank and that we have not submitted (nor will we submit) the above Documents as a duplicate presentation to any other bank inside or outside the United Arab Emirates. The Bank may take any action which the Bank considers, in its sole and absolute discretion, required or appropriate to comply with laws, regulations, sanctions regimes, international guidance, the Bank's policies and procedures and/or requests of courts or regulatory authorities relating to the detection and prevention of money laundering and terrorism financing.]</li><li>The Bank shall be under no obligation to make any payment to us as seller/exporter/drawer in respect of the collection until it has received full payment from the collecting/presenting bank.</li><li>The Bank is entitled to deduct any charges for its services rendered under this letter.</li><li>The Bank is not obliged to check the Documents before sending them to the collecting/presenting bank.</li><li>The Bank shall not be liable for any losses or damages arising out of any delay or failure by the Bank in performing its services under this letter.</li><li>We hereby agree to indemnify the Bank and hold it harmless against all actions, proceedings and claims brought or threatened against it, and against all losses, damages, costs and expenses (including legal or attorney's fees) relating thereto, where such actions, proceedings, claims, losses, damages, costs and expenses have arisen out of or are in connection with our instruction under this letter <mark>including us submitting “${esc(s.billOfLadingType)}” as transport document(s).</mark></li><li>We hereby agree that the collection documents will be handled in accordance with the Uniform Rules for Collections, ICC publication number 522 (URC 522) or any subsequent revision thereof to the extent these rules are consistent with the federal laws of the United Arab Emirates and the laws of the Emirate of Abu Dhabi and with the rules and principles Islamic Shariah as interpreted by the Internal Shariah Supervisory Committee of the Bank.</li></ol><div class="undertaking-signature">Sincerely,<br><br>For and on behalf of:<br><br><b>${esc(s.drawer)}</b><br><br>Name:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${esc(s.authorizedPerson)}<br>Title:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${esc(s.title)}<br><br><br>Signature:</div></article>`;
  }else{
    body=`<article class="document-paper word-page-3"><h2>BILL OF EXCHANGE</h2><div class="boe-meta"><p><b>Amount:&nbsp;&nbsp; ${esc(amount)}</b></p><p><b>DATED:&nbsp;&nbsp; ${esc(collectionDateText(s.collectionDate))}</b></p></div><p class="boe-order"><b>AT&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${esc(s.term)} PAY TO THE ORDER OF</b><br>${esc(s.remittingBank)}, ABU DHABI - UAE&nbsp;&nbsp;&nbsp; <b>A SUM OF ${esc(amount)}</b></p><p class="boe-words">${esc(amountWords(total).toLowerCase())} ${esc(currency)} only <b>BEING VALUE DRAWN UNDER INVOICE #</b></p><div class="boe-invoices">${rows.map((r,index)=>`<div><b data-text-style-id="boe-invoice-${index}">${esc(r.invoiceNo||r.shipmentNo||'-')}</b><span><span data-text-style-id="boe-dated-label-${index}">Dated:</span>&nbsp;&nbsp; <span data-text-style-id="boe-invoice-date-${index}">${esc(r.invoiceDate||'-')}</span></span></div>`).join('')}</div><div class="boe-drawn"><b>Drawn On</b><br>${esc(drawee)}<br>${esc(draweeAddress)}</div><div class="boe-drawer"><b>Drawer</b><br>${esc(s.drawer)}<br>307, ALWAHA 1 DEIRA, DUBAI - UAE +97145773892</div></article>`;
  }
  $('documentPreview').innerHTML=body;
  applyCollectionBranding();
  updateTextOffsetControls();
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
  const textOffset=textOffsetForPreview();
  content.style.setProperty('--collection-text-x', `${textOffset.x}mm`);
  content.style.setProperty('--collection-text-y', `${textOffset.y}mm`);
  Array.from(paper.childNodes).forEach(node=>content.append(node));
  const flowImage = (className, source, position) => source ? `<img class="${className}" src="${esc(source)}" alt="" style="width:${Math.max(10,Math.min(Number(position.widthPercent)||16,35))}%;transform:rotate(${Number(position.rotate)||0}deg)">` : '';
  if(stamp || signature){
    content.insertAdjacentHTML('beforeend', `<div class="collection-flow-seals">${flowImage('collection-flow-signature', signature, signaturePos)}${flowImage('collection-flow-stamp', stamp, stampPos)}</div>`);
  }
  paper.append(content);
  const background = settings.background ? `<img class="collection-brand-layer collection-brand-bg" src="${esc(settings.background)}" alt="">` : '';
  paper.insertAdjacentHTML('afterbegin', background);
  prepareTextBlocks(content);
  fitCollectionContent(content);
  wireCollectionStampDrag(paper);
}

function fitCollectionContent(content){
  requestAnimationFrame(()=>{
    const translate = 'translate(var(--collection-text-x), var(--collection-text-y))';
    content.style.transform = translate;
    content.style.width = '';
    const top = content.getBoundingClientRect().top;
    const usedHeight = Math.max(content.scrollHeight, ...Array.from(content.children).map(node=>node.getBoundingClientRect().bottom - top));
    const ratio = Math.min(1, content.clientHeight / Math.max(content.clientHeight, usedHeight));
    if(ratio < .998){
      const safeRatio = Math.max(.72, ratio);
      content.style.transform = `${translate} scale(${safeRatio})`;
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
