import * as React from "react";
import { Input as HeroInput, type InputProps as HeroInputProps } from "@heroui/react";

import { cn } from "@/lib/utils";

export interface InputProps extends HeroInputProps {
    isDisabled?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, disabled, isDisabled, variant = "secondary", fullWidth = true, ...props }, ref) => {
        return (
            <HeroInput
                ref={ref}
                variant={variant}
                fullWidth={fullWidth}
                disabled={disabled ?? isDisabled}
                className={cn(
                    "block h-11 w-full rounded-lg border border-border bg-accent/40 px-3 py-2 text-base text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-input hover:bg-accent/60 focus:border-primary/70 focus:bg-accent/60 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
                    className
                )}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export { Input };
