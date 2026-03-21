"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";



export const TopNav = () => {
  const pathname = usePathname();

  return (
    <div className="navbar bg-base-100 shadow-md">
      <div className="navbar-start">
        <a className="btn btn-ghost text-xl">ClearCart</a>
      </div>
      <div className="navbar-center overflow-x-auto w-full">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link href="/" className={pathname === "/" ? "active" : ""}>
              <span className="text-xl">🏃</span>
              Daily Run
            </Link>
          </li>
          <li>
            <Link href="/deals" className={pathname === "/deals" ? "active" : ""}>
              <span className="text-xl">💰</span>
              Deals
            </Link>
          </li>
          <li>
            <Link href="/shopping-list" className={pathname === "/shopping-list" ? "active" : ""}>
              <span className="text-xl">🛒</span>
              Shopping List
            </Link>
          </li>
          <li>
            <Link href="/premium" className={pathname === "/premium" ? "active" : ""}>
              <span className="text-xl">✨</span>
              Premium
            </Link>
          </li>
          <li>
            <Link href="/community" className={pathname === "/community" ? "active" : ""}>
              <span className="text-xl">🧑‍🤝‍🧑</span>
              Community
            </Link>
          </li>
        </ul>
      </div>
      <div className="navbar-end">
      </div>
    </div>
  );
};