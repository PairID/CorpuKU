"use client";

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function Footer() {
    const pathname = usePathname();
    const hideOnPaths = ['/learn', '/dashboard', '/admin', '/instructor'];
    const shouldHide = hideOnPaths.some(p => pathname.startsWith(p));

    if (shouldHide) return null;

    return (
        <footer className="bg-oxford-950 text-oxford-300 py-16 border-t border-oxford-900">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="col-span-1 md:col-span-1">
                    <Link href="/" className="flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 bg-gold-500 text-oxford-900 dark:text-white rounded-lg flex items-center justify-center">
                            <BookOpen size={24} />
                        </div>
                        <span className="font-serif text-2xl font-bold text-white tracking-tight">
                            CorpuKU <span className="text-gold-500 font-sans font-medium text-xl">Academy</span>
                        </span>
                    </Link>
                    <p className="text-sm leading-relaxed text-oxford-400">
                        Memberdayakan profesional melalui pengalaman belajar kelas dunia. Tingkatkan karier Anda dengan kursus kami yang menarik dan mudah diakses.
                    </p>
                </div>

                <div>
                    <div>
                        <h4 className="font-sans font-bold text-white mb-4 uppercase tracking-wider text-xs">Belajar</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="/search" className="hover:text-gold-400 transition-colors">Jelajahi Kursus</Link></li>
                            <li><Link href="/knowledge" className="hover:text-gold-400 transition-colors">Pusat Pengetahuan</Link></li>
                            <li><Link href="/paths" className="hover:text-gold-400 transition-colors">Learning Paths</Link></li>
                        </ul>
                    </div>
                </div>

                <div>
                    <h4 className="font-sans font-bold text-white mb-4 uppercase tracking-wider text-xs">CorpuKU</h4>
                    <ul className="space-y-3 text-sm">
                        <li><Link href="/about" className="hover:text-gold-400 transition-colors">Tentang Kami</Link></li>
                        <li><Link href="/partners" className="hover:text-gold-400 transition-colors">Afiliasi & Mitra</Link></li>
                        <li><Link href="/news" className="hover:text-gold-400 transition-colors">Berita & Pers</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-sans font-bold text-white mb-4 uppercase tracking-wider text-xs">Legal</h4>
                    <ul className="space-y-3 text-sm">
                        <li><Link href="/terms" className="hover:text-gold-400 transition-colors">Syarat & Ketentuan</Link></li>
                        <li><Link href="/privacy" className="hover:text-gold-400 transition-colors">Kebijakan Privasi</Link></li>
                        <li><Link href="/accessibility" className="hover:text-gold-400 transition-colors">Kebijakan Aksesibilitas</Link></li>
                        <li><Link href="/sitemap" className="hover:text-gold-400 transition-colors">Peta Situs</Link></li>
                    </ul>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-16 pt-8 border-t border-oxford-800 text-sm flex flex-col md:flex-row justify-between items-center text-oxford-500 dark:text-oxford-400">
                <p>© {new Date().getFullYear()} CorpuKU Academy. Hak cipta dilindungi undang-undang.</p>
                <p className="mt-4 md:mt-0">Didesain untuk keunggulan.</p>
            </div>
        </footer>
    );
}
