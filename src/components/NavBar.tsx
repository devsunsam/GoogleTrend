"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "대시보드" },
  { href: "/posts", label: "게시글" },
  { href: "/settings", label: "설정" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-neutral-800 bg-[#0a0a0a]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-white">
          TrendBlog
        </Link>
        <nav className="flex gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "text-sm text-white"
                  : "text-sm text-neutral-500 hover:text-neutral-300"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
