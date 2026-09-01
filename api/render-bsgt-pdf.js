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
    const executablePath = await chromium.executablePath();
    if (!executablePath) throw new Error('Chromium executable was not found.');
    browser = await puppeteer.launch({
      args: [...chromium.args, '--font-render-hinting=none'],
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
      executablePath,
      headless: true
    });
    const page = await browser.newPage();
    // The invoice can contain uploaded images. Waiting for network idle makes a
    // slow image request fail the whole package even though the page is ready.
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(async () => {
      await document.fonts?.ready;
      await Promise.all(Array.from(document.images).map(image => {
        if (image.complete) return Promise.resolve();
        return new Promise(resolve => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
          setTimeout(resolve, 5000);
        });
      }));
    });
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
    return res.status(500).json({ error: 'Unable to render the invoice PDF.', details: error.message || 'Unknown rendering error.' });
  } finally {
    if (browser) await browser.close();
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: '3mb' } },
  maxDuration: 60
};
