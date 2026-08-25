/** Shared URL date-param helpers for server pages (analytics / ranking). */

export function getFirstParam(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

export function formatDateParam(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function parseDateParam(value: string | undefined): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        ? date
        : null;
}

export function startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Resolves from/to search params into a normalized ordered range (defaults to today or defaultDaysBack). */
export function resolveDateRangeParams(
    params: Record<string, string | string[] | undefined> | undefined,
    defaultDaysBack = 0
) {
    const today = new Date();
    const defaultFrom = defaultDaysBack > 0 ? new Date(today.getTime() - defaultDaysBack * 86400000) : today;
    const fromDate = parseDateParam(getFirstParam(params?.from)) ?? defaultFrom;
    const toDate = parseDateParam(getFirstParam(params?.to)) ?? today;
    const normalizedFrom = fromDate.getTime() <= toDate.getTime() ? fromDate : toDate;
    const normalizedTo = fromDate.getTime() <= toDate.getTime() ? toDate : fromDate;

    return {
        from: formatDateParam(normalizedFrom),
        to: formatDateParam(normalizedTo),
        startTime: startOfLocalDay(normalizedFrom).getTime(),
        endTime: endOfLocalDay(normalizedTo).getTime(),
    };
}
