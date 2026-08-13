import { cn } from "@/lib/utils";

export type StatTone = "sky" | "pink" | "indigo" | "emerald" | "orange" | "blue" | "purple" | "amber" | "yellow" | "neutral";

const toneMap: Record<StatTone, { label: string; icon: string }> = {
    sky: { label: "text-sky-300", icon: "bg-sky-500/15 text-sky-300" },
    pink: { label: "text-pink-300", icon: "bg-pink-500/15 text-pink-300" },
    indigo: { label: "text-indigo-300", icon: "bg-indigo-500/15 text-indigo-300" },
    emerald: { label: "text-emerald-300", icon: "bg-emerald-500/15 text-emerald-300" },
    orange: { label: "text-orange-300", icon: "bg-orange-500/15 text-orange-300" },
    blue: { label: "text-blue-300", icon: "bg-blue-500/15 text-blue-300" },
    purple: { label: "text-purple-300", icon: "bg-purple-500/15 text-purple-300" },
    amber: { label: "text-amber-300", icon: "bg-amber-500/15 text-amber-300" },
    yellow: { label: "text-yellow-300", icon: "bg-yellow-500/15 text-yellow-300" },
    neutral: { label: "text-muted-foreground", icon: "bg-accent text-muted-foreground" },
};

interface StatCardProps {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
    tone?: StatTone;
    sub?: React.ReactNode;
    delta?: React.ReactNode;
    className?: string;
}

export function StatCard({ label, value, icon, tone = "neutral", sub, delta, className }: StatCardProps) {
    const styles = toneMap[tone];

    return (
        <section className={cn("rounded-xl border border-border bg-card px-3.5 py-3", className)}>
            <div className="flex items-center justify-between gap-2">
                <p className={cn("truncate text-xs font-semibold", styles.label)}>{label}</p>
                {icon && <div className="shrink-0 text-zinc-500">{icon}</div>}
            </div>
            <div className="mt-1.5 text-xl font-bold tracking-tight text-foreground tabular-nums md:text-2xl">{value}</div>
            {(delta || sub) && (
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground tabular-nums">
                    {delta}
                    {sub}
                </div>
            )}
        </section>
    );
}
