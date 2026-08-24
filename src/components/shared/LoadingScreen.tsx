import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
    className?: string;
    tone?: "violet" | "orange" | "emerald" | "sky";
}

const toneClass = {
    violet: "text-violet-400",
    orange: "text-orange-400",
    emerald: "text-emerald-400",
    sky: "text-sky-400",
} as const;

export function LoadingScreen({ className, tone = "violet" }: LoadingScreenProps) {
    return (
        <div role="status" className={cn("flex h-[50vh] items-center justify-center", className)}>
            <Loader2 className={cn("h-8 w-8 animate-spin", toneClass[tone])} aria-hidden="true" />
            <span className="sr-only">加载中</span>
        </div>
    );
}
