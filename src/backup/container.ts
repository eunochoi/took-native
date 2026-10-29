import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';

// v1: magic (8), password salt (16), file salt (32), then framed AES-256-GCM.
// Every frame authenticates the complete header, sequence number and frame length.
// An authenticated empty terminal frame makes truncation and concatenation invalid.
export const BLOO_MAGIC = utf8ToBytes('BLOO0001');
export const BLOO_HEADER_BYTES = 56;
export const BLOO_CHUNK_BYTES = 256 * 1024;
export const BLOO_MAX_BYTES = 1024 * 1024 * 1024 + 1024 * 1024;
export const PASSWORD_ROUNDS = 600_000;
export interface BackupCredential {
  salt: Uint8Array;
  key: Uint8Array;
}
export interface BackupCipher {
  derive?: (password: string, salt: Uint8Array) => Promise<Uint8Array>;
  random: (size: number) => Promise<Uint8Array>;
  seal: (data: Uint8Array, key: Uint8Array, aad: Uint8Array) => Promise<Uint8Array>;
  open: (data: Uint8Array, key: Uint8Array, aad: Uint8Array) => Promise<Uint8Array>;
}
const integer = (value: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
};
export function validatePassword(password: string) {
  if (password.length < 8 || utf8ToBytes(password).length > 1024)
    throw new Error('BLOO_PASSWORD_LENGTH');
}
export async function deriveBackupKey(password: string, salt: Uint8Array) {
  if (salt.length !== 16 || utf8ToBytes(password).length > 1024) throw new Error('BLOO_INVALID');
  return pbkdf2Async(sha256, utf8ToBytes(password), salt, {
    c: PASSWORD_ROUNDS,
    dkLen: 32,
    asyncTick: 10,
  });
}
export function validateBlooHeader(header: Uint8Array) {
  if (header.length !== BLOO_HEADER_BYTES || !BLOO_MAGIC.every((byte, i) => header[i] === byte))
    throw new Error('BLOO_INVALID');
}
export async function encryptBloo(
  source: AsyncIterable<Uint8Array>,
  credential: BackupCredential,
  cipher: BackupCipher,
  write: (bytes: Uint8Array) => void,
) {
  if (credential.salt.length !== 16 || credential.key.length !== 32)
    throw new Error('BLOO_INVALID');
  const header = concatBytes(BLOO_MAGIC, credential.salt, await cipher.random(32));
  const key = hkdf(
    sha256,
    credential.key,
    header.subarray(24),
    utf8ToBytes('BlooLog backup v1'),
    32,
  );
  let sequence = 0;
  let total = header.length;
  try {
    write(header);
    for await (const bytes of source) {
      for (let offset = 0; offset < bytes.length; offset += BLOO_CHUNK_BYTES) {
        const chunk = bytes.subarray(offset, offset + BLOO_CHUNK_BYTES);
        const length = integer(chunk.length + 28);
        const sealed = await cipher.seal(
          chunk,
          key,
          concatBytes(header, integer(sequence++), length),
        );
        if (sealed.length !== chunk.length + 28) throw new Error('BLOO_INVALID');
        total += sealed.length + 4;
        if (total + 32 > BLOO_MAX_BYTES) throw new Error('BLOO_TOO_LARGE');
        write(length);
        write(sealed);
      }
    }
    const length = integer(28);
    write(length);
    write(await cipher.seal(new Uint8Array(), key, concatBytes(header, integer(sequence), length)));
  } finally {
    key.fill(0);
  }
}
export async function* decryptBloo(
  read: (size: number) => Uint8Array,
  passwordOrCredential: string | BackupCredential,
  cipher: BackupCipher,
): AsyncGenerator<Uint8Array> {
  const header = read(BLOO_HEADER_BYTES);
  validateBlooHeader(header);
  const salt = header.subarray(8, 24);
  const master =
    typeof passwordOrCredential === 'string'
      ? await (cipher.derive ?? deriveBackupKey)(passwordOrCredential, salt)
      : passwordOrCredential.key.slice();
  if (
    typeof passwordOrCredential !== 'string' &&
    !salt.every((value, index) => value === passwordOrCredential.salt[index])
  ) {
    master.fill(0);
    throw new Error('BLOO_PASSWORD_OR_DAMAGED');
  }
  const key = hkdf(sha256, master, header.subarray(24), utf8ToBytes('BlooLog backup v1'), 32);
  master.fill(0);
  let sequence = 0;
  let total = header.length;
  try {
    while (true) {
      const lengthBytes = read(4);
      if (lengthBytes.length !== 4) throw new Error('BLOO_INVALID');
      const length = new DataView(lengthBytes.buffer, lengthBytes.byteOffset, 4).getUint32(0);
      total += length + 4;
      if (length < 28 || length > BLOO_CHUNK_BYTES + 28 || total > BLOO_MAX_BYTES)
        throw new Error('BLOO_INVALID');
      const sealed = read(length);
      if (sealed.length !== length) throw new Error('BLOO_INVALID');
      let bytes: Uint8Array;
      try {
        bytes = await cipher.open(
          sealed,
          key,
          concatBytes(header, integer(sequence++), lengthBytes),
        );
      } catch {
        throw new Error('BLOO_PASSWORD_OR_DAMAGED');
      }
      if (length === 28) {
        if (read(1).length) throw new Error('BLOO_INVALID');
        return;
      }
      yield bytes;
    }
  } finally {
    key.fill(0);
  }
}
