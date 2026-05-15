"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Parity" },
  { href: "/team", label: "Team Activity" },
];

export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 border-b border-border">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative px-4 py-2 text-sm font-medium transition ${
              active ? "text-text" : "text-muted hover:text-text"
            }`}
          >
            {t.label}
            {active ? (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-ok" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
