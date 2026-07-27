import { getAnalyticsMetrics, getInstansiCompliance } from "@/app/actions/analytics";
import { getDetailedStudentReport } from "@/app/actions/reports";

function escapeHtml(text: unknown): string {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export async function generateReportHTML(): Promise<string> {
    const stats = await getAnalyticsMetrics();
    const compliance = await getInstansiCompliance();
    const detailedReport = await getDetailedStudentReport();

    const dateStr = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date());

    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>Laporan Analitik CorpuKU</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
            
            body {
                font-family: 'Inter', sans-serif;
                color: #0f172a;
                margin: 0;
                padding: 40px;
                background: white;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #0f172a;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .header h1 {
                font-family: 'Playfair Display', serif;
                color: #0f172a;
                margin: 0 0 10px 0;
                font-size: 28px;
            }
            .header p {
                margin: 0;
                color: #475569;
                font-size: 14px;
            }
            .section-title {
                font-family: 'Playfair Display', serif;
                color: #eab308;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 8px;
                margin-top: 30px;
                margin-bottom: 15px;
                font-size: 18px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                font-size: 12px;
            }
            th, td {
                padding: 10px 12px;
                text-align: left;
                border-bottom: 1px solid #e2e8f0;
            }
            th {
                background-color: #f8fafc;
                color: #475569;
                font-weight: 600;
            }
            tr:hover {
                background-color: #f1f5f9;
            }
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                margin-bottom: 30px;
            }
            .metric-card {
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
                background: #f8fafc;
            }
            .metric-value {
                font-size: 24px;
                font-weight: 700;
                color: #0f172a;
                margin-bottom: 5px;
            }
            .metric-label {
                font-size: 11px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .footer {
                margin-top: 50px;
                display: flex;
                justify-content: flex-end;
            }
            .signature {
                text-align: center;
                width: 250px;
            }
            .signature-date {
                font-size: 12px;
                color: #475569;
                margin-bottom: 60px;
            }
            .signature-name {
                font-weight: 700;
                font-size: 14px;
                color: #0f172a;
                text-decoration: underline;
            }
            .signature-role {
                font-size: 11px;
                color: #64748b;
                margin-top: 2px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>LAPORAN ANALITIK KEBIJAKAN PENGEMBANGAN KOMPETENSI</h1>
            <p>CorpuKU Academy | Dicetak pada: ${escapeHtml(dateStr)}</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${stats.complianceRate}%</div>
                <div class="metric-label">Kepatuhan JP</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${stats.avgScore}</div>
                <div class="metric-label">Rata-rata Skor</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${stats.totalUsers}</div>
                <div class="metric-label">Total Peserta</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${stats.totalJp}</div>
                <div class="metric-label">Total JP Terkumpul</div>
            </div>
        </div>

        <h2 class="section-title">Perangkat Daerah Teratas</h2>
        <table>
            <thead>
                <tr>
                    <th>No</th>
                    <th>Instansi / Perangkat Daerah</th>
                    <th>Persentase Kepatuhan</th>
                    <th>Total JP</th>
                </tr>
            </thead>
            <tbody>
                ${compliance.top.slice(0, 5).map((agency, i: number) => `
                <tr>
                    <td>${i + 1}</td>
                    <td style="font-weight: 600;">${escapeHtml(agency.name)}</td>
                    <td style="color: #10b981; font-weight: 600;">${agency.compliance}%</td>
                    <td>${agency.totalJp.toLocaleString()} JP</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- Break page if needed -->
        <div style="page-break-before: always;"></div>

        <h2 class="section-title">Rekapitulasi Pelatihan Siswa (Terbaru)</h2>
        <table>
            <thead>
                <tr>
                    <th>Nama & NIP</th>
                    <th>Instansi</th>
                    <th>Kursus</th>
                    <th>Progress</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${detailedReport.slice(0, 20).map((r) => `
                <tr>
                    <td>
                        <div style="font-weight: 600;">${escapeHtml(r["Nama Lengkap"])}</div>
                        <div style="font-size: 10px; color: #64748b;">${escapeHtml(r.NIP) || '-'}</div>
                    </td>
                    <td>${escapeHtml(r.Instansi) || '-'}</td>
                    <td>${escapeHtml(r["Judul Kursus"])}</td>
                    <td>
                        <div style="background: #e2e8f0; height: 6px; width: 100%; border-radius: 3px; overflow: hidden; margin-top: 5px;">
                            <div style="background: #eab308; height: 100%; width: ${r["Progress (%)"]}%;"></div>
                        </div>
                        <div style="font-size: 10px; margin-top: 2px;">${r["Progress (%)"]}%</div>
                    </td>
                    <td>${escapeHtml(r.Status)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ${detailedReport.length > 20 ? `<p style="font-size: 11px; text-align: center; color: #64748b; margin-top: 10px;">Menampilkan 20 data terbaru dari total ${detailedReport.length} data.</p>` : ''}

        <div class="footer">
            <div class="signature">
                <div class="signature-date">Tanjung Selor, ${escapeHtml(dateStr)}</div>
                <div class="signature-name">Administrator CorpuKU</div>
                <div class="signature-role">Badan Pengembangan Sumber Daya Manusia</div>
            </div>
        </div>
    </body>
    </html>
    `;
}
