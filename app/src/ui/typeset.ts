// Printer's quotes for story text. Cases are written with straight quotes;
// a Strand page never had them.

const ELISIONS = /(^|[\s(—–])'(?=(?:tis|twas|twere|twill|em|ere|neath|cause|til)\b)/gi;
const OPENS = /(^|[\s(\[{—–-])(["'])/g;

/** Straight quotes and apostrophes become curly ones. */
export function typeset(text: string): string {
  return text
    .replace(ELISIONS, "$1’")
    .replace(OPENS, (_, before: string, q: string) => before + (q === '"' ? "“" : "‘"))
    .replace(/"/g, "”")
    .replace(/'/g, "’");
}

/** Typesets every string in a parsed case or other plain data. Ids never hold quotes, so they pass through unchanged. */
export function typesetAll<T>(value: T): T {
  if (typeof value === "string") return typeset(value) as T;
  if (Array.isArray(value)) return value.map(typesetAll) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, typesetAll(v)])) as T;
  }
  return value;
}
