import { cn } from "@/lib/utils";

interface PageHeaderProps {
    icon?: React.ReactNode;
    /** Tailwind classes for the icon container tone, e.g. "bg-orange-500/15 text-orange-300". */
    iconClass?: string;
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({ icon, iconClass, title, description, actions, className }: PageHeaderProps) {
    return (
        <section className={cn("shrink-0 rounded-xl border border-border bg-card px-4 py-2.5", className)}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    {icon && (
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconClass ?? "bg-primary/15 text-primary")}>
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-bold text-foreground md:text-xl">{title}</h1>
                        {description && (
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{description}</div>
                        )}
                    </div>
                </div>
                {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
            </div>
        </section>
    );
}
