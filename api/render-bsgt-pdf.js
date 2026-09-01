const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const MAX_HTML_BYTES = 3 * 1024 * 1024;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const html = typeof req.body?.html === 'string' ? req.body.html : '';
  if (!html || Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return res.status(400).json({ error: 'Invalid or oversized invoice HTML.' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
      executablePath: await chromium.executablePath(),
      headless: true
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => document.fonts?.ready);
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
      preferCSSPageSize: true
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(pdf);
  } catch (error) {
    console.error('BSGT PDF render failed', error);
    return res.status(500).json({ error: 'Unable to render the invoice PDF.' });
  } finally {
    if (browser) await browser.close();
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: '3mb' } },
  maxDuration: 60
};
