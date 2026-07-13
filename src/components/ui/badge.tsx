import { cn } from "@/lib/utils";

interface BadgeProps {
    children: React.ReactNode;
    className?: string;
}

export function Badge({ children, className }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex h-5 items-center rounded-md border px-1.5 text-[10px] font-semibold",
                className,
            )}
        >
            {children}
        </span>
    );
}
