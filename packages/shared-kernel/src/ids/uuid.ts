import { invalid, ok } from '../errors/result.ts';
import type { Result } from '../errors/result.ts';

import type { Brand } from './brand.ts';

/** A canonical lowercase UUID string. */
export type Uuid = Brand<string, 'Uuid'>;

/** A UUID that identifies a particular kind of entity: `Id<'User'>`, `Id<'JournalEntry'>`. */
export type Id<Entity extends string> = Uuid & { readonly __entity: Entity };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isUuid(value: unknown): value is Uuid {
  return typeof value === 'string' && UUID.test(value);
}

/** Accepts any case; returns the canonical lowercase form. */
export function parseUuid(text: string): Result<Uuid> {
  const lower = text.toLowerCase();
  return isUuid(lower) ? ok(lower) : invalid(`Not a UUID: "${text}"`);
}

/** Tag a validated UUID with its entity type. */
export function asId<Entity extends string>(uuid: Uuid): Id<Entity> {
  return uuid as Id<Entity>;
}

export interface UuidV7Source {
  /** Milliseconds since the Unix epoch. */
  now(): number;
  /** Fill the array with cryptographically secure random bytes. */
  fill(bytes: Uint8Array<ArrayBuffer>): void;
}

const secureSource: UuidV7Source = {
  now: () => Date.now(),
  fill: (bytes) => {
    globalThis.crypto.getRandomValues(bytes);
  },
};

const MAX_COUNTER = 0xfff;

/**
 * UUIDv7 generator (RFC 9562): 48-bit millisecond timestamp, version 7, a 12-bit counter
 * (method 1, so IDs made in the same millisecond still sort in creation order), variant 10,
 * then 62 random bits. IDs sort by creation time, which keeps B-tree indexes compact.
 *
 * If the clock stands still or goes backwards, the counter keeps IDs increasing; when the
 * counter overflows, the timestamp advances by 1 ms.
 */
export function createUuidV7Generator(source: UuidV7Source = secureSource): () => Uuid {
  let lastMs = -1;
  let counter = 0;
  const seedBytes = new Uint8Array(2);

  function freshCounter(): number {
    source.fill(seedBytes);
    // Leave the top bit clear so there is room to count within the millisecond.
    return new DataView(seedBytes.buffer).getUint16(0) & 0x7ff;
  }

  return function uuidV7(): Uuid {
    const now = source.now();
    if (now > lastMs) {
      lastMs = now;
      counter = freshCounter();
    } else if (counter < MAX_COUNTER) {
      counter += 1;
    } else {
      lastMs += 1;
      counter = freshCounter();
    }

    const bytes = new Uint8Array(16);
    const view = new DataView(bytes.buffer);
    source.fill(bytes.subarray(8));
    view.setUint32(0, Math.floor(lastMs / 0x10000));
    view.setUint16(4, lastMs % 0x10000);
    view.setUint16(6, 0x7000 | counter);
    view.setUint8(8, (view.getUint8(8) & 0x3f) | 0x80);

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as Uuid;
  };
}

/** The process-wide UUIDv7 generator. */
export const uuidV7: () => Uuid = createUuidV7Generator();

/** Milliseconds since the epoch encoded in a UUIDv7. */
export function uuidV7Timestamp(id: Uuid): number {
  return Number.parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
}
