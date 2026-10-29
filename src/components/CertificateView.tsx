import React from 'react';
import Image from 'next/image';
import {
    KALTARA_LOGO_DATA_URI,
    BSRE_FOOTER_DATA_URI,
    OFFICIAL_TTE_BOX_DATA_URI,
    BOOKMAN_REGULAR_BASE64,
    BOOKMAN_BOLD_BASE64,
} from '@/lib/certificate-assets';

export interface CertificateData {
    certificateNumber: string;
    date: string; // kept for backward compat (same as issueDate)
    issueDate?: string; // tanggal terbit sertifikat
    activityDate?: string; // tanggal pelaksanaan kegiatan
    studentName: string;
    nip?: string;
    grade?: string; // Pangkat/Golongan
    position?: string; // Jabatan
    institution?: string; // Instansi
    courseName: string;
    hours?: number; // JP
    templateUrl?: string | null;
    certificateType?: "sertifikat" | "surat_keterangan" | "sttp";
    birthPlace?: string; // Tempat lahir
    birthDate?: string; // Tanggal lahir
    photoUrl?: string; // URL foto peserta (3x4)
}

export interface TextElement {
    id: string;
    type?: "text" | "image"; // defaults to "text" for backward compat
    text: string;
    imageUrl?: string; // Base64 or URL for image elements
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    color: string;
    textAlign: "left" | "center" | "right" | "justify";
    width: number;
    height?: number; // Height in % for image elements
}

export interface Page2Config {
    enabled: boolean;
    templateUrl: string | null;
    elements: TextElement[];
}

export interface CertificateTypeConfig {
    templateUrl: string | null;
    orientation?: "landscape" | "portrait";
    elements: TextElement[];
    page2?: Page2Config;
}

interface Props {
    data: CertificateData;
    config?: CertificateTypeConfig; // The config for the specific type
}

// Fallback config if none provided
const DEFAULT_CONFIG: CertificateTypeConfig = {
    templateUrl: null,
    orientation: "landscape",
    elements: [
        { id: "e1", text: "Sertifikat Kompetensi", x: 50, y: 15, fontSize: 36, fontFamily: "bookman", fontWeight: "bold", color: "#000000", textAlign: "center", width: 80 },
        { id: "e2", text: "Nomor: {{nomor}}", x: 50, y: 25, fontSize: 12, fontFamily: "bookman", fontWeight: "normal", color: "#000000", textAlign: "center", width: 80 },
        { id: "e3", text: "Diberikan kepada:", x: 50, y: 35, fontSize: 12, fontFamily: "bookman", fontWeight: "normal", color: "#000000", textAlign: "center", width: 80 },
        { id: "e4", text: "{{nama}}", x: 50, y: 45, fontSize: 24, fontFamily: "bookman", fontWeight: "bold", color: "#000000", textAlign: "center", width: 80 },
        { id: "e5", text: "NIP: {{nip}}\n{{pangkat}}\n{{jabatan}}\n{{instansi}}", x: 50, y: 60, fontSize: 12, fontFamily: "bookman", fontWeight: "normal", color: "#000000", textAlign: "center", width: 80 },
        { id: "e6", text: "KARENA TELAH MENYELESAIKAN\n{{kursus}}\nBeban: {{jp}} JP", x: 50, y: 75, fontSize: 12, fontFamily: "bookman", fontWeight: "bold", color: "#000000", textAlign: "center", width: 80 },
        { id: "e7", text: "Tanjung Selor, {{tanggal_terbit}}", x: 80, y: 85, fontSize: 12, fontFamily: "bookman", fontWeight: "normal", color: "#000000", textAlign: "center", width: 30 },
    ],
    page2: { enabled: false, templateUrl: null, elements: [] }
};

