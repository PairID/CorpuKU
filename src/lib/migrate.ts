import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("Gagal: DATABASE_URL tidak ditemukan di .env.local");
  process.exit(1);
}

const sql = neon(connectionString);
const DB_PATH = path.join(process.cwd(), 'local-database.json');

async function migrate() {
  console.log("🚀 Memulai migrasi data ke Neon...");

  if (!fs.existsSync(DB_PATH)) {
    console.error("File local-database.json tidak ditemukan!");
    return;
  }

  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

  try {
    // 1. Migrate Users
    console.log("👥 Mengunggah Users...");
    for (const u of data.users) {
      await sql.query(`
        INSERT INTO users (id, name, email, nip, username, password, role, instansi_asal, pangkat, jabatan, created_at, joined_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET 
          name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role
      `, [u.id, u.name, u.email, u.nip, u.username, u.password, u.role, u.instansiAsal, u.pangkat || null, u.jabatan || null, u.createdAt, u.joinedAt]);
    }

    // 2. Migrate Courses
    console.log("📚 Mengunggah Courses...");
    for (const c of data.courses) {
      await sql.query(`
        INSERT INTO courses (id, title, description, category, level, thumbnail_url, status, instructor_id, jp, certificate_type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
      `, [c.id, c.title, c.description, c.category, c.level, c.thumbnailUrl, c.status, c.instructorId, c.jp || 0, c.certificateType || 'sertifikat', c.createdAt, c.updatedAt]);
    }

    // 3. Migrate Course Content (Modules & Lessons)
    console.log("📝 Mengunggah Konten Kursus...");
    for (const content of data.courseContent) {
      // Map module
      await sql.query(`
        INSERT INTO modules (id, course_id, title, "order")
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
      `, [content.id, content.courseId, content.title, parseInt(content.order) || 0]);

      // Map lessons
      for (const lesson of content.lessons) {
        await sql.query(`
          INSERT INTO lessons (id, module_id, title, content, video_url, type, "order")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [lesson.id, content.id, lesson.title, lesson.content || '', lesson.videoUrl || '', lesson.type || 'video', 0]);
      }
    }

    // 4. Migrate Enrollments
    console.log("🎓 Mengunggah Enrollments...");
    for (const enr of data.enrollments) {
      await sql.query(`
        INSERT INTO enrollments (id, user_id, course_id, title, category, progress, status, jp, completed_lessons, enrolled_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET progress = EXCLUDED.progress, status = EXCLUDED.status
      `, [enr.id, enr.userId, enr.courseId, enr.title, enr.category, enr.progress, enr.status, enr.jp || 0, JSON.stringify(enr.completedLessons || []), enr.enrolledAt]);
    }

    // 5. Migrate Notifications
    if (data.notifications) {
      console.log("🔔 Mengunggah Notifications...");
      for (const n of data.notifications) {
        try {
          // Check if user exists to avoid FK violation
          const userExists = await sql`SELECT 1 FROM users WHERE id = ${n.userId}`;
          if (userExists.length > 0) {
            await sql.query(`
              INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (id) DO NOTHING
            `, [n.id, n.userId, n.title, n.message, n.type || 'info', n.isRead, n.link, n.createdAt]);
          }
        } catch (e) {
          console.warn(`⚠️ Gagal migrasi notification ${n.id}:`, (e as Error).message);
        }
      }
    }

    // 6. Migrate Knowledge Items
    if (data.knowledgeItems) {
      console.log("💡 Mengunggah Knowledge Items...");
      for (const item of data.knowledgeItems) {
        try {
          // Postgres ARRAY types need JS arrays, neon driver handles them
          await sql.query(`
            INSERT INTO knowledge_items (id, title, description, category, tags, thumbnail_url, video_url, author_id, views, likes, liked_by, privacy, status, created_at, updated_at, attachments, comments)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, updated_at = EXCLUDED.updated_at
          `, [item.id, item.title, item.description, item.category, item.tags || [], item.thumbnailUrl, item.videoUrl, item.authorId, item.views || 0, item.likes || 0, item.likedBy || [], item.privacy || 'public', item.status || 'published', item.createdAt, item.updatedAt, JSON.stringify(item.attachments || []), JSON.stringify(item.comments || [])]);
        } catch (e) {
          console.warn(`⚠️ Gagal migrasi knowledge item ${item.id}:`, (e as Error).message);
        }
      }
    }

    // 7. Migrate News
    if (data.news) {
      console.log("📰 Mengunggah Berita...");
      for (const article of data.news) {
        try {
          await sql.query(`
            INSERT INTO news (id, title, summary, content, category, author_id, image_url, tags, views, status, published_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
          `, [article.id, article.title, article.summary, article.content, article.category, article.authorId, article.imageUrl, article.tags || [], article.views || 0, article.status || 'published', article.publishedAt, article.createdAt]);
        } catch (e) {
          console.warn(`⚠️ Gagal migrasi news article ${article.id}:`, (e as Error).message);
        }
      }
    }

    // 8. Migrate Certificate Settings
    if (data.certificateSettings) {
      console.log("📄 Mengunggah Certificate Settings...");
      for (const [key, settings] of Object.entries(data.certificateSettings)) {
        try {
          await sql.query(`
            INSERT INTO certificate_settings (type, settings)
            VALUES ($1, $2)
            ON CONFLICT (type) DO UPDATE SET settings = EXCLUDED.settings
          `, [key, JSON.stringify(settings)]);
        } catch (e) {
          console.warn(`⚠️ Gagal migrasi certificate setting ${key}:`, (e as Error).message);
        }
      }
    }

    // 9. Migrate About Us
    if (data.aboutUs) {
      try {
        console.log("ℹ️ Mengunggah About Us...");
        await sql.query(`
          INSERT INTO about_us (id, content, last_updated)
          VALUES ('main', $1, $2)
          ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content
        `, [JSON.stringify(data.aboutUs), new Date().toISOString()]);
      } catch (e) {
        console.warn(`⚠️ Gagal migrasi about us:`, (e as Error).message);
      }
    }

    console.log("✅ Migrasi SELESAI! Data Anda sekarang sudah ada di Neon cloud.");
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat migrasi:", error);
  }
}

migrate();
