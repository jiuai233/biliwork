import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
    LIVE_RECONNECT_MAX_MS,
    LIVE_START_CONCURRENCY,
    LIVE_START_SPACING_MS,
    NORMAL_START_SPACING_MS,
    liveStartSlotsAvailable,
    partitionStartOrder,
    reconnectBackoffMs,
    startSpacingMs,
} from './startPolicy.ts';

describe('reconnectBackoffMs', () => {
    test('grows exponentially and caps', () => {
        assert.equal(reconnectBackoffMs(1, false), 5_000);
        assert.equal(reconnectBackoffMs(2, false), 10_000);
        assert.equal(reconnectBackoffMs(3, false), 20_000);
        assert.equal(reconnectBackoffMs(10, false), 300_000);
        assert.equal(reconnectBackoffMs(10, true), LIVE_RECONNECT_MAX_MS);
    });

    test('live rooms reconnect faster', () => {
        assert.equal(reconnectBackoffMs(1, true), 2_000);
        assert.ok(reconnectBackoffMs(1, true) < reconnectBackoffMs(1, false));
    });
});

describe('startSpacingMs', () => {
    test('keeps live queue tight', () => {
        assert.equal(startSpacingMs(true), LIVE_START_SPACING_MS);
        assert.equal(startSpacingMs(false), NORMAL_START_SPACING_MS);
    });
});

describe('liveStartSlotsAvailable', () => {
    test('allows 3 live starts at a time', () => {
        assert.equal(LIVE_START_CONCURRENCY, 3);
        assert.equal(liveStartSlotsAvailable(0), 3);
        assert.equal(liveStartSlotsAvailable(2), 1);
        assert.equal(liveStartSlotsAvailable(3), 0);
        assert.equal(liveStartSlotsAvailable(5), 0);
    });
});

describe('partitionStartOrder', () => {
    test('puts live auth codes first without dropping anyone', () => {
        const { live, rest } = partitionStartOrder([
            { authCode: 'a', live: false },
            { authCode: 'b', live: true },
            { authCode: 'c', live: false },
            { authCode: 'd', live: true },
        ]);
        assert.deepEqual(live, ['b', 'd']);
        assert.deepEqual(rest, ['a', 'c']);
    });
});
