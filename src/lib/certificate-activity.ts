export type DeliveryMode = "daring" | "luring" | "blended";

export const DEFAULT_ORGANIZER_NAME =
  "Badan Pengembangan Sumber Daya Manusia Provinsi Kalimantan Utara";

function parseIsoDateParts(val: string | Date): { year: number; month: number; day: number; date: Date } | null {
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return null;
    return { year: val.getFullYear(), month: val.getMonth(), day: val.getDate(), date: val };
  }
  const str = String(val).trim();
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]) - 1;
    const day = Number(ymd[3]);
    return { year, month, day, date: new Date(year, month, day) };
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), date: d };
}

export function formatActivityDateRange(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  fallbackDate?: string | Date | null
): string {
  const s = startDate ? parseIsoDateParts(startDate) : null;
  const e = endDate ? parseIsoDateParts(endDate) : null;

  if (s && e) {
    const endFull = e.date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (s.year === e.year && s.month === e.month && s.day === e.day) {
      return endFull;
    }
    if (s.year === e.year && s.month === e.month) {
      return `${s.day} - ${endFull}`;
    }
    if (s.year === e.year) {
      const startNoYear = s.date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
      });
      return `${startNoYear} - ${endFull}`;
    }
    const startFull = s.date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `${startFull} s.d. ${endFull}`;
  }

  if (s) {
    return s.date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (fallbackDate) {
    const f = parseIsoDateParts(fallbackDate);
    if (f) {
      return f.date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }

  return "";
}

export function formatDeliveryPhrase(
  deliveryMode?: string | null,
  locationName?: string | null
): string {
  const loc = (locationName || "").trim();
  if (deliveryMode === "luring") {
    return loc ? `secara klasikal di ${loc}` : "secara klasikal";
  }
  if (deliveryMode === "blended") {
    return loc ? `secara blended learning di ${loc}` : "secara blended learning";
  }
  return "secara daring";
}
