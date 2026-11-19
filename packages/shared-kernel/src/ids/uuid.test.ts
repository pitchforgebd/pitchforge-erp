import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { unwrap } from '../errors/result.ts';

import { asId, createUuidV7Generator, isUuid, parseUuid, uuidV7, uuidV7Timestamp } from './uuid.ts';
import type { Id, Uuid, UuidV7Source } from './uuid.ts';

const V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** A clock the test controls and a byte source that always returns `fillByte`. */
function fakeSource(start: number, fillByte = 0xab): UuidV7Source & { time: number } {
  const source = {
    time: start,
    now: () => source.time,
    fill: (bytes: Uint8Array) => {
      bytes.fill(fillByte);
    },
  };
  return source;
}

describe('parseUuid / isUuid / asId', () => {
  it('accepts any case and returns lowercase', () => {
    expect(unwrap(parseUuid('0190F2A4-7C3B-7D2E-8F00-0123456789AB'))).toBe(
      '0190f2a4-7c3b-7d2e-8f00-0123456789ab',
    );
  });

  it.each([
    '',
    'not-a-uuid',
    '0190f2a4-7c3b-7d2e-8f00-0123456789a',
    '0190f2a47c3b7d2e8f000123456789ab',
  ])('rejects "%s"', (text) => {
    expect(parseUuid(text).ok).toBe(false);
  });

  it('isUuid needs a canonical string', () => {
    expect(isUuid('0190f2a4-7c3b-7d2e-8f00-0123456789ab')).toBe(true);
    expect(isUuid('0190F2A4-7C3B-7D2E-8F00-0123456789AB')).toBe(false);
    expect(isUuid(42)).toBe(false);
  });

  it('asId tags a UUID with its entity type without changing it', () => {
    const uuid = unwrap(parseUuid('0190f2a4-7c3b-7d2e-8f00-0123456789ab'));
    const userId: Id<'User'> = asId<'User'>(uuid);
    expect(userId).toBe(uuid);
  });
});

describe('UUIDv7', () => {
  it('has version 7, variant 10 and the timestamp', () => {
    const t = Date.UTC(2026, 10, 4, 8, 30);
    const id = createUuidV7Generator(fakeSource(t))();
    expect(id).toMatch(V7);
    expect(uuidV7Timestamp(id)).toBe(t);
  });

  it('masks random bytes into the version, variant and counter fields', () => {
    const id = createUuidV7Generator(fakeSource(0, 0xff))();
    // counter seed 0xffff & 0x7ff = 0x7ff → "77ff"; variant byte 0xff → 0xbf
    expect(id).toBe('00000000-0000-77ff-bfff-ffffffffffff');
  });

  it('keeps increasing within one millisecond, across counter overflow and if the clock goes back', () => {
    const source = fakeSource(1_700_000_000_000, 0x00);
    const next = createUuidV7Generator(source);
    const ids: Uuid[] = [];
    for (let i = 0; i < 5000; i += 1) ids.push(next()); // > 4096: forces counter overflow
    source.time -= 10_000; // clock jumps back 10 s
    for (let i = 0; i < 100; i += 1) ids.push(next());
    source.time += 1_000_000; // clock moves on
    ids.push(next());

    for (const id of ids) expect(id).toMatch(V7);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
    expect(uuidV7Timestamp(ids.at(-1) ?? ids[0]!)).toBe(source.time);
  });

  it('the default generator uses the real clock and secure random bytes', () => {
    const before = Date.now();
    const a = uuidV7();
    const b = uuidV7();
    expect(a).toMatch(V7);
    expect(b).toMatch(V7);
    expect(a < b).toBe(true);
    expect(uuidV7Timestamp(a)).toBeGreaterThanOrEqual(before);
  });

  it('sorts in creation order for any non-decreasing clock', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 2, maxLength: 200 }),
        (steps) => {
          const source = fakeSource(1_700_000_000_000);
          const next = createUuidV7Generator({
            now: () => source.time,
            fill: (bytes) => {
              globalThis.crypto.getRandomValues(bytes);
            },
          });
          const ids = steps.map((step) => {
            source.time += step;
            return next();
          });
          return ids.every((id, i) => i === 0 || (ids[i - 1] ?? '') < id);
        },
      ),
    );
  });
});
