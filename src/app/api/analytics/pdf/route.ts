import { NextResponse } from 'next/server';
import { getAuthSession } from '@/app/actions/auth';
import { generateReportHTML } from '@/lib/report-template';
import { withBrowserPage } from '@/lib/puppeteer';

export async function GET() {
    try {
        const session = await getAuthSession();
        if (!session || session.user.role !== 'admin') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const htmlContent = await generateReportHTML();

        const pdfBuffer = await withBrowserPage(async (page) => {
            await page.setContent(htmlContent, { 
                waitUntil: ['load', 'networkidle0'],
                timeout: 20_000,
            });
            await page.evaluateHandle('document.fonts.ready');

            return await page.pdf({
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });
        });

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
