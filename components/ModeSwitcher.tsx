"use client";

import Link from "next/link";
import { useMemo } from "react";

type ModeSwitcherProps = {
  currentMode?: string;
  workerEnabled?: boolean;
  hirerEnabled?: boolean;
  className?: string;
};

export default function ModeSwitcher({
  currentMode = "all",
  workerEnabled = false,
  hirerEnabled = false,
  className = "",
}: ModeSwitcherProps) {
  const safeMode = useMemo(() => {
    if (currentMode === "worker" || currentMode === "hirer" || currentMode === "all") {
      return currentMode;
    }
    return "all";
  }, [currentMode]);

  const options = [
    {
      key: "all",
      label: "All",
      visible: workerEnabled && hirerEnabled,
      href: "/dashboard?mode=all",
    },
    {
      key: "worker",
      label: "Worker view",
      visible: workerEnabled,
      href: "/dashboard?mode=worker",
    },
    {
      key: "hirer",
      label: "Hirer view",
      visible: hirerEnabled,
      href: "/dashboard?mode=hirer",
    },
  ].filter((item) => item.visible);

  if (options.length <= 1) {
    return null;
  }

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm ${className}`}
    >
      {options.map((option) => {
        const active = safeMode === option.key;

        return (
          <Link
            key={option.key}
            href={option.href}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

