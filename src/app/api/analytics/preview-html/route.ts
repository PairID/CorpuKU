import { NextResponse } from 'next/server';
import { getAuthSession } from '@/app/actions/auth';
import { generateReportHTML } from '@/lib/report-template';

export async function GET() {
    try {
        const session = await getAuthSession();
        if (!session || session.user.role !== 'admin') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const htmlContent = await generateReportHTML();

        return new NextResponse(htmlContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
            },
        });
    } catch (error: unknown) {
        console.error("HTML Preview Error:", error);
        return new NextResponse('Gagal membuat pratinjau laporan.', { status: 500 });
    }
}
