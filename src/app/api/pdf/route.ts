import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import puppeteer, { type Browser } from 'puppeteer';
import { sql } from '@/lib/db';
import { getAuthSession } from '@/app/actions/auth';
import { getWebinarCertificateForDownload, reserveCertificateDownload, getCertificateByVerificationToken, formatWebinarCertificateFilename } from '@/lib/webinar-certificates';
import { getCourseCertificateForDownload, reserveCourseCertificateDownload } from '@/lib/course-certificates';

export const runtime = 'nodejs';

type TemplateElement = {
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
  let browser: Browser | null = null;
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

    const isWebinar = data.type === 'webinar_certificate';
    const isCourse = data.type === 'course_certificate';
    if (!isWebinar && !isCourse) return NextResponse.json({ error: 'Permintaan sertifikat tidak valid.' }, { status: 400 });

    let webinarCertificate = null;
    let courseCertificate = null;

    if (token) {
      const certFromToken = await getCertificateByVerificationToken(token);
      if (certFromToken && !certFromToken.revokedAt) {
        webinarCertificate = certFromToken;
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

    const config = activeConfig;
    const orientation = config.orientation === 'portrait' ? 'portrait' : 'landscape';
    const templateUrl = allowedAssetUrl(config.templateUrl);
    const elements = Array.isArray(config.elements) ? config.elements as TemplateElement[] : [];
    const page2 = config.page2 && typeof config.page2 === 'object' ? config.page2 as Record<string, unknown> : null;
    const page2Enabled = page2?.enabled === true;
    const page2TemplateUrl = page2Enabled ? allowedAssetUrl(page2?.templateUrl) : null;
    const page2Elements = page2Enabled && Array.isArray(page2?.elements) ? page2.elements as TemplateElement[] : [];

    // Setup filename
    const safeCertFilename = webinarCertificate
      ? formatWebinarCertificateFilename({
          participantName: certificate.participantName,
          certificateNumber: certificate.certificateNumber,
          category: 'Yang Lain',
        })
      : `Sertifikat-${certificate.activityTitle}.pdf`.replace(/[/\\?%*:|"<>]/g, '_');
    const encodedTitle = encodeURIComponent(safeCertFilename);

    // Disk Cache check: jika PDF sudah pernah dicetak dan template belum berubah, kirim langsung dari disk (tanpa throttle Puppeteer)
    const templateHash = crypto
      .createHash('md5')
      .update(JSON.stringify(config))
      .digest('hex')
      .slice(0, 10);
    const cacheDir = path.join(process.cwd(), '.cache', 'certificates');
    const cachedFilePath = path.join(cacheDir, `${certificate.id}_${templateHash}.pdf`);

    if (fs.existsSync(cachedFilePath)) {
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

    // Hanya throttle jika belum di-cache (akan memanggil Puppeteer yang berat)
    const downloadReserved = webinarCertificate
      ? await reserveCertificateDownload(certificate.id)
      : await reserveCourseCertificateDownload(certificate.id);
    if (!downloadReserved) {
      return NextResponse.json({ error: 'Tunggu beberapa detik sebelum mengunduh ulang.' }, { status: 429 });
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

        return `<div style="${baseStyle}font-size:${computedFontSizePx}px;font-family:${fontFamily};font-weight:${fontWeight};color:${safeColor(element.color)};${justifyCss}white-space:pre-wrap;line-height:1.4;">${parseText(element.text)}</div>`;
      }));
      return rendered.join('');
    };

    const [elementsHtml, page2ElementsHtml, bgDataUri, page2BgDataUri] = await Promise.all([
      renderElements(elements),
      renderElements(page2Elements),
      toDataUri(templateUrl),
      toDataUri(page2TemplateUrl),
    ]);

    let fontFaceCss = '';
    try {
      const regPath = 'C:/Windows/Fonts/BOOKOS.TTF';
      const bldPath = 'C:/Windows/Fonts/BOOKOSB.TTF';
      if (fs.existsSync(regPath) && fs.existsSync(bldPath)) {
        const regB64 = fs.readFileSync(regPath).toString('base64');
        const bldB64 = fs.readFileSync(bldPath).toString('base64');
        fontFaceCss = `
          @font-face {
            font-family: 'Bookman Old Style';
            src: url(data:font/truetype;charset=utf-8;base64,${regB64}) format('truetype');
            font-weight: normal;
            font-style: normal;
          }
          @font-face {
            font-family: 'Bookman Old Style';
            src: url(data:font/truetype;charset=utf-8;base64,${bldB64}) format('truetype');
            font-weight: bold;
            font-style: normal;
          }
        `;
      }
    } catch {
      // Fallback to system fonts
    }

    const renderCertificatePage = (content: string, background: string | null, verification: boolean) =>
      `<section class="certificate" style="background-image:${background ? `url(&quot;${background}&quot;)` : 'none'}">${content}${verification ? `<div class="verification">Nomor: ${escapeHtml(certificate.certificateNumber)} · Verifikasi: ${escapeHtml(verificationUrl)}</div>` : ''}</section>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sertifikat ${webinarCertificate ? 'Webinar' : 'Kursus'}</title>
      <style>
        ${fontFaceCss}
        @page{size:${width}px ${height}px;margin:0}
        html,body{margin:0;padding:0;width:${width}px;height:${height}px;font-family:'Bookman Old Style','Bookman',serif;background:#fff}
        .certificate{position:relative;width:${width}px;height:${height}px;background-size:100% 100%;background-repeat:no-repeat;break-after:page;page-break-after:always}
        .certificate:last-child{break-after:auto;page-break-after:auto}
        .verification{position:absolute;left:4%;right:4%;bottom:2%;font:10px Arial,sans-serif;color:#374151;text-align:center;overflow-wrap:anywhere}
      </style>
      </head><body>${renderCertificatePage(elementsHtml, bgDataUri, true)}${page2Enabled ? renderCertificatePage(page2ElementsHtml, page2BgDataUri, false) : ''}</body></html>`;

    const args = process.env.PUPPETEER_DISABLE_SANDBOX === 'true'
      ? ['--no-sandbox', '--disable-setuid-sandbox']
      : [];
    browser = await puppeteer.launch({ headless: true, args });
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'load', timeout: 20_000 });
    const pdf = await page.pdf({ width: `${width}px`, height: `${height}px`, landscape: orientation === 'landscape', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });

    // Simpan hasil cetak ke disk server agar pemanggilan berikutnya 0% beban CPU
    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(cachedFilePath, pdf);
    } catch (saveErr) {
      console.warn('Gagal menyimpan cache PDF ke disk:', saveErr);
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
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
