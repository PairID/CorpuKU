import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Eye } from 'lucide-react';

interface NewsCardProps {
    id: string;
    title: string;
    summary: string;
    category: string;
    imageUrl: string | null;
    publishedAt: Date | string;
    views: number;
    variant?: 'hero' | 'grid' | 'list';
}

export function NewsCard({ 
    id, title, summary, category, imageUrl, publishedAt, views, variant = 'grid' 
}: NewsCardProps) {
    const formattedDate = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric'
    }).format(new Date(publishedAt));

    if (variant === 'hero') {
        return (
            <Link href={`/news/${id}`} className="group block relative overflow-hidden rounded-2xl h-[400px] md:h-[500px]">
                {imageUrl ? (
                    <Image src={imageUrl} alt={title} fill priority sizes="100vw" unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full bg-oxford-800 transition-transform duration-500 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-oxford-950/90 via-oxford-950/40 to-transparent" />
                
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 flex flex-col justify-end">
                    <span className="inline-block px-3 py-1 bg-gold-500 text-oxford-950 text-xs font-bold rounded-md mb-4 self-start">
                        {category}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2 group-hover:text-gold-400 transition-colors line-clamp-2 leading-tight">
                        {title}
                    </h2>
                    <p className="text-oxford-200 text-sm md:text-base line-clamp-2 md:line-clamp-3 mb-4 max-w-3xl">
                        {summary}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-medium text-oxford-300">
                        <span className="flex items-center gap-1"><Calendar size={14} /> {formattedDate}</span>
                        <span className="flex items-center gap-1"><Eye size={14} /> {(views || 0)} dibaca</span>
                    </div>
                </div>
            </Link>
        );
    }

    if (variant === 'list') {
        return (
            <Link href={`/news/${id}`} className="group flex gap-4 md:gap-6 pb-6 border-b border-border-base last:border-0 items-start">
                {imageUrl && (
                    <div className="relative w-24 h-24 md:w-40 md:h-28 shrink-0 rounded-xl overflow-hidden bg-oxford-100 dark:bg-[#161B2A]">
                        <Image src={imageUrl} alt={title} fill sizes="160px" unoptimized className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                )}
                <div className="flex-1 flex flex-col justify-between h-full min-h-[6rem] md:min-h-[7rem]">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-gold-600 font-bold text-xs uppercase tracking-wider">{category}</span>
                            <span className="w-1 h-1 rounded-full bg-oxford-300"></span>
                            <span className="text-xs text-oxford-500 dark:text-oxford-400 font-medium flex items-center gap-1">
                                {formattedDate}
                            </span>
                        </div>
                        <h3 className="font-serif font-bold text-base md:text-lg text-foreground group-hover:text-gold-600 transition-colors line-clamp-2 mb-2 leading-snug">
                            {title}
                        </h3>
                    </div>
                    {/* Only show up to LG, hide summary on very narrow screens if there is an image to save space */}
                    <p className="text-sm text-oxford-500 dark:text-oxford-400 line-clamp-2 hidden sm:block md:hidden lg:block">
                        {summary}
                    </p>
                </div>
            </Link>
        );
    }

    // Default 'grid' variant
    return (
        <Link href={`/news/${id}`} className="group flex flex-col h-full rounded-2xl border border-border-base bg-white dark:bg-[#161B2A] overflow-hidden shadow-sm hover:shadow-md transition-all">
            {imageUrl ? (
                <div className="relative w-full h-48 overflow-hidden bg-oxford-100 dark:bg-[#161B2A]">
                    <Image src={imageUrl} alt={title} fill sizes="(min-width: 768px) 33vw, 100vw" unoptimized className="object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
            ) : (
                <div className="w-full h-48 bg-oxford-800" />
            )}
            
            <div className="p-5 flex-1 flex flex-col">
                <span className="text-gold-600 font-bold text-xs uppercase tracking-wider mb-2 block">{category}</span>
                <h3 className="font-serif font-bold text-lg text-foreground group-hover:text-gold-600 transition-colors line-clamp-2 mb-2 leading-snug">
                    {title}
                </h3>
                <p className="text-sm text-oxford-500 dark:text-oxford-400 line-clamp-2 mb-4 flex-1">
                    {summary}
                </p>
                <div className="flex items-center gap-3 text-xs font-medium text-oxford-400 mt-auto pt-4 border-t border-border-base/50">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {formattedDate}</span>
                    <span className="flex items-center gap-1"><Eye size={14} /> {(views || 0)}</span>
                </div>
            </div>
        </Link>
    );
}
