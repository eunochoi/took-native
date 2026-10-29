import { nodeBackupCipher as cipher } from './helpers/backup-cipher';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { concatBytes } from '@noble/hashes/utils.js';
import {
  encryptBloo,
  decryptBloo,
  deriveBackupKey,
  validatePassword,
  BLOO_HEADER_BYTES,
  PASSWORD_ROUNDS,
  type BackupCredential,
} from '../src/backup/container';
import { backupDay, expiredBackups, parseAutomaticBackup } from '../src/backup/policy';
const credential: BackupCredential = { salt: randomBytes(16), key: randomBytes(32) };
async function encode(plain: Uint8Array, custom = credential) {
  const output: Uint8Array[] = [];
  await encryptBloo(
    (async function* () {
      yield plain;
    })(),
    custom,
    cipher,
    (bytes) => output.push(bytes),
  );
  return concatBytes(...output);
}
async function decode(bytes: Uint8Array, password: string | typeof credential = credential) {
  let offset = 0;
  const output: Uint8Array[] = [];
  for await (const part of decryptBloo(
    (size) => {
      const result = bytes.subarray(offset, offset + size);
      offset += result.length;
      return result;
    },
    password,
    cipher,
  ))
    output.push(part);
  return concatBytes(...output);
}
test('BLOO roundtrips bounded frames, hides plaintext, and uses fresh file salts', async () => {
  const plain = randomBytes(600_000);
  const first = await encode(plain);
  assert.deepEqual(await decode(first), new Uint8Array(plain));
  const second = await encode(plain);
  assert.notDeepEqual(first, second);
  assert(!Buffer.from(first).includes(plain.subarray(0, 32)));
});
test('password derivation matches standard PBKDF2 SHA256 and restores without device key', async () => {
  const password = '비밀번호 🔐 with spaces';
  const salt = randomBytes(16);
  const key = await deriveBackupKey(password, salt);
  assert.deepEqual(key, new Uint8Array(pbkdf2Sync(password, salt, PASSWORD_ROUNDS, 32, 'sha256')));
  const bytes = await encode(new Uint8Array([1, 2, 3]), { salt, key });
  assert.deepEqual(await decode(bytes, password), new Uint8Array([1, 2, 3]));
  await assert.rejects(decode(bytes, 'wrong password'), /PASSWORD_OR_DAMAGED/);
});
test('BLOO rejects altered header, payload, frame ordering, truncation and trailing bytes', async () => {
  const bytes = await encode(randomBytes(600_000));
  for (const index of [0, 8, 24, BLOO_HEADER_BYTES + 4 + 12, bytes.length - 1]) {
    const changed = bytes.slice();
    changed[index] ^= 1;
    await assert.rejects(decode(changed));
  }
  for (const end of [0, 55, 56, bytes.length - 1, bytes.length - 32])
    await assert.rejects(decode(bytes.subarray(0, end)));
  await assert.rejects(decode(concatBytes(bytes, new Uint8Array([0]))));
  const length =
    new DataView(bytes.buffer, bytes.byteOffset + BLOO_HEADER_BYTES, 4).getUint32(0) + 4;
  const swapped = concatBytes(
    bytes.subarray(0, BLOO_HEADER_BYTES),
    bytes.subarray(BLOO_HEADER_BYTES + length, BLOO_HEADER_BYTES + length * 2),
    bytes.subarray(BLOO_HEADER_BYTES, BLOO_HEADER_BYTES + length),
    bytes.subarray(BLOO_HEADER_BYTES + length * 2),
  );
  await assert.rejects(decode(swapped));
});
test('BLOO rejects another device credential and empty passwords when creating backups', async () => {
  await assert.rejects(
    decode(await encode(new Uint8Array([4])), { salt: credential.salt, key: randomBytes(32) }),
  );
  assert.throws(() => validatePassword('short'));
  assert.doesNotThrow(() => validatePassword('long password'));
});
test('retention keeps newest backup per date for three successful dates, preserves other devices', () => {
  const device = 'a'.repeat(16);
  const name = (day: string, time: number, id = device) =>
    `bloolog-${id}-${day}-${time}-${'b'.repeat(16)}.bloo`;
  const names = [
    name('2026-10-28', 5),
    name('2026-10-28', 4),
    name('2026-10-25', 3),
    name('2026-10-20', 2),
    name('2026-10-18', 1),
  ];
  const entries = names.map((value) => parseAutomaticBackup(value, device)!);
  assert.deepEqual(
    expiredBackups(entries).map((entry) => entry.name),
    [names[1], names[4]],
  );
  assert.equal(parseAutomaticBackup(name('2026-10-28', 6, 'c'.repeat(16)), device), null);
  assert.equal(parseAutomaticBackup(`${names[0]}.pending`, device), null);
  assert.equal(parseAutomaticBackup('manual.bloo', device), null);
  assert.equal(backupDay(new Date(2026, 9, 28, 0, 1)), '2026-10-28');
});

test('retention always protects the just-confirmed file after the device clock moves backwards', () => {
  const entries = [
    { name: 'old-future', day: '2026-11-01', created: 100 },
    { name: 'old-yesterday', day: '2026-10-31', created: 90 },
    { name: 'old-other', day: '2026-10-30', created: 80 },
    { name: 'just-confirmed', day: '2026-10-28', created: 1 },
  ];
  assert.deepEqual(
    expiredBackups(entries, 'just-confirmed').map((entry) => entry.name),
    ['old-other'],
  );
});
