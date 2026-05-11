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
                    "block h-11 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-zinc-100 shadow-sm outline-none transition-colors placeholder:text-zinc-500 hover:border-white/20 hover:bg-white/[0.07] focus:border-violet-400/70 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export { Input };
