"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant", // smooth bhi use kar sakta hai
      });
    };

    // thoda delay zaroori hai Next.js ke liye
    const timeout = setTimeout(handleScroll, 50);

    return () => clearTimeout(timeout);
  }, [pathname]);

  return null;
}