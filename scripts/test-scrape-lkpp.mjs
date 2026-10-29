import puppeteer from 'puppeteer';

async function testLkpp4() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    const url = 'https://peraturan.bpk.go.id/Details/314291/peraturan-lkpp-no-4-tahun-2024';
    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const data = await page.evaluate(() => {
      const title = document.querySelector('h1, h2, .title, .entry-title')?.innerText?.trim() || '';
      const pdfLink = document.querySelector('a[href*="Download"], a[href*="Read"], a[href$=".pdf"]')?.href || '';
      
      // Ambil metadata dari tabel atau list dl/dt/dd atau table rows
      const metadata = {};
      const rows = document.querySelectorAll('tr, .row');
      rows.forEach(r => {
        const text = r.innerText.trim();
        if (text.includes(':')) {
          const parts = text.split(':');
          const k = parts[0].trim();
          const v = parts.slice(1).join(':').trim();
          if (k && v && k.length < 50) metadata[k] = v;
        }
      });

      // Status
      const statusEls = Array.from(document.querySelectorAll('tr, li, .badge, .status, p, span, div'))
        .filter(el => el.innerText && (el.innerText.includes('Mengubah') || el.innerText.includes('Berlaku') || el.innerText.includes('Dicabut')))
        .map(el => el.innerText.replace(/\s+/g, ' ').trim());

      const uniqueStatus = Array.from(new Set(statusEls)).slice(0, 10);

      // Abstrak / Materi pokok
      const bodyText = document.body.innerText;
      let abstract = '';
      const abstractMatch = bodyText.match(/MATERI POKOK PERATURAN\s*Abstrak([\s\S]*?)(METADATA PERATURAN|FILE-FILE|$)/i);
      if (abstractMatch) {
        abstract = abstractMatch[1].trim();
      }

      return {
        title,
        canonicalUrl: window.location.href,
        pdfLink,
        metadata,
        abstract,
        statusHints: uniqueStatus
      };
    });

    console.log('Scraped LKPP 4/2024:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testLkpp4();
