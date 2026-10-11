"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { isLoginPath } from "@/lib/route-access";
import { weekStartOf } from "@/lib/week";

type Item = { label: string; href: string; active: boolean };

export default function Nav({ footer }: { footer?: ReactNode }) {
  const pathname = usePathname();
  const [week, setWeek] = useState<string | null>(null);
  useEffect(() => {
    // Date is read after mount so prerendering never bakes in a stale week.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeek(weekStartOf(new Date()));
  }, []);

  const items: Item[] = [
    { label: "대시보드", href: "/", active: pathname === "/" },
    ...(week ? [{ label: "주간 계획", href: `/week/${week}`, active: pathname.startsWith("/week/") }] : []),
    { label: "1년 목표", href: "/goals", active: pathname.startsWith("/goals") },
  ];

  if (isLoginPath(pathname)) return null;

  return (
    <aside className="w-40 shrink-0 border-r border-zinc-800 bg-zinc-950 md:w-56">
      <nav aria-label="주 메뉴" className="sticky top-0 flex flex-col gap-1 p-3 text-sm">
        <Link href="/" className="mb-4 px-3 py-2 text-lg font-bold text-zinc-100">
          할 일 + 계획
        </Link>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`rounded-md border-l-4 px-3 py-2 transition-colors ${
              item.active
                ? "border-sky-400 bg-zinc-800 font-bold text-sky-300"
                : "border-transparent font-normal text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
        {footer}
      </nav>
    </aside>
  );
}
