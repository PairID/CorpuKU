import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const artifactDir = 'C:\\Users\\Bpsdm\\.gemini\\antigravity\\brain\\0cc80cfa-af0d-4a1e-b960-46c9bbbae1de';
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

async function captureScreenshots() {
  console.log('Launching browser for screenshots...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Landing Page
  console.log('Capturing Landing Page (http://localhost:3001)...');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle2', timeout: 30000 });
  const landingPath = path.join(artifactDir, 'screenshot_landing_page.png');
  await page.screenshot({ path: landingPath, fullPage: false });
  console.log(`Saved: ${landingPath}`);

  // 2. Webinar Portal (Post-event / Completed: Cari Sertifikat)
  const webinarId = 'f3846fe7-07ff-4bfe-8164-5e300a0a7469';
  console.log(`Capturing Webinar Portal (http://localhost:3001/webinars/${webinarId})...`);
  await page.goto(`http://localhost:3001/webinars/${webinarId}`, { waitUntil: 'networkidle2', timeout: 30000 });
  const webinarPath = path.join(artifactDir, 'screenshot_webinar_portal.png');
  await page.screenshot({ path: webinarPath, fullPage: true });
  console.log(`Saved: ${webinarPath}`);

  // 3. Certificate Verification Page
  const token = '5fc29f9b-bf28-44e3-b2eb-8b698d45454f';
  console.log(`Capturing Certificate Verification (http://localhost:3001/verify/certificates/${token})...`);
  await page.goto(`http://localhost:3001/verify/certificates/${token}`, { waitUntil: 'networkidle2', timeout: 30000 });
  const verifyPath = path.join(artifactDir, 'screenshot_certificate_verification.png');
  await page.screenshot({ path: verifyPath, fullPage: true });
  console.log(`Saved: ${verifyPath}`);

  await browser.close();
  console.log('All screenshots captured successfully!');
}

captureScreenshots().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
