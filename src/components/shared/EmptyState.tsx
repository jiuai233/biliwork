import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon, title, description, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-10 text-center text-muted-foreground", className)}>
            {icon && <div className="mb-4 rounded-full bg-accent p-5 text-muted-foreground">{icon}</div>}
            <div className="text-base font-semibold text-foreground">{title}</div>
            {description && <p className="mt-2 text-sm">{description}</p>}
        </div>
    );
}
