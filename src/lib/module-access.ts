export type ModuleAccessMode = "manual" | "scheduled";

export interface ModuleAccessConfig {
  isActive?: boolean;
  accessMode?: ModuleAccessMode;
  activeFrom?: string | null;
  activeUntil?: string | null;
}

export interface ModuleAccessStatus {
  accessible: boolean;
  status: "active" | "disabled" | "upcoming" | "expired";
  reason: string;
}

function formatDateTimeId(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function evaluateModuleAccess(
  config: ModuleAccessConfig,
  now: Date = new Date()
): ModuleAccessStatus {
  const mode: ModuleAccessMode = config.accessMode === "scheduled" ? "scheduled" : "manual";

  if (mode === "scheduled") {
    const fromTime = config.activeFrom ? new Date(config.activeFrom).getTime() : NaN;
    const untilTime = config.activeUntil ? new Date(config.activeUntil).getTime() : NaN;
    const nowTime = now.getTime();

    if (!Number.isNaN(fromTime) && nowTime < fromTime) {
      return {
        accessible: false,
        status: "upcoming",
        reason: `Modul dibuka pada ${formatDateTimeId(config.activeFrom!)}`,
      };
    }

    if (!Number.isNaN(untilTime) && nowTime > untilTime) {
      return {
        accessible: false,
        status: "expired",
        reason: `Akses modul berakhir pada ${formatDateTimeId(config.activeUntil!)}`,
      };
    }

    return {
      accessible: true,
      status: "active",
      reason: "Aktif sesuai jadwal",
    };
  }

  if (config.isActive === false) {
    return {
      accessible: false,
      status: "disabled",
      reason: "Modul sedang dinonaktifkan oleh Admin.",
    };
  }

  return {
    accessible: true,
    status: "active",
    reason: "Modul aktif",
  };
}

/**
 * Convert ISO timestamp to HTML <input type="datetime-local"> value (local timezone YYYY-MM-DDTHH:mm)
 */
export function toDateTimeLocalValue(val: string | null | undefined): string {
  if (!val) return "";
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
