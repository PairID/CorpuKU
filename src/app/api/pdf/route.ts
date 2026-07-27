import { NextResponse } from 'next/server';
import puppeteer, { type Browser } from 'puppeteer';
import { getAuthSession } from '@/app/actions/auth';
import { getWebinarCertificateForDownload, reserveCertificateDownload } from '@/lib/webinar-certificates';
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

    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body: unknown = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload tidak valid.' }, { status: 400 });
    }
    const data = body as Record<string, unknown>;
    const isWebinar = data.type === 'webinar_certificate' && typeof data.webinarId === 'string' && data.webinarId.length <= 255;
    const isCourse = data.type === 'course_certificate' && typeof data.courseId === 'string' && data.courseId.length <= 255;
    if (!isWebinar && !isCourse) return NextResponse.json({ error: 'Permintaan sertifikat tidak valid.' }, { status: 400 });

    const webinarCertificate = isWebinar
      ? await getWebinarCertificateForDownload(session.user.id, String(data.webinarId))
      : null;
    const courseCertificate = isCourse
      ? await getCourseCertificateForDownload(session.user.id, String(data.courseId))
      : null;
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
    const downloadReserved = webinarCertificate
      ? await reserveCertificateDownload(certificate.id)
      : await reserveCourseCertificateDownload(certificate.id);
    if (!downloadReserved) {
      return NextResponse.json({ error: 'Tunggu beberapa detik sebelum mengunduh ulang.' }, { status: 429 });
    }

    const config = certificate.templateSettings && typeof certificate.templateSettings === 'object'
      ? certificate.templateSettings as Record<string, unknown>
      : {};
    const orientation = config.orientation === 'portrait' ? 'portrait' : 'landscape';
    const templateUrl = allowedAssetUrl(config.templateUrl);
    const elements = Array.isArray(config.elements) ? config.elements as TemplateElement[] : [];
    const page2 = config.page2 && typeof config.page2 === 'object' ? config.page2 as Record<string, unknown> : null;
    const page2Enabled = page2?.enabled === true;
    const page2TemplateUrl = page2Enabled ? allowedAssetUrl(page2?.templateUrl) : null;
    const page2Elements = page2Enabled && Array.isArray(page2?.elements) ? page2.elements as TemplateElement[] : [];

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

    const renderElements = (source: TemplateElement[]) => source.slice(0, 100).map(element => {
      const isImage = element.type === 'image';
      const x = boundedNumber(element.x, 50, 0, 100);
      const y = boundedNumber(element.y, 50, 0, 100);
      const width = boundedNumber(element.width, 80, 1, 100);
      const height = boundedNumber(element.height, 20, 1, 100);
      const baseStyle = `position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);width:${width}%;`;

      if (isImage) {
        const imageUrl = allowedAssetUrl(element.imageUrl);
        if (!imageUrl) return '';
        return `<div style="${baseStyle}height:${height}%;"><img src="${escapeHtml(imageUrl)}" alt="" style="width:100%;height:100%;object-fit:contain;" /></div>`;
      }

      const fontSize = boundedNumber(element.fontSize, 24, 8, 96);
      const fontWeight = ['normal', 'bold', '400', '500', '600', '700'].includes(String(element.fontWeight)) ? String(element.fontWeight) : 'normal';
      const fontFamily = element.fontFamily === 'bookman' ? 'Georgia, serif' : 'Arial, sans-serif';
      return `<div style="${baseStyle}font-size:${(fontSize / 800) * 1123}px;font-family:${fontFamily};font-weight:${fontWeight};color:${safeColor(element.color)};text-align:${safeTextAlign(element.textAlign)};white-space:pre-wrap;line-height:1.4;">${parseText(element.text)}</div>`;
    }).join('');
    const elementsHtml = renderElements(elements);
    const page2ElementsHtml = renderElements(page2Elements);

    const width = orientation === 'landscape' ? 1123 : 794;
    const height = orientation === 'landscape' ? 794 : 1123;
    const renderCertificatePage = (content: string, background: string | null, verification: boolean) =>
      `<section class="certificate" style="background-image:${background ? `url(&quot;${escapeHtml(background)}&quot;)` : 'none'}">${content}${verification ? `<div class="verification">Nomor: ${escapeHtml(certificate.certificateNumber)} · Verifikasi: ${escapeHtml(verificationUrl)}</div>` : ''}</section>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sertifikat ${webinarCertificate ? 'Webinar' : 'Kursus'}</title>
      <style>@page{size:${width}px ${height}px;margin:0}html,body{margin:0;padding:0;width:${width}px;font-family:Arial,sans-serif;background:#fff}.certificate{position:relative;width:${width}px;height:${height}px;background-size:100% 100%;background-repeat:no-repeat;break-after:page;page-break-after:always}.certificate:last-child{break-after:auto;page-break-after:auto}.verification{position:absolute;left:4%;right:4%;bottom:2%;font:10px Arial,sans-serif;color:#374151;text-align:center;overflow-wrap:anywhere}</style>
      </head><body>${renderCertificatePage(elementsHtml, templateUrl, true)}${page2Enabled ? renderCertificatePage(page2ElementsHtml, page2TemplateUrl, false) : ''}</body></html>`;

    const args = process.env.PUPPETEER_DISABLE_SANDBOX === 'true'
      ? ['--no-sandbox', '--disable-setuid-sandbox']
      : [];
    browser = await puppeteer.launch({ headless: true, args });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      if (url === 'about:blank' || allowedAssetUrl(url)) request.continue();
      else request.abort();
    });
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20_000 });
    const pdf = await page.pdf({ width: `${width}px`, height: `${height}px`, landscape: orientation === 'landscape', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });

    const encodedTitle = encodeURIComponent(`Sertifikat-${certificate.activityTitle}.pdf`);
    return new NextResponse(pdf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sertifikat.pdf"; filename*=UTF-8''${encodedTitle}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: 'Gagal memproses sertifikat PDF.' }, { status: 500 });
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
