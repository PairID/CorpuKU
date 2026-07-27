# CorpuKU Academy

Platform pembelajaran dan pengembangan kompetensi ASN berbasis Next.js 16 dan PostgreSQL/Neon. Fitur utamanya mencakup katalog kursus, course player, kuis dan nilai server-side, webinar, learning paths, progress dashboard, sertifikat terverifikasi, pusat pengetahuan, serta panel admin/instruktur.

## Persyaratan

- Node.js 22
- PostgreSQL atau Neon
- Akun Cloudinary untuk penyimpanan media
- SMTP untuk reset password
- Chromium/Puppeteer untuk pembuatan PDF sertifikat

Salin `.env.example` menjadi `.env.local`, lalu isi seluruh nilai rahasia melalui environment lokal atau secret manager penyedia hosting. Jangan commit `.env.local`.

## Instalasi

```bash
npm ci
npm run db:migrate:auth-security
npm run db:migrate:webinar-certificates
npm run db:migrate:production-upgrade
npm run db:migrate:learning-paths
npm run db:migrate:course-pacing
npm run check:production-readiness
npm run dev
```

Semua migrasi bersifat idempotent. Jalankan secara berurutan pada staging sebelum produksi dan ambil backup database terlebih dahulu.

## Quality gate

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
npm audit
npm run check:production-readiness
```

GitHub Actions menjalankan pemeriksaan otomatis pada pull request dan push ke `main`.

## Model keamanan

- Sesi menggunakan token acak opaque di cookie `HttpOnly`, `Secure` pada produksi, dan `SameSite=Strict`.
- Password disimpan dengan `scrypt`; login lama dimigrasikan otomatis dan readiness check menolak password plaintext.
- Mutasi admin/instruktur memeriksa role dan ownership di server.
- Progress dan nilai dihitung dari lesson, enrollment, dan quiz attempt di server.
- Upload memeriksa role, origin, ukuran, ekstensi, MIME, dan magic bytes.
- Konten HTML disanitasi sebelum disimpan atau dirender.
- Sertifikat menyimpan snapshot, nomor unik, token verifikasi publik, audit pencabutan, dan throttle pembuatan PDF.

## Alur sertifikat

Admin mengatur template global sekali, lalu menentukan konfigurasi per kursus atau webinar: aktif/nonaktif, otomatis/manual, jenis dokumen, awalan nomor, JP, serta nilai minimum. Sertifikat otomatis diterbitkan hanya setelah bukti kelulusan server-side terpenuhi. Penerbitan manual, pencabutan, jumlah unduhan, dan verifikasi publik tersedia pada panel admin.

## Deployment

1. Pasang environment variables produksi pada secret manager hosting.
2. Jalankan migrasi pada database produksi.
3. Jalankan `npm run check:production-readiness`.
4. Jalankan `npm run check:ci` atau pipeline CI.
5. Deploy dengan `npm run build` lalu `npm start`.

Gunakan HTTPS, batasi akses database, rotasi kredensial SMTP/Cloudinary, dan pantau `audit_logs`, login rate limits, serta kegagalan pembuatan PDF.