export const CertificateView: React.FC<Props> = ({ data, config = DEFAULT_CONFIG }) => {
    const orientation = config.orientation || "landscape";
    const isPortrait = orientation === "portrait";
    // Landscape = A4 landscape (1.414:1), Portrait = A4 portrait (1:1.414)
    const aspectRatio = isPortrait ? '1 / 1.414' : '1.414 / 1';

    const hasCustomTemplate = !!config.templateUrl || !!data.templateUrl;
    const bgUrl = data.templateUrl || config.templateUrl;

    const hasPage2 = config.page2?.enabled && config.page2;
    const page2BgUrl = config.page2?.templateUrl;

    // Helper to replace tags like Autocrat does
    const parseText = (rawText: string | undefined | null) => {
        if (!rawText || typeof rawText !== "string") return "";
        let txt = rawText;
        txt = txt.replace(/\{\{nomor\}\}/g, data.certificateNumber || "");
        txt = txt.replace(/\{\{tanggal_terbit\}\}/g, data.issueDate || data.date || "");
        txt = txt.replace(/\{\{tanggal_kegiatan\}\}/g, data.activityDate || "");
        txt = txt.replace(/\{\{tanggal\}\}/g, data.issueDate || data.date || ""); // backward compat
        txt = txt.replace(/\{\{nama\}\}/g, data.studentName || "");
        txt = txt.replace(/\{\{nip\}\}/g, data.nip || "-");
        txt = txt.replace(/\{\{pangkat\}\}/g, data.grade || "-");
        txt = txt.replace(/\{\{jabatan\}\}/g, data.position || "-");
        txt = txt.replace(/\{\{instansi\}\}/g, data.institution || "-");
        txt = txt.replace(/\{\{kursus\}\}/g, data.courseName || "");
        txt = txt.replace(/\{\{jp\}\}/g, (data.hours || 0).toString());
        
        // Birth data
        const ttl = [data.birthPlace, data.birthDate].filter(Boolean).join(", ");
        txt = txt.replace(/\{\{ttl\}\}/g, ttl || "-");
        txt = txt.replace(/\{\{tempat_lahir\}\}/g, data.birthPlace || "-");
        txt = txt.replace(/\{\{tanggal_lahir\}\}/g, data.birthDate || "-");

        return txt;
    };

    const renderElements = (elements: TextElement[] = []) => (
        elements.map((el) => {
            const isImage = el.type === 'image';
            
            if (isImage && el.imageUrl) {
                const isStudentPhoto = el.imageUrl === '{{foto}}';
                const finalImageUrl = isStudentPhoto ? (data.photoUrl || 'https://via.placeholder.com/300x400?text=Foto+3x4') : el.imageUrl;

                return (
                    <div 
                        key={el.id}
                        className="absolute"
                        style={{
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            transform: 'translate(-50%, -50%)',
                            width: el.width ? `${el.width}%` : 'auto',
                            height: el.height ? `${el.height}%` : 'auto',
                            aspectRatio: isStudentPhoto ? '3/4' : 'auto',
                            border: isStudentPhoto && !data.photoUrl ? '1px dashed #ccc' : 'none',
                        }}
                    >
                        <Image
                            src={finalImageUrl} 
                            alt={el.text || 'Certificate image'}
                            fill
                            sizes="100vw"
                            unoptimized
                            className="object-cover"
                            style={{ 
                                maxWidth: '100%', 
                                maxHeight: '100%',
                            }}
                        />
                    </div>
                );
            }

            const parsedRaw = parseText(el.text);
            const lines = parsedRaw.split('\n').map(l => l.trim()).filter(Boolean);
            const isKeyValueTable = lines.length >= 2 && lines.every(l => l.includes(':'));

            if (isKeyValueTable) {
                const rows = lines.map(line => {
                    const colonIdx = line.indexOf(':');
                    return {
                        label: line.slice(0, colonIdx).trim(),
                        value: line.slice(colonIdx + 1).trim(),
                    };
                });

                return (
                    <div
                        key={el.id}
                        className="absolute"
                        style={{
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            transform: 'translate(-50%, -50%)',
                            width: el.width ? `${el.width}%` : 'auto',
                            fontSize: `${(el.fontSize / 800) * 100}cqi`,
                            fontFamily: el.fontFamily === 'bookman' ? '"Bookman Old Style", "Bookman", "URW Bookman L", "Palatino", serif' : el.fontFamily === 'serif' ? 'Georgia, serif' : el.fontFamily === 'mono' ? 'monospace' : 'Inter, sans-serif',
                            fontWeight: el.fontWeight,
                            color: el.color,
                            lineHeight: '1.4'
                        }}
                    >
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                            <tbody>
                                {rows.map((row, idx) => (
                                    <tr key={idx} style={{ verticalAlign: 'top' }}>
                                        <td style={{ width: '1%', whiteSpace: 'nowrap', paddingRight: '1.5em', textAlign: 'left', fontWeight: 'inherit', color: 'inherit' }}>
                                            {row.label}
                                        </td>
                                        <td style={{ width: '1%', whiteSpace: 'nowrap', paddingRight: '1.5em', textAlign: 'center', fontWeight: 'inherit', color: 'inherit' }}>
                                            :
                                        </td>
                                        <td style={{ width: 'auto', textAlign: 'left', fontWeight: 'inherit', color: 'inherit' }}>
                                            {row.value}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }

            return (
                <div 
                    key={el.id}
                    className="absolute"
                    style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: el.width ? `${el.width}%` : 'auto',
                        fontSize: `${(el.fontSize / 800) * 100}cqi`,
                        fontFamily: el.fontFamily === 'bookman' ? '"Bookman Old Style", "Bookman", "URW Bookman L", "Palatino", serif' : el.fontFamily === 'serif' ? 'Georgia, serif' : el.fontFamily === 'mono' ? 'monospace' : 'Inter, sans-serif',
                        fontWeight: el.fontWeight,
                        color: el.color,
                        textAlign: el.textAlign,
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.4'
                    }}
                >
                    {parsedRaw}
                </div>
            );
        })
    );

    const renderStructuredNaskahDinas = (elements: TextElement[]) => {
        // Identifikasi elemen tanda tangan & logo secara tepat tanpa benturan penamaan
        const sigImgEl = elements.find(el => {
            if (el.type !== 'image') return false;
            const id = String(el.id || '').toLowerCase();
            const text = String(el.text || '').toLowerCase().trim();
            const url = String(el.imageUrl || '').toLowerCase();
            if (url.includes('pab59388nfffraedyngo') || id.includes('sig') || id.includes('tte')) return true;
            if (url.includes('tjvwh182kf3vlmctmsan') || id.includes('logo')) return false;
            if (text === 'tanda tangan' || text.startsWith('tte') || text === 'tanda tangan elektronik') return true;
            return false;
        });

        const logoEl = elements.find(el => {
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

        const logoUrl = (logoEl?.imageUrl && !logoEl.imageUrl.includes('pab59388nfffraedyngo')) ? logoEl.imageUrl : KALTARA_LOGO_DATA_URI;
        const sigUrl = (sigImgEl?.imageUrl && !sigImgEl.imageUrl.includes('tjvwh182kf3vlmctmsan')) ? sigImgEl.imageUrl : OFFICIAL_TTE_BOX_DATA_URI;

        const kopEl = elements.find(el => el.id === 'kop_1' || el.text?.includes('KEPALA BADAN'));
        const titleEl = elements.find(el => el.id === 'title_1' || el.text?.includes('SERTIFIKAT'));
        const nomorEl = elements.find(el => el.id === 'nomor_1' || el.text?.includes('Nomor'));
        const labelToEl = elements.find(el => el.id === 'label_to_1' || el.text?.includes('Diberikan'));
        const tableEl = elements.find(el => el.id === 'table_identitas_1' || el.text?.includes('Nama :'));
        const paragraphEl = elements.find(el => el.id === 'paragraph_1' || el.text?.includes('Atas partisipasinya'));
        const sigDateEl = elements.find(el => el.id === 'sig_date' || el.text?.includes('Tanjung Selor'));

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
            if (colonIdx === -1) return { label: line, value: '' };
            return {
                label: line.slice(0, colonIdx).trim(),
                value: line.slice(colonIdx + 1).trim(),
            };
        });

        const fontBookman = '"Bookman Old Style", "Bookman", "URW Bookman L", "Palatino", serif';

        return (
            <div 
                className="w-full h-full bg-white text-black relative select-none"
                style={{
                    aspectRatio,
                    containerType: 'inline-size',
                    fontFamily: fontBookman,
                    padding: isPortrait ? '11.14cqi 12.1cqi 8.57cqi 12.1cqi' : '5.38cqi 8.55cqi 5.38cqi 8.55cqi',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }}
            >
                {/* 1. LOGO PEMPROV */}
                <div 
                    className="relative mx-auto"
                    style={{ 
                        width: isPortrait ? '10.95cqi' : '6.73cqi', 
                        height: isPortrait ? '10.95cqi' : '6.73cqi',
                        marginBottom: isPortrait ? '1.5cqi' : '0.7cqi'
                    }}
                >
                    <Image 
                        src={logoUrl} 
                        alt="Logo Pemprov Kaltara" 
                        fill 
                        sizes="100vw"
                        unoptimized 
                        className="object-contain" 
                    />
                </div>

                {/* 2. KOP SURAT RESMI */}
                <div 
                    className="font-bold text-center uppercase whitespace-pre-line text-black leading-tight tracking-[0.2px]"
                    style={{ 
                        fontSize: isPortrait ? '2.35cqi' : '1.42cqi',
                        marginBottom: isPortrait ? '3.0cqi' : '1.25cqi'
                    }}
                >
                    {kopText}
                </div>

                {/* 3. JUDUL DOKUMEN & NOMOR */}
                <div 
                    className="font-bold text-center tracking-[0.5px] text-black"
                    style={{ 
                        fontSize: isPortrait ? '4.2cqi' : '2.61cqi',
                        marginBottom: isPortrait ? '0.75cqi' : '0.35cqi'
                    }}
                >
                    {titleText}
                </div>
                <div 
                    className="text-center text-black"
                    style={{ 
                        fontSize: isPortrait ? '2.01cqi' : '1.3cqi',
                        marginBottom: isPortrait ? '3.5cqi' : '1.4cqi'
                    }}
                >
                    {nomorText}
                </div>

                {/* 4. PENGANTAR */}
                <div 
                    className="text-center text-black"
                    style={{ 
                        fontSize: isPortrait ? '2.01cqi' : '1.3cqi',
                        marginBottom: isPortrait ? '2.5cqi' : '1.07cqi'
                    }}
                >
                    {labelToText}
                </div>

                {/* 5. TABEL IDENTITAS PESERTA */}
                <table 
                    className="w-full border-collapse"
                    style={{ 
                        fontSize: isPortrait ? '2.01cqi' : '1.3cqi',
                        marginBottom: isPortrait ? '3.0cqi' : '1.25cqi'
                    }}
                >
                    <tbody>
                        {identityRows.map((row, idx) => (
                            <tr key={idx} style={{ verticalAlign: 'top' }}>
                                <td 
                                    className="whitespace-nowrap text-left text-black" 
                                    style={{ 
                                        width: isPortrait ? '21.4cqi' : '15.1cqi',
                                        padding: '0.3cqi 0'
                                    }}
                                >
                                    {row.label}
                                </td>
                                <td 
                                    className="whitespace-nowrap text-center text-black" 
                                    style={{ 
                                        width: '2.26cqi',
                                        padding: '0.3cqi 0'
                                    }}
                                >
                                    :
                                </td>
                                <td 
                                    className="text-left text-black"
                                    style={{ 
                                        padding: '0.3cqi 0',
                                        fontWeight: row.label.toLowerCase().includes('nama') ? 600 : 'normal'
                                    }}
                                >
                                    {row.value}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* 6. PARAGRAF PARTISIPASI */}
                <div 
                    className="text-justify leading-[1.45] text-black"
                    style={{ 
                        fontSize: isPortrait ? '2.01cqi' : '1.3cqi',
                        marginBottom: isPortrait ? '3.78cqi' : '1.6cqi'
                    }}
                >
                    {paragraphText}
                </div>

                {/* 7. BLOK TTE KANAN */}
                <div 
                    className="w-full flex justify-end"
                    style={{ marginTop: isPortrait ? '1.25cqi' : '0.6cqi' }}
                >
                    <div 
                        className="flex flex-col items-start text-left"
                        style={{ width: isPortrait ? '35.2cqi' : '23.57cqi' }}
                    >
                        <div 
                            className="text-black text-left w-full"
                            style={{ 
                                fontSize: isPortrait ? '2.01cqi' : '1.3cqi',
                                marginBottom: isPortrait ? '0.75cqi' : '0.35cqi'
                            }}
                        >
                            {sigDateText}
                        </div>
                        <div 
                            className="relative"
                            style={{ 
                                width: isPortrait ? '35.14cqi' : '23.57cqi', 
                                height: isPortrait ? '12.1cqi' : '8.08cqi' 
                            }}
                        >
                            <Image 
                                src={sigUrl} 
                                alt="TTE Resmi BPSDM" 
                                fill 
                                sizes="100vw"
                                unoptimized 
                                className="object-contain object-left" 
                            />
                        </div>
                    </div>
                </div>

                {/* 8. QR CODE VERIFIKASI */}
                <div 
                    className="absolute flex items-center gap-[1cqi]"
                    style={{ 
                        bottom: isPortrait ? '9.42cqi' : '6.06cqi', 
                        left: isPortrait ? '12.1cqi' : '8.55cqi'
                    }}
                >
                    <div 
                        className="relative bg-white border border-slate-300 p-[0.3cqi] flex items-center justify-center"
                        style={{ width: isPortrait ? '6.9cqi' : '4.8cqi', height: isPortrait ? '6.9cqi' : '4.8cqi' }}
                    >
                        <svg className="w-full h-full text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
                            <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
                            <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
                            <rect x="6" y="6" width="1" height="1" fill="currentColor" />
                            <rect x="17" y="6" width="1" height="1" fill="currentColor" />
                            <rect x="6" y="17" width="1" height="1" fill="currentColor" />
                            <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3v1h-3zM20 14h1v3h-1z" fill="currentColor" />
                        </svg>
                    </div>
                    <div 
                        className="text-slate-600 leading-tight"
                        style={{ fontSize: isPortrait ? '1.26cqi' : '0.85cqi' }}
                    >
                        <strong className="text-slate-900 block">Verifikasi Keaslian</strong>
                        Pindai untuk verifikasi dokumen resmi
                    </div>
                </div>

                {/* 9. BSrE FOOTER BANNER */}
                <div 
                    className="absolute left-0 right-0 text-center pointer-events-none"
                    style={{ bottom: isPortrait ? '5.38cqi' : '3.37cqi' }}
                >
                    <div 
                        className="relative mx-auto"
                        style={{ 
                            width: isPortrait ? '54.28cqi' : '38.38cqi', 
                            height: isPortrait ? '4.66cqi' : '3.3cqi' 
                        }}
                    >
                        <Image
                            src={BSRE_FOOTER_DATA_URI}
                            alt="BSrE BSSN"
                            fill
                            sizes="100vw"
                            unoptimized
                            className="object-contain"
                        />
                    </div>
                </div>
            </div>
        );
    };

    const renderPage = (bgImage: string | null | undefined, hasCustomBg: boolean, elements: TextElement[]) => {
        if (!hasCustomBg) {
            return renderStructuredNaskahDinas(elements);
        }

        return (
            <div 
                className="w-full bg-white dark:bg-[#161B2A] relative overflow-hidden flex flex-col"
                style={{
                    aspectRatio,
                    containerType: 'inline-size',
                    backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    boxShadow: 'none',
                }}
            >
                {/* Elements */}
                {renderElements(elements)}
            </div>
        );
    };

    return (
        <div className="w-full h-full">
            {/* Page 1 */}
            {renderPage(bgUrl, hasCustomTemplate, config.elements)}

            {/* Page 2 */}
            {hasPage2 && config.page2 && (
                <>
                    {/* Page break for print */}
                    <div className="print-page-break" style={{ pageBreakBefore: 'always', breakBefore: 'page' }} />
                    {/* Visual separator for screen preview */}
                    <div className="h-4 bg-oxford-200 dark:bg-oxford-800 print:hidden flex items-center justify-center">
                        <span className="text-[9px] font-bold text-oxford-400 uppercase tracking-widest">— Halaman 2 —</span>
                    </div>
                    {renderPage(page2BgUrl, !!page2BgUrl, config.page2.elements)}
                </>
            )}

            {/* Print and font specific styles */}
            <style jsx global>{`
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
                @media print {
                    @page {
                        size: ${isPortrait ? 'A4 portrait' : 'A4 landscape'};
                        margin: 0;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Hide unnecessary elements on print */
                    header, footer, nav, aside {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};
