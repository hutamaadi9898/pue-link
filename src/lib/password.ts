const iterations = 100_000;

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) {
    value += String.fromCharCode(byte);
  }
  return btoa(value);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index];
  }

  return diff === 0;
}

async function derive(password: string, salt: Uint8Array, iterationCount = iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: iterationCount
    },
    keyMaterial,
    256
  );

  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await derive(password, salt);
  return `pbkdf2_sha256$${iterations}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

export async function verifyPassword({ hash, password }: { hash: string; password: string }) {
  const [algorithm, iterationValue, saltValue, hashValue] = hash.split("$");
  const iterationCount = Number(iterationValue);
  if (algorithm !== "pbkdf2_sha256" || !Number.isSafeInteger(iterationCount) || !saltValue || !hashValue) {
    return false;
  }

  const expectedHash = base64ToBytes(hashValue);
  const actualHash = await derive(password, base64ToBytes(saltValue), iterationCount);
  return timingSafeEqual(actualHash, expectedHash);
}
