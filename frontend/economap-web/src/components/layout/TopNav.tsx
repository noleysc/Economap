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

export const TopNav = () => {
  const pathname = usePathname();

  return (
    <div className="navbar bg-base-100 shadow-md">
      <div className="navbar-start">
        <a className="btn btn-ghost text-xl">ClearCart</a>
      </div>
      <div className="navbar-center overflow-x-auto w-full">
        <ul className="menu menu-horizontal px-1">
        {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
                <li key={link.name}>
                    <Link href={link.href} className={isActive ? "active" : ""}>
                        <span className="text-xl">{link.icon}</span>
                        {link.name}
                    </Link>
                </li>
            )
        })}
        </ul>
      </div>
      <div className="navbar-end">
      </div>
    </div>
  );
};