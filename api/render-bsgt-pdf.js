const DEFAULT_BROWSERLESS_PDF_ENDPOINT = 'https://production-sfo.browserless.io/pdf';

function readRequestBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(JSON.parse(req.body));
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(new Error('Invalid JSON request body.')); }
    });
    req.on('error', reject);
  });
}

module.exports = async function renderBsgtPdf(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) {
    return res.status(503).json({
      error: 'Browserless is not configured. Add BROWSERLESS_TOKEN in Vercel environment variables.'
    });
  }

  try {
    const { html } = await readRequestBody(req);
    if (typeof html !== 'string' || !html.trim()) {
      return res.status(400).json({ error: 'Invoice HTML is required.' });
    }
    if (html.length > 2_000_000) {
      return res.status(413).json({ error: 'Invoice HTML is too large to render.' });
    }

    const endpoint = String(process.env.BROWSERLESS_PDF_ENDPOINT || DEFAULT_BROWSERLESS_PDF_ENDPOINT).replace(/\/$/, '');
    const response = await fetch(`${endpoint}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        options: {
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' }
        }
      })
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 500);
      throw new Error(`Browserless PDF failed (${response.status}): ${details || response.statusText}`);
    }
    const pdf = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(pdf);
  } catch (error) {
    console.error('BSGT PDF render failed:', error.message);
    return res.status(502).json({ error: 'Could not render the BSGT invoice PDF.' });
  }
};
