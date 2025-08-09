"use client";
import AuthButton from "@/components/AuthButton";
import { usePathname } from "next/navigation";

/**
 * Minimal top bar that only renders on selected routes
 * to avoid duplicating existing page headers.
 *
 * Currently shown only on /auth. Extend the allowlist if needed.
 */
export default function TopBar() {
  const pathname = usePathname();

  // Only render the header on these routes
  const showOnRoutes = ["/auth"];
  const shouldShow = showOnRoutes.some((p) =>
    p === pathname || (p.endsWith("/") && pathname.startsWith(p))
  );

  if (!shouldShow) return null;

  return (
    <header className="sticky top-0 z-40 border-b bg-white/60 dark:bg-black/60 backdrop-blur">
      <div className="mx-auto max-w-6xl w-full flex items-center justify-between p-3">
        <a href="/" className="font-semibold">GearX</a>
        <AuthButton />
      </div>
    </header>
  );
}