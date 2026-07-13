import { cn } from "@/lib/utils";

interface SectionCardProps {
    title?: React.ReactNode;
    /** Tailwind bg class for the accent bar next to the title, e.g. "bg-orange-500". */
    accent?: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
    /** Applied to the body wrapper; defaults to no padding so scroll containers can go edge-to-edge. */
    bodyClassName?: string;
    children: React.ReactNode;
}

export function SectionCard({ title, accent, icon, actions, className, bodyClassName, children }: SectionCardProps) {
    return (
        <section className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
            {(title || actions) && (
                <div className="flex shrink-0 flex-col gap-2 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <h2 className="flex min-w-0 items-center gap-2.5 text-base font-bold text-foreground">
                        {accent && <span className={cn("h-5 w-1 shrink-0 rounded-full", accent)} />}
                        {icon}
                        {title}
                    </h2>
                    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </div>
            )}
            <div className={cn("min-h-0", bodyClassName)}>{children}</div>
        </section>
    );
}
