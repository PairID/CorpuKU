import Link from 'next/link';
import { ArrowLeft, Award, CheckCircle2, ExternalLink, Settings2, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getAdminWebinar } from '@/app/actions/webinars';
import { getWebinarCertificateDashboard, issueAllEligibleWebinarCertificates, issueSingleWebinarCertificate } from '@/app/actions/webinar-certificates';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WebinarCertificatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [webinar, participants] = await Promise.all([getAdminWebinar(id), getWebinarCertificateDashboard(id)]);
  if (!webinar) notFound();

  const issued = participants.filter(item => item.certificateId && !item.revokedAt).length;
  const ready = participants.filter(item => item.attended && item.evaluationCompleted && item.evaluationScore !== null && !item.certificateId).length;
  const waiting = participants.length - issued - ready;
  const stats: Array<{ label: string; value: number; icon: LucideIcon; color: string }> = [
    { label: 'Peserta', value: participants.length, icon: Users, color: 'text-blue-600' },
    { label: 'Siap terbit', value: ready, icon: CheckCircle2, color: 'text-amber-600' },
    { label: 'Sudah terbit', value: issued, icon: Award, color: 'text-emerald-600' },
  ];

  return (
    <main className="min-h-screen bg-oxford-50 dark:bg-oxford-950 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin/webinars" className="inline-flex items-center gap-2 text-sm font-semibold text-oxford-600 dark:text-oxford-300"><ArrowLeft size={16} /> Daftar webinar</Link>
          <Link href={`/admin/webinars/${id}`} className="inline-flex items-center gap-2 rounded-xl border border-oxford-200 bg-white px-4 py-2 text-sm font-bold text-oxford-800"><Settings2 size={16} /> Pengaturan sertifikat</Link>
        </div>

        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="text-sm font-bold uppercase tracking-widest text-gold-600">Configure once, issue automatically</p><h1 className="mt-2 text-3xl font-bold text-oxford-900 dark:text-white">{webinar.title}</h1><p className="mt-2 text-oxford-600 dark:text-oxford-300">{webinar.certificateAutoIssue ? 'Penerbitan otomatis aktif.' : 'Penerbitan dikendalikan admin.'} Format nomor: {webinar.certificateNumberPrefix}/TAHUN/000001</p></div>
          {webinar.certificateEnabled && ready > 0 && <form action={issueAllEligibleWebinarCertificates}><input type="hidden" name="webinarId" value={id} /><button className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white shadow-lg">Terbitkan Semua Siap ({ready})</button></form>}
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon, color }) => <div key={label} className="rounded-2xl border border-oxford-200 bg-white p-5 dark:border-oxford-800 dark:bg-[#161B2A]"><Icon className={color} /><p className="mt-3 text-sm text-oxford-500">{label}</p><p className="text-3xl font-bold text-oxford-900 dark:text-white">{value}</p></div>)}
        </div>

        {!webinar.certificateEnabled && <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 font-medium text-amber-900">Penerbitan sertifikat dinonaktifkan. Aktifkan melalui halaman pengaturan webinar.</div>}

        <div className="overflow-x-auto rounded-2xl border border-oxford-200 bg-white dark:border-oxford-800 dark:bg-[#161B2A]">
          <table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-oxford-50 text-oxford-600 dark:bg-oxford-900 dark:text-oxford-300"><tr><th className="p-4">Peserta</th><th className="p-4">Presensi</th><th className="p-4">Evaluasi</th><th className="p-4">Sertifikat</th><th className="p-4">Aksi</th></tr></thead>
            <tbody>{participants.map(item => {
              const isReady = item.attended && item.evaluationCompleted && item.evaluationScore !== null;
              return <tr key={String(item.registrationId)} className="border-t border-oxford-100 dark:border-oxford-800"><td className="p-4"><p className="font-bold text-oxford-900 dark:text-white">{String(item.participantName)}</p><p className="text-xs text-oxford-500">{item.participantNip ? String(item.participantNip) : '-'}</p></td><td className="p-4">{item.attended ? <span className="font-bold text-emerald-600">Hadir</span> : <span className="text-oxford-400">Belum hadir</span>}</td><td className="p-4">{item.evaluationCompleted && item.evaluationScore !== null ? <span className="font-bold text-emerald-600">Lulus ({String(item.evaluationScore)})</span> : <span className="text-oxford-400">Belum lulus</span>}</td><td className="p-4">{item.certificateId ? <div><p className={`font-mono font-bold ${item.revokedAt ? 'text-red-600' : 'text-emerald-600'}`}>{String(item.certificateNumber)}</p><p className="text-xs text-oxford-500">{item.revokedAt ? 'Dicabut' : 'Aktif'}</p></div> : <span className={isReady ? 'font-bold text-amber-600' : 'text-oxford-400'}>{isReady ? 'Siap diterbitkan' : 'Belum memenuhi syarat'}</span>}</td><td className="p-4">{item.certificateId ? <Link target="_blank" href={`/verify/certificates/${item.verificationToken}`} className="inline-flex items-center gap-1 font-bold text-blue-600"><ExternalLink size={14} /> Verifikasi</Link> : isReady && webinar.certificateEnabled ? <form action={issueSingleWebinarCertificate}><input type="hidden" name="webinarId" value={id} /><input type="hidden" name="userId" value={String(item.userId)} /><button className="rounded-lg bg-oxford-900 px-3 py-2 text-xs font-bold text-white">Terbitkan</button></form> : '-'}</td></tr>;
            })}{participants.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-oxford-500">Belum ada peserta terdaftar.</td></tr>}</tbody>
          </table>
        </div>
        {waiting > 0 && <p className="mt-4 text-sm text-oxford-500">{waiting} peserta masih menunggu presensi atau kelulusan evaluasi.</p>}
      </div>
    </main>
  );
}
