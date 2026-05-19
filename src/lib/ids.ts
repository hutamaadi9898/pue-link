const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function createId(prefix: string) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `${prefix}_${body}`;
}

export function createBarcodeToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return `pue_${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}
