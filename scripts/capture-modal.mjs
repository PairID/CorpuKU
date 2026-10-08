import puppeteer from 'puppeteer';
import path from 'path';

const artifactDir = 'C:\\Users\\Bpsdm\\.gemini\\antigravity\\brain\\0cc80cfa-af0d-4a1e-b960-46c9bbbae1de';

async function captureModalClick() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const webinarId = 'f3846fe7-07ff-4bfe-8164-5e300a0a7469';
  await page.goto(`http://localhost:3001/webinars/${webinarId}`, { waitUntil: 'networkidle2' });

  // Type into the search input inside form
  const inputSelector = 'input[placeholder="Masukkan NIP / NIK Anda..."]';
  await page.waitForSelector(inputSelector);
  await page.type(inputSelector, '198507122010011005');

  // Submit the form
  await page.evaluate(() => {
    const input = document.querySelector('input[placeholder="Masukkan NIP / NIK Anda..."]');
    if (input && input.form) {
      input.form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  });

  // Wait for result card to appear
  await page.waitForFunction(() => {
    return document.body.innerText.includes('Sertifikat Siap Diunduh');
  }, { timeout: 8000 }).catch(() => null);

  const lookupResultPath = path.join(artifactDir, 'screenshot_webinar_modal_result.png');
  await page.screenshot({ path: lookupResultPath, fullPage: true });
  console.log('Saved modal result screenshot');

  await browser.close();
}

captureModalClick().catch(console.error);
