import { cn } from "@/lib/utils";
import { normalizeAvatarSrc } from "@/lib/format";

interface AvatarProps {
    src?: string | null;
    name?: string | null;
    className?: string;
    imageClassName?: string;
}

export function Avatar({ src, name, className, imageClassName }: AvatarProps) {
    const normalized = normalizeAvatarSrc(src);
    const fallback = name?.[0] ?? "?";

    return (
        <div
            className={cn(
                "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground",
                className,
            )}
        >
            {normalized ? (
                <img
                    src={normalized}
                    alt={name || "用户头像"}
                    referrerPolicy="no-referrer"
                    className={cn("h-full w-full object-cover", imageClassName)}
                />
            ) : (
                fallback
            )}
        </div>
    );
}
