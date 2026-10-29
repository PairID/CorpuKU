import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { withBrowserPage } from '@/lib/puppeteer';
import { sql } from '@/lib/db';
import { getAuthSession } from '@/app/actions/auth';
import { getWebinarCertificateForDownload, reserveCertificateDownload, getCertificateByVerificationToken, formatWebinarCertificateFilename } from '@/lib/webinar-certificates';
import { getCourseCertificateForDownload, reserveCourseCertificateDownload, getCourseCertificateByVerificationToken } from '@/lib/course-certificates';
import {
  KALTARA_LOGO_DATA_URI,
  BSRE_FOOTER_DATA_URI,
  BOOKMAN_REGULAR_BASE64,
  BOOKMAN_BOLD_BASE64,
  OFFICIAL_TTE_BOX_DATA_URI,
} from '@/lib/certificate-assets';

export const runtime = 'nodejs';

type TemplateElement = {
  id?: unknown;
  type?: unknown;
  text?: unknown;
  imageUrl?: unknown;
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  fontSize?: unknown;
  fontFamily?: unknown;
  fontWeight?: unknown;
  color?: unknown;
  textAlign?: unknown;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function allowedAssetUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const configuredHosts = (process.env.CERTIFICATE_ASSET_HOSTS || '')
      .split(',').map(host => host.trim().toLowerCase()).filter(Boolean);
    const allowedHosts = new Set(['res.cloudinary.com', ...configuredHosts]);
    return url.protocol === 'https:' && allowedHosts.has(url.hostname.toLowerCase()) ? url.toString() : null;
  } catch {
    return null;
  }
}

function requestOriginIsAllowed(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const accepted = new Set([new URL(req.url).origin]);
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try { accepted.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin); } catch { /* invalid configuration */ }
  }
  return accepted.has(origin);
}

function safeTextAlign(value: unknown) {
  return ['left', 'center', 'right', 'justify'].includes(String(value)) ? String(value) : 'center';
}

