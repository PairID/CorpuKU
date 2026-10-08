export interface User {
    id: string;
    name: string;
    email: string;
    nip?: string;
    username?: string;
    role: 'student' | 'admin' | 'instructor';
    image?: string | null;
    instansiAsal?: string;
    pangkat?: string;
    jabatan?: string;
    targetJpTahunan?: number;
    kategoriPegawai?: 'Provinsi' | 'OPD' | 'Kab_Kota' | 'Lainnya';
    namaInstansi?: string;
    createdAt?: string;
    joinedAt?: string;
}

export interface Course {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    thumbnailUrl: string;
    status: 'active' | 'archived' | 'draft';
    instructorId: string;
    jp: number;
    certificateType: string;
    createdAt: string;
    updatedAt: string;
}

export interface NewsArticle {
    id: string;
    title: string;
    summary: string;
    content: string;
    category: string;
    authorId: string;
    imageUrl: string;
    tags: string[];
    views: number;
    status: 'published' | 'draft';
    publishedAt: string;
    createdAt: string;
}

export interface KnowledgeItem {
    id: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    thumbnailUrl: string | null;
    videoUrl: string | null;
    authorId: string;
    views: number;
    likes: number;
    likedBy: string[];
    privacy: 'public' | 'internal';
    status: 'published' | 'draft';
    createdAt: string;
    updatedAt: string;
}

export interface Enrollment {
    id: string;
    userId: string;
    courseId: string;
    status: 'in_progress' | 'completed';
    progress: number;
    enrolledAt: string;
    completedAt?: string | null;
    completedLessons: string[];
}

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    link?: string;
    isRead: boolean;
    createdAt: string;
}

export interface Webinar {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string | null;
    meetingLink: string | null;
    materialUrl: string | null;
    virtualBackgroundUrl: string | null;
    scheduledAt: string;
    attendanceCode: string | null;
    status: 'draft' | 'published' | 'completed';
    quizSettings?: WebinarQuizSettings;
    joinWindowMinutes: number;
    isAttendanceOpen?: boolean;
    youtubeUrl?: string | null;
    certificateEnabled: boolean;
    certificateAutoIssue: boolean;
    certificateTemplateType: 'sertifikat' | 'surat_keterangan' | 'sttp';
    certificateNumberPrefix: string;
    certificateJp: number;
    attendanceCount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface SkmAnswer {
    questionId: number;
    questionText: string;
    optionKey: 'A' | 'B' | 'C' | 'D';
    optionText: string;
    score: number;
}

export interface WebinarQuizQuestion {
    id?: string;
    question: string;
    options: string[];
    /** Hanya boleh dikirim ke halaman admin. */
    correctAnswer?: number;
}

export interface WebinarQuizSettings {
    passingScore?: number;
    questions: WebinarQuizQuestion[];
}

export interface WebinarRegistration {
    id: string;
    userId: string;
    webinarId: string;
    registeredAt: string;
    attended: boolean;
    evaluationCompleted: boolean;
    certificateGenerated: boolean;
    evaluationScore?: number | null;
}

export interface IssuedWebinarCertificate {
    id: string;
    certificateNumber: string;
    verificationToken: string;
    userId: string;
    webinarId: string;
    participantName: string;
    participantNip?: string | null;
    participantRank?: string | null;
    participantPosition?: string | null;
    participantInstitution?: string | null;
    webinarTitle: string;
    webinarScheduledAt: string;
    certificateJp: number;
    templateType: string;
    templateSettings?: unknown;
    issuedAt: string;
    revokedAt?: string | null;
    revocationReason?: string | null;
}

export interface ExternalBangkom {
    id: string;
    userId: string;
    title: string;
    provider: string;
    dateCompleted: string;
    jp: number;
    certificateUrl?: string;
    certificateNo?: string;
    dateStarted?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    updatedAt: string;
}
