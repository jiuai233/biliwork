/**
 * Shared chrome for HeroUI Table.Content across data pages.
 * Sticky header + consistent row borders/hover on the unified dark palette.
 */
export const tableChrome =
    "w-full table-fixed border-collapse " +
    "[&_tbody_tr]:border-b [&_tbody_tr]:border-border [&_tbody_tr:last-child]:border-b-0 [&_tbody_tr:hover]:bg-accent " +
    "[&_td]:px-4 [&_td]:py-2 " +
    "[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:border-b [&_th]:border-border [&_th]:bg-popover [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:text-secondary-foreground";
