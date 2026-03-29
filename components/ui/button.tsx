import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
};

export function Button({
  className,
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "default" && "bg-indigo-600 text-white hover:bg-indigo-700",
        variant === "outline" && "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
        variant === "ghost" && "bg-transparent text-slate-700 hover:bg-slate-100",
        className
      )}
      {...props}
    />
  );
}

