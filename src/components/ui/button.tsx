import * as React from "react";
import { Button as HeroButton, type ButtonProps as HeroButtonProps } from "@heroui/react";

import { cn } from "@/lib/utils";

type LocalVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type LocalSize = "default" | "sm" | "lg" | "icon";

const variantMap: Record<LocalVariant, NonNullable<HeroButtonProps["variant"]>> = {
    default: "primary",
    destructive: "danger",
    outline: "outline",
    secondary: "secondary",
    ghost: "ghost",
    link: "ghost",
};

const sizeMap: Record<LocalSize, NonNullable<HeroButtonProps["size"]>> = {
    default: "md",
    sm: "sm",
    lg: "lg",
    icon: "md",
};

export interface ButtonProps extends Omit<HeroButtonProps, "variant" | "size" | "isDisabled"> {
    variant?: LocalVariant | HeroButtonProps["variant"];
    size?: LocalSize | HeroButtonProps["size"];
    disabled?: boolean;
    isDisabled?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", disabled, isDisabled, ...props }, ref) => {
        const heroVariant = variantMap[variant as LocalVariant] ?? (variant as HeroButtonProps["variant"]);
        const heroSize = sizeMap[size as LocalSize] ?? (size as HeroButtonProps["size"]);

        return (
            <HeroButton
                ref={ref}
                variant={heroVariant}
                size={heroSize}
                isDisabled={isDisabled ?? disabled}
                className={cn(
                    "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/45 disabled:pointer-events-none disabled:opacity-50",
                    size === "sm" && "min-h-9 px-3",
                    size === "lg" && "min-h-11 px-8 text-base",
                    size === "icon" && "h-10 min-h-10 w-10 px-0",
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };
