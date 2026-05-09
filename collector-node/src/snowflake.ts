const epoch = 1288834974657n;
const nodeIdBits = 10n;
const sequenceBits = 12n;
const maxNodeId = (1n << nodeIdBits) - 1n;
const sequenceMask = (1n << sequenceBits) - 1n;

let nodeId = 1n;
let sequence = 0n;
let lastTimestamp = -1n;

export function initSnowflake(id: number) {
    const nextNodeId = BigInt(id);
    if (nextNodeId < 0n || nextNodeId > maxNodeId) {
        throw new Error(`snowflake node id must be between 0 and ${maxNodeId.toString()}`);
    }
    nodeId = nextNodeId;
}

function nowMs() {
    return BigInt(Date.now());
}

function waitNextMillis(previous: bigint) {
    let timestamp = nowMs();
    while (timestamp <= previous) {
        timestamp = nowMs();
    }
    return timestamp;
}

export function generateSnowflakeId(): string {
    let timestamp = nowMs();

    if (timestamp < lastTimestamp) {
        timestamp = lastTimestamp;
    }

    if (timestamp === lastTimestamp) {
        sequence = (sequence + 1n) & sequenceMask;
        if (sequence === 0n) {
            timestamp = waitNextMillis(lastTimestamp);
        }
    } else {
        sequence = 0n;
    }

    lastTimestamp = timestamp;

    return (((timestamp - epoch) << (nodeIdBits + sequenceBits)) |
        (nodeId << sequenceBits) |
        sequence).toString();
}
