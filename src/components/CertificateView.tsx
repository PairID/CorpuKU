import React from 'react';
import Image from 'next/image';

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
        const kopEl = elements.find(el => el.id === 'kop_1' || el.text?.includes('KEPALA BADAN'));
        const titleEl = elements.find(el => el.id === 'title_1' || el.text?.includes('SERTIFIKAT'));
        const nomorEl = elements.find(el => el.id === 'nomor_1' || el.text?.includes('Nomor'));
        const labelToEl = elements.find(el => el.id === 'label_to_1' || el.text?.includes('Diberikan'));
        const tableEl = elements.find(el => el.id === 'table_identitas_1' || el.text?.includes('Nama :'));
        const paragraphEl = elements.find(el => el.id === 'paragraph_1' || el.text?.includes('Atas partisipasinya'));
        const sigDateEl = elements.find(el => el.id === 'sig_date' || el.text?.includes('Tanjung Selor'));
        const sigImgEl = elements.find(el => el.type === 'image' && (el.id?.includes('sig') || el.text?.toLowerCase().includes('tanda tangan') || el.imageUrl?.includes('pab59388nfffraedyngo')));

        const kopText = parseText(kopEl?.text || 'KEPALA BADAN PENGEMBANGAN SUMBER DAYA MANUSIA\nPROVINSI KALIMANTAN UTARA');
        const titleText = parseText(titleEl?.text || 'SERTIFIKAT');
        const nomorText = parseText(nomorEl?.text || 'Nomor : {{nomor}}');
        const labelToText = parseText(labelToEl?.text || 'Diberikan kepada:');
        const paragraphText = parseText(paragraphEl?.text || 'Atas partisipasinya dalam {{kursus}} yang diselenggarakan oleh Badan Pengembangan Sumber Daya Manusia Provinsi Kalimantan Utara pada tanggal {{tanggal}} secara daring yang meliputi {{jp}} Jam Pelajaran.');
        const sigDateText = parseText(sigDateEl?.text || 'Tanjung Selor, {{tanggal_terbit}}');
        const sigUrl = sigImgEl?.imageUrl || 'https://res.cloudinary.com/dxtbmu2ui/image/upload/v1791857983/corpuku-academy/pab59388nfffraedyngo.png';

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
                className="w-full h-full bg-white text-black"
                style={{
                    aspectRatio,
                    containerType: 'inline-size',
                    fontFamily: fontBookman,
                    padding: isPortrait ? '6.5cqi 10.5cqi 5cqi 10.5cqi' : '4cqi 8cqi 3cqi 8cqi',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }}
            >
                <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                    <tbody>
                        {/* 1. KOP SURAT (TANPA LOGO SESUAI NASKAH DINAS RESMI) */}
                        <tr>
                            <td className="text-center pb-[4.2cqi]">
                                <h1 
                                    className="font-bold uppercase whitespace-pre-line text-black leading-snug"
                                    style={{ fontSize: isPortrait ? '2.0cqi' : '1.6cqi' }}
                                >
                                    {kopText}
                                </h1>
                            </td>
                        </tr>

                        {/* 2. JUDUL DOKUMEN & NOMOR */}
                        <tr>
                            <td className="text-center pb-[3.8cqi]">
                                <h2 
                                    className="font-bold tracking-wider text-black mb-[1cqi]"
                                    style={{ fontSize: isPortrait ? '3.5cqi' : '2.8cqi' }}
                                >
                                    {titleText}
                                </h2>
                                <p 
                                    className="text-black"
                                    style={{ fontSize: isPortrait ? '1.8cqi' : '1.4cqi' }}
                                >
                                    {nomorText}
                                </p>
                            </td>
                        </tr>

                        {/* 3. PENGANTAR */}
                        <tr>
                            <td className="text-center pb-[2.5cqi]">
                                <p 
                                    className="text-black"
                                    style={{ fontSize: isPortrait ? '1.8cqi' : '1.4cqi' }}
                                >
                                    {labelToText}
                                </p>
                            </td>
                        </tr>

                        {/* 4. TABEL IDENTITAS PESERTA (RATA TITIK DUA) */}
                        <tr>
                            <td className="pb-[3.2cqi]">
                                <table className="w-[75%] mx-auto border-collapse" style={{ fontSize: isPortrait ? '1.8cqi' : '1.4cqi' }}>
                                    <tbody>
                                        {identityRows.map((row, idx) => (
                                            <tr key={idx} className="align-top">
                                                <td className="w-1 whitespace-nowrap pr-[2.5cqi] py-[0.4cqi] text-left text-black">
                                                    {row.label}
                                                </td>
                                                <td className="w-1 whitespace-nowrap pr-[2.5cqi] py-[0.4cqi] text-center text-black">
                                                    :
                                                </td>
                                                <td className="w-auto text-left py-[0.4cqi] text-black">
                                                    {row.value}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </td>
                        </tr>

                        {/* 5. PARAGRAF PARTISIPASI */}
                        <tr>
                            <td className="pb-[4.2cqi]">
                                <p 
                                    className="text-justify leading-relaxed text-black"
                                    style={{ fontSize: isPortrait ? '1.8cqi' : '1.4cqi' }}
                                >
                                    {paragraphText}
                                </p>
                            </td>
                        </tr>

                        {/* 6. BLOK TANDA TANGAN (KANAN) */}
                        <tr>
                            <td>
                                <div className="flex justify-end">
                                    <div className="w-[35cqi] flex flex-col items-start">
                                        <p 
                                            className="text-black mb-[1.2cqi]"
                                            style={{ fontSize: isPortrait ? '1.8cqi' : '1.4cqi' }}
                                        >
                                            {sigDateText}
                                        </p>
                                        {sigUrl && (
                                            <div 
                                                className="relative"
                                                style={{ 
                                                    width: isPortrait ? '32cqi' : '24cqi', 
                                                    height: isPortrait ? '13cqi' : '10cqi' 
                                                }}
                                            >
                                                <Image 
                                                    src={sigUrl} 
                                                    alt="TTE Pejabat" 
                                                    fill 
                                                    sizes="100vw"
                                                    unoptimized 
                                                    className="object-contain object-left" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
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

            {/* Print specific styles */}
            <style jsx global>{`
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
