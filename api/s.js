const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vthcmqqiexaedukduquv.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function messagePage(title, message) {
  return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f7fb;color:#123155;font:16px Tahoma,'IBM Plex Sans Arabic',sans-serif}.card{max-width:480px;margin:24px;padding:30px;border:1px solid #d8e4f0;border-radius:16px;background:#fff;text-align:center;box-shadow:0 12px 35px #17355d18}h1{margin:0 0 12px;font-size:22px}p{margin:0;line-height:1.9;color:#526a83}</style><main class="card"><h1>${title}</h1><p>${message}</p></main>`;
}

function headers() {
  const value = {apikey:SERVICE_KEY};
  if (!SERVICE_KEY.startsWith('sb_secret_')) value.Authorization = `Bearer ${SERVICE_KEY}`;
  return value;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const id = String(req.query.i || req.query.id || '').trim();
  if (!id) return res.status(400).send(messagePage('رابط غير مكتمل', 'امسح رمز QR مرة أخرى.'));
  if (!SERVICE_KEY) return res.status(503).send(messagePage('الحزمة غير جاهزة', 'يلزم إعداد خدمة عرض الحزمة.'));

  try {
    // Verify that the opaque QR id still belongs to an existing shipment.
    const shipment = await fetch(`${SUPABASE_URL}/rest/v1/shipments?select=id&id=eq.${encodeURIComponent(id)}`, {headers:headers()});
    if (!shipment.ok) throw new Error(await shipment.text());
    if (!(await shipment.json())[0]) return res.status(404).send(messagePage('الشحنة غير موجودة', 'هذه الشحنة غير موجودة أو تم حذفها.'));

    const path = `qr-packages/${id}/bundle.pdf`;
    const pdf = await fetch(`${SUPABASE_URL}/storage/v1/object/shipment-files/${path}`, {headers:headers()});
    if (pdf.status === 404) {
      return res.status(404).send(messagePage('الحزمة لم تُجهز بعد', 'افتح الشحنة من النظام واختر «تجميع الحزمة الكاملة PDF» مرة واحدة، ثم امسح الرمز مجدداً.'));
    }
    if (!pdf.ok) {
      const detail = await pdf.text();
      // Supabase Storage may return HTTP 400 while reporting a missing object as NoSuchKey.
      if (/NoSuchKey|Object not found|not_found/i.test(detail)) {
        return res.status(404).send(messagePage('الحزمة لم تُجهز بعد', 'افتح الشحنة من النظام واختر «تجميع الحزمة الكاملة PDF» مرة واحدة، ثم امسح الرمز مجدداً.'));
      }
      throw new Error(detail);
    }

    const bytes = Buffer.from(await pdf.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="BSGT-${id}.pdf"`);
    res.setHeader('Content-Length', bytes.length);
    return res.status(200).send(bytes);
  } catch (error) {
    console.error('public package pdf', error);
    return res.status(500).send(messagePage('تعذر عرض الحزمة', 'حاول المسح مرة أخرى لاحقاً.'));
  }
};
