import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RefreshIconButtonProps {
    loading?: boolean;
    onClick: () => void;
    className?: string;
}

export function RefreshIconButton({ loading, onClick, className }: RefreshIconButtonProps) {
    return (
        <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClick}
            disabled={loading}
            aria-label="刷新"
            className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-accent/50 p-0 text-foreground hover:bg-accent",
                className,
            )}
        >
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
    );
}
