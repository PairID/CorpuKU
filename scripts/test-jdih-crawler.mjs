import puppeteer from 'puppeteer';

async function testBPKDetail() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const detailUrl = "https://peraturan.bpk.go.id/Details/169555/peraturan-lkpp-no-5-tahun-2021";
    console.log("Navigating to detail:", detailUrl);
    
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const metadata = await page.evaluate(() => {
      // Ambil judul
      const title = document.querySelector('h1, h2.title, .entry-title')?.innerText?.trim() || "";
      

      
      // Ambil status keberlakuan
      const statusElements = Array.from(document.querySelectorAll('.badge, .status, .label, p, span, div'))
        .filter(el => el.innerText && (el.innerText.includes('Berlaku') || el.innerText.includes('Dicabut') || el.innerText.includes('Mengubah')));
      
      const statusText = statusElements.map(e => e.innerText.trim()).filter(Boolean).slice(0, 3);

      // Ambil link PDF download
      const pdfLink = document.querySelector('a[href$=".pdf"], a[href*="Download"], a[href*="download"]')?.href || "";

      return {
        title,
        statusHints: statusText,
        pdfLink
      };
    });

    console.log("Scraped Metadata:", JSON.stringify(metadata, null, 2));

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

testBPKDetail();