function safeColor(value: unknown) {
  const color = String(value ?? '');
  return /^(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i.test(color) ? color : '#000000';
}

export async function POST(req: Request) {
  try {
    if (!requestOriginIsAllowed(req)) {
      return NextResponse.json({ error: 'Origin tidak diizinkan.' }, { status: 403 });
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload tidak valid.' }, { status: 400 });
    }
    const data = body as Record<string, unknown>;
    const token = typeof data.verificationToken === 'string' && /^[0-9a-f-]{36}$/i.test(data.verificationToken)
      ? data.verificationToken
      : null;

    const session = await getAuthSession();
    if (!session && !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isTest = data.type === 'test_certificate';
    const isWebinar = data.type === 'webinar_certificate';
    const isCourse = data.type === 'course_certificate';
    if (!isTest && !isWebinar && !isCourse) return NextResponse.json({ error: 'Permintaan sertifikat tidak valid.' }, { status: 400 });

    if (isTest) {
      if (!session || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Hanya administrator yang diizinkan menguji cetak sertifikat.' }, { status: 403 });
      }
    }

    let webinarCertificate = null;
    let courseCertificate = null;

    if (isTest) {
      // Mock data berstandar kedinasan BPSDM Kaltara untuk keperluan uji cetak langsung
      webinarCertificate = {
        id: 'test_preview_cert',
        certificateNumber: '800.2.5/12331/BPSDM/AKJ-27/X/2026',
        verificationToken: '00000000-0000-0000-0000-000000000000',
        participantName: 'Budi Santoso, S.STP.',
        participantNip: '199501012020011001',
        participantRank: 'Penata Muda / III/a',
        participantPosition: 'Analis Kebijakan Ahli Pertama',
        participantInstitution: 'Sekretariat Daerah Provinsi Kalimantan Utara',
        webinarTitle: 'Kepemimpinan Digital di Pemerintahan',
        webinarScheduledAt: new Date().toISOString(),
        issuedAt: new Date().toISOString(),
        certificateJp: 40,
        templateType: typeof data.templateType === 'string' ? data.templateType : 'sertifikat',
        templateSettings: (data.templateSettings && typeof data.templateSettings === 'object') ? data.templateSettings : null,
      };
    } else if (token) {
      const certFromToken = await getCertificateByVerificationToken(token);
      if (certFromToken && !certFromToken.revokedAt) {
        webinarCertificate = certFromToken;
      } else {
        const courseCertFromToken = await getCourseCertificateByVerificationToken(token);
        if (courseCertFromToken && !courseCertFromToken.revokedAt) {
          courseCertificate = courseCertFromToken;
        }
      }
    } else if (session) {
      if (isWebinar && typeof data.webinarId === 'string' && data.webinarId.length <= 255) {
        webinarCertificate = await getWebinarCertificateForDownload(session.user.id, String(data.webinarId));
      }
      if (isCourse && typeof data.courseId === 'string' && data.courseId.length <= 255) {
        courseCertificate = await getCourseCertificateForDownload(session.user.id, String(data.courseId));
      }
    }

    const certificate = webinarCertificate ? {
      ...webinarCertificate,
      activityTitle: webinarCertificate.webinarTitle,
      activityAt: webinarCertificate.webinarScheduledAt,
    } : courseCertificate ? {
      ...courseCertificate,
      activityTitle: courseCertificate.courseTitle,
      activityAt: courseCertificate.completedAt,
    } : null;
    if (!certificate) {
      return NextResponse.json({ error: 'Sertifikat belum tersedia atau telah dicabut.' }, { status: 403 });
    }
    // Fetch latest active template settings so admin edits take effect immediately
    let activeConfig: Record<string, unknown> = (certificate.templateSettings && typeof certificate.templateSettings === 'object')
      ? certificate.templateSettings as Record<string, unknown>
      : {};
    const templateType = String(certificate.templateType || 'sertifikat');
    if (!isTest || !data.templateSettings) {
      try {
        const activeRows = await sql`
          SELECT settings FROM certificate_settings WHERE type = ${templateType} LIMIT 1
        `;
        if (activeRows[0]?.settings && typeof activeRows[0].settings === 'object') {
          activeConfig = activeRows[0].settings as Record<string, unknown>;
        }
      } catch (err) {
        console.warn('Gagal membaca template terbaru dari DB, menggunakan snapshot:', err);
      }
    }

    const config = activeConfig;
    const orientation = config.orientation === 'portrait' ? 'portrait' : 'landscape';
    const templateUrl = allowedAssetUrl(config.templateUrl);
    const elements = Array.isArray(config.elements) ? config.elements as TemplateElement[] : [];
    const page2 = config.page2 && typeof config.page2 === 'object' ? config.page2 as Record<string, unknown> : null;
    const page2Enabled = page2?.enabled === true;
    const page2TemplateUrl = page2Enabled ? allowedAssetUrl(page2?.templateUrl) : null;
    const page2Elements = page2Enabled && Array.isArray(page2?.elements) ? page2.elements as TemplateElement[] : [];

    // Setup filename
    const safeCertFilename = isTest
      ? `Uji-Coba-Sertifikat-${certificate.templateType}.pdf`
      : webinarCertificate
        ? formatWebinarCertificateFilename({
            participantName: certificate.participantName,
            certificateNumber: certificate.certificateNumber,
            category: 'Yang Lain',
          })
        : `Sertifikat-${certificate.activityTitle}.pdf`.replace(/[/\\?%*:|"<>]/g, '_');
    const encodedTitle = encodeURIComponent(safeCertFilename);

    // Disk Cache check: jika PDF sudah pernah dicetak dan template/data nomor belum berubah, kirim langsung dari disk
    const templateHash = crypto
      .createHash('md5')
      .update(JSON.stringify(config) + String(certificate.certificateNumber))
      .digest('hex')
      .slice(0, 10);
    const cacheDir = path.join(process.cwd(), '.cache', 'certificates');
    const cachedFilePath = path.join(cacheDir, `${certificate.id}_${templateHash}.pdf`);

    if (!isTest && fs.existsSync(cachedFilePath)) {
      try {
        const cachedPdf = fs.readFileSync(cachedFilePath);
        return new NextResponse(cachedPdf as BodyInit, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${safeCertFilename.replace(/"/g, '')}"; filename*=UTF-8''${encodedTitle}`,
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
            'X-PDF-Cache': 'HIT',
          },
        });
      } catch (readErr) {
        console.warn('Gagal membaca file cache PDF, fallback cetak Puppeteer:', readErr);
      }
    }

    // Hanya throttle jika belum di-cache dan bukan sesi uji cetak
    if (!isTest) {
      const downloadReserved = webinarCertificate
        ? await reserveCertificateDownload(certificate.id)
        : await reserveCourseCertificateDownload(certificate.id);
      if (!downloadReserved) {
        return NextResponse.json({ error: 'Tunggu beberapa detik sebelum mengunduh ulang.' }, { status: 429 });
      }
    }

    const publicOrigin = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : new URL(req.url).origin;
    const verificationUrl = `${publicOrigin}/verify/certificates/${certificate.verificationToken}`;

    const replacements: Record<string, string> = {
      '{{nama}}': certificate.participantName,
      '{{kursus}}': certificate.activityTitle,
      '{{nip}}': certificate.participantNip || '',
      '{{pangkat}}': certificate.participantRank || '',
      '{{jabatan}}': certificate.participantPosition || '',
      '{{instansi}}': certificate.participantInstitution || '',
      '{{tanggal_terbit}}': new Date(certificate.issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      '{{tanggal}}': new Date(certificate.activityAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      '{{jp}}': String(certificate.certificateJp),
      '{{nomor}}': certificate.certificateNumber,
      '{{verifikasi}}': verificationUrl,
    };

    const parseText = (raw: unknown) => {
      let text = String(raw ?? '');
      for (const [placeholder, replacement] of Object.entries(replacements)) {
        text = text.split(placeholder).join(replacement);
      }
      return escapeHtml(text);
    };

    const toDataUri = async (url: string | null): Promise<string | null> => {
      if (!url) return null;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        const mime = res.headers.get('content-type') || 'image/png';
        return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
      } catch {
        return null;
      }
    };

    const width = orientation === 'landscape' ? 1123 : 794;
    const height = orientation === 'landscape' ? 794 : 1123;
    const baseDimension = orientation === 'landscape' ? 1123 : 794;

    const renderElements = async (source: TemplateElement[]) => {
      const rendered = await Promise.all(source.slice(0, 100).map(async element => {
        const isImage = element.type === 'image';
        const x = boundedNumber(element.x, 50, 0, 100);
        const y = boundedNumber(element.y, 50, 0, 100);
        const elWidth = boundedNumber(element.width, 80, 1, 100);
        const elHeight = boundedNumber(element.height, 20, 1, 100);
        const baseStyle = `position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);width:${elWidth}%;`;

        if (isImage) {
          const rawUrl = allowedAssetUrl(element.imageUrl);
          if (!rawUrl) return '';
          const dataUri = await toDataUri(rawUrl);
          if (!dataUri) return '';
          return `<div style="${baseStyle}height:${elHeight}%;"><img src="${dataUri}" alt="" style="width:100%;height:100%;object-fit:contain;" /></div>`;
        }

        const fontSize = boundedNumber(element.fontSize, 16, 6, 120);
        const fontWeight = ['normal', 'bold', '400', '500', '600', '700'].includes(String(element.fontWeight)) ? String(element.fontWeight) : 'normal';
        const fontFamily = element.fontFamily === 'bookman'
          ? "'Bookman Old Style', 'Bookman', 'URW Bookman L', 'Palatino', serif"
          : element.fontFamily === 'serif' ? 'Georgia, serif' : element.fontFamily === 'mono' ? 'monospace' : 'Arial, sans-serif';

        const computedFontSizePx = (fontSize / 800) * baseDimension;
        const align = safeTextAlign(element.textAlign);
        const justifyCss = `text-align:${align};`;

        const parsedRaw = parseText(element.text);
        const lines = parsedRaw.split('\n').map(l => l.trim()).filter(Boolean);
        const isKeyValueTable = lines.length >= 2 && lines.every(l => l.includes(':'));

        if (isKeyValueTable) {
          const rows = lines.map(line => {
            const colonIdx = line.indexOf(':');
            const label = line.slice(0, colonIdx).trim();
            const value = line.slice(colonIdx + 1).trim();
            return `<tr style="vertical-align:top;"><td style="width:1%;white-space:nowrap;padding-right:1.5em;text-align:left;">${label}</td><td style="width:1%;white-space:nowrap;padding-right:1.5em;text-align:center;">:</td><td style="width:auto;text-align:left;">${value}</td></tr>`;
          }).join('');

          return `<div style="${baseStyle}font-size:${computedFontSizePx}px;font-family:${fontFamily};font-weight:${fontWeight};color:${safeColor(element.color)};line-height:1.4;"><table style="width:100%;border-collapse:collapse;table-layout:auto;"><tbody>${rows}</tbody></table></div>`;
        }

        return `<div style="${baseStyle}font-size:${computedFontSizePx}px;font-family:${fontFamily};font-weight:${fontWeight};color:${safeColor(element.color)};${justifyCss}white-space:pre-wrap;line-height:1.4;">${parsedRaw}</div>`;
      }));
      return rendered.join('');
    };

    const renderStructuredNaskahDinasHtml = async (source: TemplateElement[]) => {
      // Identifikasi elemen tanda tangan & logo secara tepat tanpa benturan penamaan
      const sigImgEl = source.find(el => {
        if (el.type !== 'image') return false;
        const id = String(el.id || '').toLowerCase();
        const text = String(el.text || '').toLowerCase().trim();
        const url = String(el.imageUrl || '').toLowerCase();
        if (url.includes('pab59388nfffraedyngo') || id.includes('sig') || id.includes('tte')) return true;
        if (url.includes('tjvwh182kf3vlmctmsan') || id.includes('logo')) return false;
        if (text === 'tanda tangan' || text.startsWith('tte') || text === 'tanda tangan elektronik') return true;
        return false;
      });

      const logoEl = source.find(el => {
        if (el.type !== 'image') return false;
        if (el === sigImgEl) return false;
        const id = String(el.id || '').toLowerCase();
        const text = String(el.text || '').toLowerCase().trim();
        const url = String(el.imageUrl || '').toLowerCase();
        if (url.includes('tjvwh182kf3vlmctmsan') || id.includes('logo')) return true;
        if (url.includes('pab59388nfffraedyngo') || id.includes('sig')) return false;
        if (text.includes('logo')) return true;
        return true;
      });

      const rawLogoUrl = allowedAssetUrl(logoEl?.imageUrl);
      const rawSigUrl = allowedAssetUrl(sigImgEl?.imageUrl);

      const [customLogoDataUri, customSigDataUri] = await Promise.all([
        rawLogoUrl ? toDataUri(rawLogoUrl) : Promise.resolve(null),
        rawSigUrl ? toDataUri(rawSigUrl) : Promise.resolve(null),
      ]);

      const logoDataUri = customLogoDataUri || KALTARA_LOGO_DATA_URI;
      // Jaminan tanda tangan resmi BPSDM Kaltara (Sipta Meylina / TTE Box BSrE) tidak tertukar dengan logo tameng
      const sigDataUri = (customSigDataUri && !customSigDataUri.includes('tjvwh182kf3vlmctmsan'))
        ? customSigDataUri
        : OFFICIAL_TTE_BOX_DATA_URI;

      const kopEl = source.find(el => String(el.id || '') === 'kop_1' || String(el.text || '').includes('KEPALA BADAN'));
      const titleEl = source.find(el => String(el.id || '') === 'title_1' || String(el.text || '').includes('SERTIFIKAT'));
      const nomorEl = source.find(el => String(el.id || '') === 'nomor_1' || String(el.text || '').includes('Nomor'));
      const labelToEl = source.find(el => String(el.id || '') === 'label_to_1' || String(el.text || '').includes('Diberikan'));
      const tableEl = source.find(el => String(el.id || '') === 'table_identitas_1' || String(el.text || '').includes('Nama :'));
      const paragraphEl = source.find(el => String(el.id || '') === 'paragraph_1' || String(el.text || '').includes('Atas partisipasinya'));
      const sigDateEl = source.find(el => String(el.id || '') === 'sig_date' || String(el.text || '').includes('Tanjung Selor'));

      const kopText = parseText(kopEl?.text || 'KEPALA BADAN PENGEMBANGAN SUMBER DAYA MANUSIA\nPROVINSI KALIMANTAN UTARA');
      const titleText = parseText(titleEl?.text || 'SERTIFIKAT');
      const nomorText = parseText(nomorEl?.text || 'Nomor : {{nomor}}');
      const labelToText = parseText(labelToEl?.text || 'Diberikan kepada:');
      const paragraphText = parseText(paragraphEl?.text || 'Atas partisipasinya dalam {{kursus}} yang diselenggarakan oleh Badan Pengembangan Sumber Daya Manusia Provinsi Kalimantan Utara pada tanggal {{tanggal}} secara daring yang meliputi {{jp}} Jam Pelajaran.');
      const sigDateText = parseText(sigDateEl?.text || 'Tanjung Selor, {{tanggal_terbit}}');

      const rawTableText = parseText(tableEl?.text || 'Nama : {{nama}}\nNIP/NIK : {{nip}}\nInstansi : {{instansi}}');
      const tableLines = rawTableText.split('\n').map(l => l.trim()).filter(Boolean);
      const identityRowsHtml = tableLines.map(line => {
        const colonIdx = line.indexOf(':');
        const label = colonIdx === -1 ? line : line.slice(0, colonIdx).trim();
        const value = colonIdx === -1 ? '' : line.slice(colonIdx + 1).trim();
        const isName = label.toLowerCase().includes('nama');
        return `
          <tr style="vertical-align: top;">
            <td style="width: 170px; white-space: nowrap; padding: 2.5px 0; text-align: left; color: #000000;">${label}</td>
            <td style="width: 18px; white-space: nowrap; text-align: center; color: #000000;">:</td>
            <td style="text-align: left; padding: 2.5px 0; color: #000000; ${isName ? 'font-weight: 500;' : ''}">${value}</td>
          </tr>
        `;
      }).join('');

      const isLandscape = orientation === 'landscape';
      const sigDateY = typeof sigDateEl?.y === 'number' ? sigDateEl.y : (Number(sigDateEl?.y) || 0);
      const sigMarginTop = sigDateY > 45 
        ? `${Math.max(12, (sigDateY - 42) * 1.5)}mm` 
        : (isLandscape ? '10px' : '36px');
      
      const kopFontSize = kopEl?.fontSize ? `${Number(kopEl.fontSize) * 0.9}pt` : (isLandscape ? '12pt' : '14pt');
      const titleFontSize = titleEl?.fontSize ? `${Number(titleEl.fontSize) * 0.8}pt` : (isLandscape ? '22pt' : '25pt');
      const nomorFontSize = nomorEl?.fontSize ? `${Number(nomorEl.fontSize) * 0.85}pt` : (isLandscape ? '11pt' : '12pt');
      const labelToFontSize = labelToEl?.fontSize ? `${Number(labelToEl.fontSize) * 0.85}pt` : (isLandscape ? '11pt' : '12pt');
      const tableFontSize = tableEl?.fontSize ? `${Number(tableEl.fontSize) * 0.85}pt` : (isLandscape ? '11pt' : '12pt');
      const paragraphFontSize = paragraphEl?.fontSize ? `${Number(paragraphEl.fontSize) * 0.85}pt` : (isLandscape ? '11pt' : '12pt');
      const sigDateFontSize = sigDateEl?.fontSize ? `${Number(sigDateEl.fontSize) * 0.85}pt` : (isLandscape ? '11pt' : '12pt');

      return `
        <div style="width:${isLandscape ? '297mm' : '210mm'};height:${isLandscape ? '210mm' : '297mm'};box-sizing:border-box;padding:${isLandscape ? '16mm 25.4mm 16mm 25.4mm' : '23.4mm 25.4mm 18mm 25.4mm'};position:relative;font-family:'Bookman Old Style','Bookman','URW Bookman L','Palatino',Georgia,serif;color:#000000;background:#ffffff;">
          <img src="${logoDataUri}" alt="Logo Pemprov Kaltara" style="width:${isLandscape ? '20mm' : '23mm'};height:${isLandscape ? '20mm' : '23mm'};display:block;margin:0 auto ${isLandscape ? '8px' : '12px'} auto;object-fit:contain;" />
          
          <div style="font-size:${kopFontSize};font-weight:bold;text-align:center;line-height:1.25;margin:0 0 ${isLandscape ? '14px' : '24px'} 0;text-transform:uppercase;letter-spacing:0.2px;color:#000000;white-space:pre-line;">
            ${kopText}
          </div>

          <div style="font-size:${titleFontSize};font-weight:bold;text-align:center;margin:0 0 ${isLandscape ? '4px' : '6px'} 0;letter-spacing:0.5px;color:#000000;">
            ${titleText}
          </div>

          <div style="font-size:${nomorFontSize};text-align:center;margin:0 0 ${isLandscape ? '16px' : '28px'} 0;color:#000000;">
            ${nomorText}
          </div>

          <div style="font-size:${labelToFontSize};text-align:center;margin:0 0 ${isLandscape ? '12px' : '20px'} 0;color:#000000;">
            ${labelToText}
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:${tableFontSize};margin-bottom:${isLandscape ? '14px' : '24px'};">
            <tbody>
              ${identityRowsHtml}
            </tbody>
          </table>

          <div style="font-size:${paragraphFontSize};line-height:1.45;text-align:justify;margin-bottom:${isLandscape ? '18px' : '30px'};color:#000000;">
            ${paragraphText}
          </div>

          <div style="width:100%;display:flex;justify-content:flex-end;margin-top:${sigMarginTop};">
            <div style="width:${isLandscape ? '70mm' : '74mm'};display:flex;flex-direction:column;align-items:flex-start;text-align:left;">
              <div style="font-size:${sigDateFontSize};margin-bottom:6px;text-align:left;width:100%;color:#000000;">${sigDateText}</div>
              <img src="${sigDataUri}" alt="TTE Resmi BPSDM" style="width:${isLandscape ? '70mm' : '73.8mm'};height:${isLandscape ? '24mm' : '25.4mm'};display:block;object-fit:contain;object-position:left;" />
            </div>
          </div>

          <div style="position:absolute;bottom:${isLandscape ? '10mm' : '16mm'};left:0;right:0;text-align:center;">
            <img src="${BSRE_FOOTER_DATA_URI}" alt="BSrE BSSN" style="height:9.8mm;max-width:114mm;display:inline-block;" />
          </div>
        </div>
      `;
    };

    const [elementsHtml, page2ElementsHtml, bgDataUri, page2BgDataUri] = await Promise.all([
      templateUrl ? renderElements(elements) : renderStructuredNaskahDinasHtml(elements),
      page2Enabled ? (page2TemplateUrl ? renderElements(page2Elements) : renderStructuredNaskahDinasHtml(page2Elements)) : Promise.resolve(''),
      toDataUri(templateUrl),
      toDataUri(page2TemplateUrl),
    ]);

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

    const renderCertificatePage = (content: string, background: string | null, verification: boolean) =>
      `<section class="certificate" style="background-image:${background ? `url(&quot;${background}&quot;)` : 'none'}">${content}${verification && background ? `<div class="verification">Nomor: ${escapeHtml(certificate.certificateNumber)} · Verifikasi: ${escapeHtml(verificationUrl)}</div>` : ''}</section>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sertifikat ${webinarCertificate ? 'Webinar' : 'Kursus'}</title>
      <style>
        ${fontFaceCss}
        @page{size:A4 ${orientation};margin:0}
        *,*::before,*::after{box-sizing:border-box}
        html,body{margin:0;padding:0;width:${orientation === 'landscape' ? '297mm' : '210mm'};height:${orientation === 'landscape' ? '210mm' : '297mm'};font-family:'Bookman Old Style','Bookman',serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .certificate{position:relative;width:${orientation === 'landscape' ? '297mm' : '210mm'};height:${orientation === 'landscape' ? '210mm' : '297mm'};background-size:100% 100%;background-repeat:no-repeat;break-after:page;page-break-after:always;overflow:hidden}
        .certificate:last-child{break-after:auto;page-break-after:auto}
        .verification{position:absolute;left:4%;right:4%;bottom:2%;font:10px Arial,sans-serif;color:#374151;text-align:center;overflow-wrap:anywhere}
      </style>
      </head><body>${renderCertificatePage(elementsHtml, bgDataUri, true)}${page2Enabled ? renderCertificatePage(page2ElementsHtml, page2BgDataUri, false) : ''}</body></html>`;

    const pdf = await withBrowserPage(async (page) => {
      await page.setViewport({ width, height, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: ['load', 'networkidle0'], timeout: 20_000 });
      await page.evaluateHandle('document.fonts.ready');
      return await page.pdf({
        format: 'A4',
        landscape: orientation === 'landscape',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
    });

    // Simpan hasil cetak ke disk server agar pemanggilan berikutnya 0% beban CPU (kecuali sesi uji coba)
    if (!isTest) {
      try {
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        fs.writeFileSync(cachedFilePath, pdf);
      } catch (saveErr) {
        console.warn('Gagal menyimpan cache PDF ke disk:', saveErr);
      }
    }

    return new NextResponse(pdf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeCertFilename.replace(/"/g, '')}"; filename*=UTF-8''${encodedTitle}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-PDF-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: 'Gagal memproses sertifikat PDF.' }, { status: 500 });
  }
}
