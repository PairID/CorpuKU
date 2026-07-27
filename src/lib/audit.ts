import crypto from "crypto";
import { sql } from "@/lib/db";

type AuditValue = string | number | boolean | null;

export async function writeAuditLog(input: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, AuditValue>;
}) {
  await sql`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
    VALUES (
      ${crypto.randomUUID()}, ${input.actorUserId || null}, ${input.action.slice(0, 100)},
      ${input.entityType.slice(0, 100)}, ${input.entityId?.slice(0, 255) || null},
      ${JSON.stringify(input.metadata || {})}::jsonb
    )
  `;
}
