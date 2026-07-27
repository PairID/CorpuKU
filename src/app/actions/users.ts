"use server";

import { sql } from "@/lib/db";
import { deleteAsset } from "@/lib/cloudinary";
import { requireAdminSession, requireUserSession, getAuthSession } from "./auth";
import { generateTemporaryPassword, hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/password";
import { revokeAllUserSessions } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

// --- Read ---

export async function getAllUsers() {
    try {
        await requireAdminSession();
        const users = await sql`SELECT id, name, email, nip, username, role, created_at as "createdAt" FROM users ORDER BY created_at DESC`;
        return users;
    } catch (err) {
        console.error("Failed to get users:", err);
        return [];
    }
}

export async function getCurrentUser() {
    const session = await getAuthSession();
    if (!session) return null;

    try {
        const data = await sql`
            SELECT id, name, nip, username, email, role,
                   instansi_asal as "instansiAsal", 
                   joined_at as "joinedAt", 
                   created_at as "createdAt", 
                   image, pangkat, jabatan,
                   tempat_lahir as "tempatLahir",
                   tanggal_lahir as "tanggalLahir"
            FROM users 
            WHERE id = ${session.user.id}
        `;
        return data[0] || null;
    } catch { return null; }
}

export async function getInstructors() {
    try {
        await requireUserSession();
        const users = await sql`SELECT id, name, email, role, joined_at as "joinedAt" FROM users WHERE role = 'instructor'`;
        return users;
    } catch { return []; }
}

// --- Mutations ---

export async function updateUserRole(userId: string, newRole: string) {
    try {
        const session = await requireAdminSession();
        if (!["student", "instructor", "admin"].includes(newRole)) {
            return { success: false, error: "Peran tidak valid." };
        }
        if (!/^[A-Za-z0-9_-]{1,255}$/.test(userId)) return { success: false, error: "Pengguna tidak valid." };
        if (session.user.id === userId && newRole !== "admin") {
            return { success: false, error: "Admin tidak dapat menurunkan perannya sendiri." };
        }
        const target = await sql`SELECT role::text AS role FROM users WHERE id = ${userId} LIMIT 1`;
        if (!target[0]) return { success: false, error: "Pengguna tidak ditemukan." };
        if (String(target[0].role) === "admin" && newRole !== "admin") {
            const adminCount = await sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'`;
            if (Number(adminCount[0]?.count || 0) <= 1) return { success: false, error: "Minimal satu admin harus tetap aktif." };
        }
        await sql`UPDATE users SET role = ${newRole} WHERE id = ${userId}`;
        await revokeAllUserSessions(userId);
        await writeAuditLog({ actorUserId: session.user.id, action: "user.role_updated", entityType: "user", entityId: userId, metadata: { previousRole: String(target[0].role), newRole } });
        return { success: true, error: null };
    } catch (err: unknown) {
        return { success: false, error: getErrorMessage(err, "Gagal memperbarui peran.") };
    }
}

export interface CreateUserInput {
    name: string;
    nip: string;
    email: string;
    password: string;
    role: "student" | "instructor" | "admin";
    instansiAsal?: string;
    jabatan?: string;
    pangkat?: string;
    golongan?: string;
    tempatLahir?: string;
    tanggalLahir?: string;
}

export async function createUser(input: CreateUserInput) {
    try {
        await requireAdminSession();
        const passwordError = validatePasswordStrength(input.password);
        if (passwordError) return { success: false, error: passwordError };
        if (!["student", "instructor", "admin"].includes(input.role)) {
            return { success: false, error: "Peran tidak valid." };
        }
        const id = `usr_${Date.now()}`;
        const now = new Date().toISOString();
        const passwordHash = await hashPassword(input.password);

        const jabatanVal = [input.jabatan, input.golongan ? `(${input.golongan})` : null].filter(Boolean).join(' ') || null;
        await sql`
            INSERT INTO users (id, name, nip, username, email, password, role, instansi_asal, pangkat, jabatan, created_at, joined_at, tempat_lahir, tanggal_lahir)
            VALUES (
                ${id}, ${input.name.trim()}, ${input.nip.trim()}, ${input.nip.trim()}, ${input.email.trim().toLowerCase()}, ${passwordHash}, ${input.role},
                ${input.instansiAsal || 'BPSDM Kaltara'},
                ${input.pangkat || null},
                ${jabatanVal},
                ${now}, ${now},
                ${input.tempatLahir || null},
                ${input.tanggalLahir || null}
            )
            ON CONFLICT (nip) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                instansi_asal = EXCLUDED.instansi_asal,
                pangkat = EXCLUDED.pangkat,
                jabatan = EXCLUDED.jabatan,
                tempat_lahir = EXCLUDED.tempat_lahir,
                tanggal_lahir = EXCLUDED.tanggal_lahir,
                password = users.password
        `;

        return { success: true, error: null, user: { id, name: input.name, nip: input.nip } };
    } catch (err: unknown) {
        const message = getErrorMessage(err, "Gagal membuat pengguna.");
        if (message.includes("unique constraint")) {
            return { success: false, error: "NIP atau Email sudah terdaftar." };
        }
        return { success: false, error: message };
    }
}

export interface BatchUserInput {
    name: string;
    nip: string;
    email: string;
    password: string;
    role?: "student" | "instructor" | "admin";
    instansiAsal?: string;
    jabatan?: string;
    pangkat?: string;
    golongan?: string;
    tempatLahir?: string;
    tanggalLahir?: string;
}

export async function createUsersBatch(inputs: BatchUserInput[]) {
    try {
        await requireAdminSession();
    } catch (err: unknown) {
        throw new Error(getErrorMessage(err, "Unauthorized"));
    }

    const results: { index: number; success: boolean; error?: string; nip: string; name: string }[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        try {
            const plainPassword = input.password?.trim();
            if (!plainPassword) throw new Error("Password wajib diisi agar kredensial awal dapat diserahkan dengan aman.");
            const passwordError = validatePasswordStrength(plainPassword);
            if (passwordError) throw new Error(passwordError);
            const role = input.role || "student";
            if (!["student", "instructor", "admin"].includes(role)) throw new Error("Peran tidak valid.");
            const id = `usr_${Date.now()}_${i}`;
            const now = new Date().toISOString();
            const passwordHash = await hashPassword(plainPassword);
            
            const jabatanVal = [input.jabatan, input.golongan ? `(${input.golongan})` : null].filter(Boolean).join(' ') || null;
            await sql`
                INSERT INTO users (id, name, nip, username, email, password, role, instansi_asal, pangkat, jabatan, created_at, joined_at, tempat_lahir, tanggal_lahir)
                VALUES (
                    ${id}, ${input.name.trim()}, ${input.nip.trim()}, ${input.nip.trim()}, ${input.email.trim().toLowerCase()},
                    ${passwordHash},
                    ${role},
                    ${input.instansiAsal || 'BPSDM Kaltara'},
                    ${input.pangkat || null},
                    ${jabatanVal},
                    ${now}, ${now},
                    ${input.tempatLahir || null},
                    ${input.tanggalLahir || null}
                )
                ON CONFLICT (nip) DO UPDATE SET
                    name = EXCLUDED.name,
                    email = EXCLUDED.email,
                    role = EXCLUDED.role,
                    instansi_asal = EXCLUDED.instansi_asal,
                    pangkat = EXCLUDED.pangkat,
                    jabatan = EXCLUDED.jabatan,
                    tempat_lahir = EXCLUDED.tempat_lahir,
                    tanggal_lahir = EXCLUDED.tanggal_lahir,
                    password = users.password
            `;
            results.push({ index: i, success: true, nip: input.nip, name: input.name });
            successCount++;
        } catch (err: unknown) {
            let errorMsg = "Gagal simpan";
            if (getErrorMessage(err, errorMsg).includes("unique constraint")) errorMsg = "NIP/Email sudah ada";
            results.push({ index: i, success: false, error: errorMsg, nip: input.nip, name: input.name });
            failCount++;
        }
    }

    return { successCount, failCount, results };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
        const session = await requireUserSession();
        if (session.user.id !== userId && session.user.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        const passwordError = validatePasswordStrength(newPassword);
        if (passwordError) return { success: false, error: passwordError };
        const user = await sql`SELECT password FROM users WHERE id = ${userId}`;
        const verification = user[0] ? await verifyPassword(currentPassword, String(user[0].password)) : { valid: false };
        if (!verification.valid) {
            return { success: false, error: "Password lama salah." };
        }
        await sql`UPDATE users SET password = ${await hashPassword(newPassword)} WHERE id = ${userId}`;
        await revokeAllUserSessions(userId, session.session.id);
        return { success: true, error: null };
    } catch (err: unknown) {
        return { success: false, error: getErrorMessage(err, "Gagal mengubah password.") };
    }
}

export async function resetPassword(userId: string, newPassword: string) {
    try {
        const session = await requireAdminSession();
        const passwordError = validatePasswordStrength(newPassword);
        if (passwordError) return { success: false, error: passwordError };
        await sql`UPDATE users SET password = ${await hashPassword(newPassword)} WHERE id = ${userId}`;
        await revokeAllUserSessions(userId);
        await writeAuditLog({ actorUserId: session.user.id, action: "user.password_reset", entityType: "user", entityId: userId });
        return { success: true, error: null };
    } catch (err: unknown) {
        return { success: false, error: getErrorMessage(err, "Gagal mereset password.") };
    }
}

export async function resetPasswordToNip(userId: string) {
    try {
        const session = await requireAdminSession();
        const user = await sql`SELECT id FROM users WHERE id = ${userId}`;
        if (!user[0]) return { success: false, error: "User tidak ditemukan." };
        const temporaryPassword = generateTemporaryPassword();
        await sql`UPDATE users SET password = ${await hashPassword(temporaryPassword)} WHERE id = ${userId}`;
        await revokeAllUserSessions(userId);
        await writeAuditLog({ actorUserId: session.user.id, action: "user.password_reset", entityType: "user", entityId: userId, metadata: { temporaryCredential: true } });
        return { success: true, error: null, temporaryPassword };
    } catch (err: unknown) {
        return { success: false, error: getErrorMessage(err, "Gagal mereset password.") };
    }
}

export async function deleteUser(userId: string) {
    try {
        const session = await requireAdminSession();
        if (!/^[A-Za-z0-9_-]{1,255}$/.test(userId)) return { success: false, error: "Pengguna tidak valid." };
        if (session.user.id === userId) return { success: false, error: "Admin tidak dapat menghapus akunnya sendiri." };
        // Find user image before deleting
        const user = await sql`SELECT image, role::text AS role FROM users WHERE id = ${userId}`;
        if (!user[0]) return { success: false, error: "Pengguna tidak ditemukan." };
        if (String(user[0].role) === "admin") {
            const adminCount = await sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'`;
            if (Number(adminCount[0]?.count || 0) <= 1) return { success: false, error: "Admin terakhir tidak dapat dihapus." };
        }
        if (user[0]?.image) {
            await deleteAsset(user[0].image);
        }
        
        await sql`DELETE FROM users WHERE id = ${userId}`;
        await writeAuditLog({ actorUserId: session.user.id, action: "user.deleted", entityType: "user", entityId: userId, metadata: { previousRole: String(user[0].role) } });
        return { success: true, error: null };
    } catch (err: unknown) {
        return { success: false, error: getErrorMessage(err, "Gagal menghapus pengguna.") };
    }
}

export interface NotificationPreferences {
    email?: boolean;
    push?: boolean;
    courseUpdates?: boolean;
    announcements?: boolean;
    [key: string]: boolean | undefined;
}

export async function updateNotificationPreferences(userId: string, prefs: NotificationPreferences) {
    try {
        const session = await requireUserSession();
        if (session.user.id !== userId && session.user.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        await sql`UPDATE users SET notification_preferences = ${JSON.stringify(prefs)} WHERE id = ${userId}`;
        return { success: true, error: null };
    } catch (err: unknown) {
        return { success: false, error: getErrorMessage(err, "Gagal menyimpan preferensi.") };
    }
}

export async function getNotificationPreferences(userId: string) {
    try {
        const session = await requireUserSession();
        if (session.user.id !== userId && session.user.role !== "admin") {
            return null;
        }

        const data = await sql`SELECT notification_preferences as prefs FROM users WHERE id = ${userId}`;
        return data[0]?.prefs || null;
    } catch { return null; }
}

export interface UserProfileUpdates {
    name?: string | null;
    instansiAsal?: string | null;
    pangkat?: string | null;
    jabatan?: string | null;
    image?: string | null;
    tempatLahir?: string | null;
    tanggalLahir?: string | null;
}

export async function updateUserProfile(userId: string, updates: UserProfileUpdates) {
    try {
        const session = await requireUserSession();
        if (session.user.id !== userId && session.user.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        // Handle Cloudinary Cleanup if new image provided
        if (updates.image) {
            const oldUser = await sql`SELECT image FROM users WHERE id = ${userId}`;
            const oldImage = oldUser[0]?.image;
            
            // If there's an old image and it's different from the new one
            if (oldImage && oldImage !== updates.image && oldImage.includes("cloudinary.com")) {
                await deleteAsset(oldImage);
            }
        }

        // Handle mapping of snake_case for DB
        await sql`
            UPDATE users SET 
                name = COALESCE(${updates.name}, name),
                instansi_asal = COALESCE(${updates.instansiAsal}, instansi_asal),
                pangkat = COALESCE(${updates.pangkat}, pangkat),
                jabatan = COALESCE(${updates.jabatan}, jabatan),
                image = COALESCE(${updates.image}, image),
                tempat_lahir = COALESCE(${updates.tempatLahir}, tempat_lahir),
                tanggal_lahir = COALESCE(${updates.tanggalLahir}, tanggal_lahir)
            WHERE id = ${userId}
        `;
        const rawUser = await sql`SELECT * FROM users WHERE id = ${userId}`;
        const dbUser = rawUser[0];
        
        // Map snake_case to camelCase for frontend
        const user = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            nip: dbUser.nip,
            username: dbUser.username,
            role: dbUser.role,
            image: dbUser.image,
            instansiAsal: dbUser.instansi_asal,
            pangkat: dbUser.pangkat,
            jabatan: dbUser.jabatan,
            tempatLahir: dbUser.tempat_lahir,
            tanggalLahir: dbUser.tanggal_lahir,
            createdAt: dbUser.created_at,
            joinedAt: dbUser.joined_at
        };

        return { success: true, error: null, user };
    } catch (err: unknown) {
        console.error("Update Profile Error:", err);
        return { success: false, error: getErrorMessage(err, "Gagal mengupdate profil.") };
    }
}

// --- Notifications ---

export async function getNotifications(userId: string) {
    try {
        const session = await requireUserSession();
        if (session.user.id !== userId && session.user.role !== "admin") {
            return [];
        }

        const data = await sql`
            SELECT id, user_id as "userId", title, message, type, link, 
                   is_read as "isRead", 
                   created_at as "createdAt" 
            FROM notifications 
            WHERE user_id = ${userId} 
            ORDER BY created_at DESC 
            LIMIT 20
        `;
        return data;
    } catch { return []; }
}

export async function markAsRead(notificationId: string) {
    try {
        const session = await requireUserSession();
        const notification = await sql`SELECT user_id FROM notifications WHERE id = ${notificationId}`;
        if (notification[0]?.user_id !== session.user.id && session.user.role !== "admin") {
            return { success: false };
        }

        await sql`UPDATE notifications SET is_read = TRUE WHERE id = ${notificationId}`;
        return { success: true };
    } catch { return { success: false }; }
}
