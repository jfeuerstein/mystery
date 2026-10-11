// Sealing (GAME_DESIGN.md §14.6): gzip, then AES-GCM, then base64.
//
// This is spoiler protection, not security. The key ships in the app; it
// only has to stop the player reading a case by accident. Uses Web APIs
// available in both Node 22 and iOS Safari 16.4+.

const KEY_B64 = "UctFFWwKoM+cJqqt4JjcPhN0lxa+wwQ7WpPcbDHjShM=";
const MAGIC = "afoot-sealed-v1:";

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

let keyPromise: Promise<CryptoKey> | undefined;
function key(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey("raw", fromBase64(KEY_B64), "AES-GCM", false, ["encrypt", "decrypt"]);
  return keyPromise;
}

/** Seals any JSON-serializable value into a text blob. */
export async function seal(value: unknown): Promise<string> {
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const zipped = await pipe(plain, new CompressionStream("gzip"));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), zipped));
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv);
  out.set(cipher, iv.length);
  return MAGIC + toBase64(out);
}

/** Opens a blob made by `seal`. Throws if it was tampered with or isn't one. */
export async function unseal<T = unknown>(blob: string): Promise<T> {
  const text = blob.trim();
  if (!text.startsWith(MAGIC)) throw new Error("not a sealed blob");
  const bytes = fromBase64(text.slice(MAGIC.length));
  const iv = bytes.subarray(0, 12);
  const cipher = bytes.subarray(12);
  const zipped = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await key(), cipher));
  const plain = await pipe(zipped, new DecompressionStream("gzip"));
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

/** The spoiler-free index of sealed cases (`content/sealed/index.json`). */
export type SealedIndex = {
  version: 1;
  cases: { season: number; number: number; file: string }[];
};
