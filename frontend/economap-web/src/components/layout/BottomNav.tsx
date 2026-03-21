"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { name: "Daily Run", href: "/", icon: "🏃" },
  { name: "Deals", href: "/deals", icon: "💰" },
  { name: "Shopping List", href: "/shopping-list", icon: "🛒" },
  { name: "Premium", href: "/premium", icon: "✨" },
  { name: "Community", href: "/community", icon: "🧑‍🤝‍🧑" },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <div className="btm-nav md:hidden">
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link href={link.href} key={link.name} className={isActive ? "active" : ""}>
            <span className="text-2xl">{link.icon}</span>
            <span className="btm-nav-label">{link.name}</span>
          </Link>
        );
      })}
    </div>
  );
};
