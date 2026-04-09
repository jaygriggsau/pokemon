/** dd/mm/yyyy */
export function formatDate(input: string | number | Date): string {
  const d = typeof input === "object" ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** dd/mm/yyyy HH:mm */
export function formatDateTime(input: string | number | Date): string {
  const d = typeof input === "object" ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

/** "Month YYYY" (e.g. "January 2025") */
export function formatMonthYear(input: string | number | Date): string {
  const d = typeof input === "object" ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "long" });
}
