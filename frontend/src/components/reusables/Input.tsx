"use client";
import React, { useState } from "react";

import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  return (
    <div className="relative flex flex-row items-center">
      <input
        type={showPassword ? "text" : "password"}
        name="password"
        id="password"
        placeholder="Password"
        className={cn(
          "h-9 w-full min-w-0 rounded-md border border-input bg-transparent py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30 pl-3 pr-14",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          className,
        )}
        ref={ref}
        {...props}
      />
      <button
        type="button"
        className="absolute right-5"
        aria-label={showPassword ? "Hide password" : "Show password"}
        onClick={() => setShowPassword((prevState) => !prevState)}
      >
        {showPassword ? (
          <Eye className="opacity-60 size-5" />
        ) : (
          <EyeOff className="opacity-60 size-5" />
        )}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
