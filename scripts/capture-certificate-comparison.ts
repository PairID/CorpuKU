import path from 'path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { getSharedBrowser } from '../src/lib/puppeteer';

dotenv.config({ path: '.env.local' });

// Certificate assets
import {
  KALTARA_LOGO_DATA_URI,
  BSRE_FOOTER_DATA_URI,
  OFFICIAL_TTE_BOX_DATA_URI,
  BOOKMAN_REGULAR_BASE64,
  BOOKMAN_BOLD_BASE64,
} from '../src/lib/certificate-assets';

const artifactDir = 'C:/Users/Bpsdm/.gemini/antigravity/brain/29793816-8a1c-435b-b860-f7d4f799b0e4';

async function main() {
  console.log('Connecting to database...');
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql.query("SELECT settings FROM certificate_settings WHERE type = 'sertifikat'");
  const certSettings = rows[0]?.settings || {};
  const elements = certSettings.elements || [];

  const todayFormatted = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  const previewData = {
    certificateNumber: "800.2.5/12331/BPSDM/AKJ-27/X/2026",
    date: todayFormatted,
    issueDate: todayFormatted,
    activityDate: todayFormatted,
    studentName: "Budi Santoso, S.STP.",
    nip: "199501012020011001",
    grade: "Penata Muda / III/a",
    position: "Analis Kebijakan Ahli Pertama",
    institution: "Sekretariat Daerah Provinsi Kalimantan Utara",
    courseName: "Kepemimpinan Digital di Pemerintahan",
    hours: 40,
  };

  const parseText = (raw) => {
    if (!raw) return '';
    return raw
      .replace(/\{\{nomor\}\}/g, previewData.certificateNumber)
      .replace(/\{\{tanggal_terbit\}\}/g, previewData.issueDate)
      .replace(/\{\{tanggal_kegiatan\}\}/g, previewData.activityDate)
      .replace(/\{\{tanggal\}\}/g, previewData.issueDate)
      .replace(/\{\{nama\}\}/g, previewData.studentName)
      .replace(/\{\{nip\}\}/g, previewData.nip)
      .replace(/\{\{instansi\}\}/g, previewData.institution)
      .replace(/\{\{kursus\}\}/g, previewData.courseName)
      .replace(/\{\{jp\}\}/g, String(previewData.hours));
  };

  const kopEl = elements.find(el => String(el.id || '') === 'kop_1' || String(el.text || '').includes('KEPALA BADAN'));
  const titleEl = elements.find(el => String(el.id || '') === 'title_1' || String(el.text || '').includes('SERTIFIKAT'));
  const nomorEl = elements.find(el => String(el.id || '') === 'nomor_1' || String(el.text || '').includes('Nomor'));
  const labelToEl = elements.find(el => String(el.id || '') === 'label_to_1' || String(el.text || '').includes('Diberikan'));
  const tableEl = elements.find(el => String(el.id || '') === 'table_identitas_1' || String(el.text || '').includes('Nama :'));
  const paragraphEl = elements.find(el => String(el.id || '') === 'paragraph_1' || String(el.text || '').includes('Atas partisipasinya'));
  const sigDateEl = elements.find(el => String(el.id || '') === 'sig_date' || String(el.text || '').includes('Tanjung Selor'));

  const kopText = parseText(kopEl?.text || 'KEPALA BADAN PENGEMBANGAN SUMBER DAYA MANUSIA\nPROVINSI KALIMANTAN UTARA');
  const titleText = parseText(titleEl?.text || 'SERTIFIKAT');
  const nomorText = parseText(nomorEl?.text || 'Nomor : {{nomor}}');
  const labelToText = parseText(labelToEl?.text || 'Diberikan kepada:');
  const paragraphText = parseText(paragraphEl?.text || 'Atas partisipasinya dalam {{kursus}} yang diselenggarakan oleh Badan Pengembangan Sumber Daya Manusia Provinsi Kalimantan Utara pada tanggal {{tanggal}} secara daring yang meliputi {{jp}} Jam Pelajaran.');
  const sigDateText = parseText(sigDateEl?.text || 'Tanjung Selor, {{tanggal_terbit}}');

  const rawTableText = parseText(tableEl?.text || 'Nama : {{nama}}\nNIP/NIK : {{nip}}\nInstansi : {{instansi}}');
  const tableLines = rawTableText.split('\n').map(l => l.trim()).filter(Boolean);
  const identityRows = tableLines.map(line => {
    const colonIdx = line.indexOf(':');
    return {
      label: colonIdx === -1 ? line : line.slice(0, colonIdx).trim(),
      value: colonIdx === -1 ? '' : line.slice(colonIdx + 1).trim(),
    };
  });

  const fontFaceCss = `
    @font-face {
      font-family: 'Bookman Old Style';
      src: url('data:font/truetype;charset=utf-8;base64,${BOOKMAN_REGULAR_BASE64}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: 'Bookman Old Style';
      src: url('data:font/truetype;charset=utf-8;base64,${BOOKMAN_BOLD_BASE64}') format('truetype');
      font-weight: bold;
      font-style: normal;
    }
  `;

  // 1. WEB LIVE PREVIEW HTML (mirrors CertificateView.tsx)
  const webHtml = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      ${fontFaceCss}
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background: #0f172a;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 40px;
        min-height: 100vh;
        font-family: 'Bookman Old Style', 'Bookman', 'URW Bookman L', 'Palatino', serif;
      }
      .preview-frame {
        width: 600px;
        height: 848.4px; /* 1 : 1.414 */
        background: #ffffff;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        border-radius: 8px;
        overflow: hidden;
        position: relative;
        container-type: inline-size;
      }
      .cert-view {
        width: 100%;
        height: 100%;
        background: #ffffff;
        color: #000000;
        position: relative;
        padding: 11.14cqi 12.1cqi 8.57cqi 12.1cqi;
        box-sizing: border-box;
      }
      .logo-box {
        position: relative;
        margin: 0 auto 1.5cqi auto;
        width: 10.95cqi;
        height: 10.95cqi;
      }
      .logo-box img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .kop-text {
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
        white-space: pre-line;
        color: #000000;
        line-height: 1.25;
        letter-spacing: 0.2px;
        font-size: 2.35cqi;
        margin-bottom: 3.0cqi;
      }
      .title-text {
        font-weight: bold;
        text-align: center;
        letter-spacing: 0.5px;
        color: #000000;
        font-size: 4.2cqi;
        margin-bottom: 0.75cqi;
      }
      .nomor-text {
        text-align: center;
        color: #000000;
        font-size: 2.01cqi;
        margin-bottom: 3.5cqi;
      }
      .label-to-text {
        text-align: center;
        color: #000000;
        font-size: 2.01cqi;
        margin-bottom: 2.5cqi;
      }
      table.identity-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 2.01cqi;
        margin-bottom: 3.0cqi;
      }
      table.identity-table td {
        vertical-align: top;
        padding: 0.3cqi 0;
        color: #000000;
      }
      .paragraph-text {
        text-align: justify;
        line-height: 1.45;
        color: #000000;
        font-size: 2.01cqi;
        margin-bottom: 3.78cqi;
      }
      .tte-block {
        width: 100%;
        display: flex;
        justify-content: flex-end;
        margin-top: 5.5cqi;
      }
      .tte-col {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
        width: 35.2cqi;
      }
      .sig-date {
        color: #000000;
        text-align: left;
        width: 100%;
        font-size: 2.01cqi;
        margin-bottom: 0.75cqi;
      }
      .tte-image-box {
        position: relative;
        width: 35.14cqi;
        height: 12.1cqi;
      }
      .tte-image-box img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: left;
      }
      .footer-banner {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 5.38cqi;
        text-align: center;
        pointer-events: none;
      }
      .footer-banner img {
        width: 54.28cqi;
        height: 4.66cqi;
        object-fit: contain;
        display: inline-block;
      }
    </style>
  </head>
  <body>
    <div class="preview-frame">
      <div class="cert-view">
        <div class="logo-box">
          <img src="${KALTARA_LOGO_DATA_URI}" alt="Logo Pemprov Kaltara" />
        </div>
        <div class="kop-text">${kopText}</div>
        <div class="title-text">${titleText}</div>
        <div class="nomor-text">${nomorText}</div>
        <div class="label-to-text">${labelToText}</div>
        <table class="identity-table">
          <tbody>
            ${identityRows.map(r => `
              <tr>
                <td style="width: 21.4cqi; white-space: nowrap;">${r.label}</td>
                <td style="width: 2.26cqi; text-align: center;">:</td>
                <td style="${r.label.toLowerCase().includes('nama') ? 'font-weight: 600;' : ''}">${r.value}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="paragraph-text">${paragraphText}</div>
        <div class="tte-block">
          <div class="tte-col">
            <div class="sig-date">${sigDateText}</div>
            <div class="tte-image-box">
              <img src="${OFFICIAL_TTE_BOX_DATA_URI}" alt="TTE Resmi BPSDM" />
            </div>
          </div>
        </div>
        <div class="footer-banner">
          <img src="${BSRE_FOOTER_DATA_URI}" alt="BSrE BSSN" />
        </div>
      </div>
    </div>
  </body>
  </html>`;

  // 2. PRINTED PDF HTML (mirrors api/pdf/route.ts)
  const pdfHtml = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Sertifikat Resmi BPSDM Kaltara</title>
    <style>
      ${fontFaceCss}
      @page { size: A4 portrait; margin: 0; }
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        margin: 0;
        padding: 0;
        width: 210mm;
        height: 297mm;
        font-family: 'Bookman Old Style', 'Bookman', serif;
        background: #ffffff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .certificate {
        position: relative;
        width: 210mm;
        height: 297mm;
        background: #ffffff;
        padding: 23.4mm 25.4mm 18mm 25.4mm;
        overflow: hidden;
      }
      .logo-img {
        width: 23mm;
        height: 23mm;
        display: block;
        margin: 0 auto 12px auto;
        object-fit: contain;
      }
      .kop-text {
        font-size: 14pt;
        font-weight: bold;
        text-align: center;
        line-height: 1.25;
        margin: 0 0 24px 0;
        text-transform: uppercase;
        letter-spacing: 0.2px;
        color: #000000;
        white-space: pre-line;
      }
      .title-text {
        font-size: 25pt;
        font-weight: bold;
        text-align: center;
        margin: 0 0 6px 0;
        letter-spacing: 0.5px;
        color: #000000;
      }
      .nomor-text {
        font-size: 12pt;
        text-align: center;
        margin: 0 0 28px 0;
        color: #000000;
      }
      .label-to-text {
        font-size: 12pt;
        text-align: center;
        margin: 0 0 20px 0;
        color: #000000;
      }
      table.identity-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12pt;
        margin-bottom: 24px;
      }
      table.identity-table td {
        vertical-align: top;
        padding: 2.5px 0;
        color: #000000;
      }
      .paragraph-text {
        font-size: 12pt;
        line-height: 1.45;
        text-align: justify;
        margin-bottom: 30px;
        color: #000000;
      }
      .tte-block {
        width: 100%;
        display: flex;
        justify-content: flex-end;
        margin-top: 36px;
      }
      .tte-col {
        width: 74mm;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
      }
      .sig-date {
        font-size: 12pt;
        margin-bottom: 6px;
        text-align: left;
        width: 100%;
        color: #000000;
      }
      .tte-img {
        width: 73.8mm;
        height: 25.4mm;
        display: block;
        object-fit: contain;
        object-position: left;
      }
      .footer-banner {
        position: absolute;
        bottom: 16mm;
        left: 0;
        right: 0;
        text-align: center;
      }
      .footer-banner img {
        height: 9.8mm;
        max-width: 114mm;
        display: inline-block;
      }
    </style>
  </head>
  <body>
    <section class="certificate">
      <img src="${KALTARA_LOGO_DATA_URI}" alt="Logo Pemprov Kaltara" class="logo-img" />
      <div class="kop-text">${kopText}</div>
      <div class="title-text">${titleText}</div>
      <div class="nomor-text">${nomorText}</div>
      <div class="label-to-text">${labelToText}</div>
      <table class="identity-table">
        <tbody>
          ${identityRows.map(r => `
            <tr>
              <td style="width: 170px; white-space: nowrap;">${r.label}</td>
              <td style="width: 18px; white-space: nowrap; text-align: center;">:</td>
              <td style="${r.label.toLowerCase().includes('nama') ? 'font-weight: 500;' : ''}">${r.value}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="paragraph-text">${paragraphText}</div>
      <div class="tte-block">
        <div class="tte-col">
          <div class="sig-date">${sigDateText}</div>
          <img src="${OFFICIAL_TTE_BOX_DATA_URI}" alt="TTE Resmi BPSDM" class="tte-img" />
        </div>
      </div>
      <div class="footer-banner">
        <img src="${BSRE_FOOTER_DATA_URI}" alt="BSrE BSSN" />
      </div>
    </section>
  </body>
  </html>`;

  console.log('Launching browser to capture screenshots...');
  const browser = await getSharedBrowser();

  // 1. Capture Web Live Preview screenshot
  const page1 = await browser.newPage();
  await page1.setViewport({ width: 700, height: 960, deviceScaleFactor: 2 });
  await page1.setContent(webHtml, { waitUntil: 'networkidle0' });
  await page1.evaluateHandle('document.fonts.ready');
  const webPath = path.join(artifactDir, 'screenshot_web_live_preview.png');
  await page1.screenshot({ path: webPath });
  console.log('Saved Web Live Preview screenshot to:', webPath);
  await page1.close();

  // 2. Capture Printed PDF screenshot
  const page2 = await browser.newPage();
  // 210mm @ 96dpi ≈ 794px, 297mm @ 96dpi ≈ 1123px
  await page2.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page2.setContent(pdfHtml, { waitUntil: 'networkidle0' });
  await page2.evaluateHandle('document.fonts.ready');
  const pdfPath = path.join(artifactDir, 'screenshot_cetak_pdf.png');
  await page2.screenshot({ path: pdfPath });
  console.log('Saved Printed PDF screenshot to:', pdfPath);
  await page2.close();

  await browser.close();
  console.log('Comparison screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
