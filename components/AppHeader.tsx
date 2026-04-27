"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  stats?: React.ReactNode;
};

export default function AppHeader({ stats }: Props) {
  const pathname = usePathname() ?? "/";
  const tabs: Array<{ label: string; href: string; match: (p: string) => boolean }> = [
    {
      label: "Network",
      href: "/",
      match: (p) => p === "/",
    },
    {
      label: "Projects",
      href: "/projects",
      match: (p) => p.startsWith("/projects"),
    },
    {
      label: "📬 Email",
      href: "/email",
      match: (p) => p.startsWith("/email"),
    },
    {
      label: "🗺️ Map",
      href: "/map",
      match: (p) => p.startsWith("/map"),
    },
  ];

  return (
    <header className="h-14 px-6 border-b border-border flex items-center justify-between bg-bg-raised flex-shrink-0">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-accent" />
          <div>
            <div className="font-semibold text-slate-100 leading-tight">
              ProjectMind
            </div>
            <div className="text-xs text-slate-500 leading-tight">
              AI project management that learns your network
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {tabs.map((t) => {
            const active = t.match(pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-bg-elevated text-slate-100"
                    : "text-slate-400 hover:text-slate-200 hover:bg-bg-hover"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          {stats}
        </div>
        {pathname.startsWith("/projects") ? (
          <Link href="/" className="btn-secondary text-xs">
            ← Back to Network
          </Link>
        ) : (
          <Link href="/projects" className="btn-primary text-xs">
            📁 Go to Projects →
          </Link>
        )}
      </div>
    </header>
  );
}
