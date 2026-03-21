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

export const SideNav = () => {
  const pathname = usePathname();

  return (
    <ul className="menu p-4 w-60 min-h-full bg-base-200 text-base-content">
      <li className="menu-title">
        <span>ClearCart</span>
      </li>
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <li key={link.name}>
            <Link href={link.href} className={isActive ? "active" : ""}>
              <span className="text-2xl">{link.icon}</span>
              {link.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};