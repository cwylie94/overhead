export const UUID_RANDOM_BYTES = 10;

function hex(bytes: number[]): string {
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function uuidv7(time: number, random: Uint8Array): string {
  if (random.length < UUID_RANDOM_BYTES) {
    throw new Error(`uuidv7 needs ${UUID_RANDOM_BYTES} random bytes`);
  }
  const bytes: number[] = [];
  let remaining = Math.floor(time);
  for (let index = 5; index >= 0; index--) {
    bytes[index] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }
  bytes[6] = 0x70 | (random[0]! & 0x0f);
  bytes[7] = random[1]!;
  bytes[8] = 0x80 | (random[2]! & 0x3f);
  for (let index = 3; index < UUID_RANDOM_BYTES; index++) {
    bytes[index + 6] = random[index]!;
  }
  const value = hex(bytes);
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}
