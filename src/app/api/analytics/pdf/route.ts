import { NextResponse } from 'next/server';
import { getAuthSession } from '@/app/actions/auth';
import { generateReportHTML } from '@/lib/report-template';
import puppeteer from 'puppeteer';
import fs from 'fs';

export async function GET() {
    try {
        const session = await getAuthSession();
        if (!session || session.user.role !== 'admin') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const htmlContent = await generateReportHTML();

        const defaultLinuxChromium = ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome-stable']
            .find(path => fs.existsSync(path));
        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || defaultLinuxChromium || undefined;

        // Launch puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            executablePath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--font-render-hinting=none',
            ]
        });
        
        const page = await browser.newPage();
        
        // Wait for fonts to load
        await page.setContent(htmlContent, { 
            waitUntil: ['load', 'networkidle0'] 
        });

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });

        await browser.close();

        // Return PDF response
        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Laporan_CorpuKU_${new Date().toISOString().split('T')[0]}.pdf"`,
            },
        });
    } catch (error: unknown) {
        console.error("PDF Generation Error:", error);
        return new NextResponse('Gagal membuat laporan PDF.', { status: 500 });
    }
}
