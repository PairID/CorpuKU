import puppeteer from 'puppeteer';

async function testPerpres46() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    const url = 'https://peraturan.bpk.go.id/Details/318647/perpres-no-46-tahun-2025';
    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const data = await page.evaluate(() => {
      const title = document.querySelector('h1, h2, .title, .entry-title')?.innerText?.trim() || '';
      const pdfLink = document.querySelector('a[href*="Download"], a[href*="Read"]')?.href || '';
      const statusEls = Array.from(document.querySelectorAll('tr, li, .badge, .status, p, span, div'))
        .filter(el => el.innerText && (el.innerText.includes('Mengubah') || el.innerText.includes('Berlaku') || el.innerText.includes('Dicabut')))
        .map(el => el.innerText.replace(/\s+/g, ' ').trim());
      
      const uniqueStatus = Array.from(new Set(statusEls)).slice(0, 10);
      return {
        title,
        canonicalUrl: window.location.href,
        pdfLink,
        statusHints: uniqueStatus
      };
    });

    console.log('Scraped BPK Perpres 46/2025:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

testPerpres46();
