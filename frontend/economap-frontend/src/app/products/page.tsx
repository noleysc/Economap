'use client';

import { ShoppingCart } from "@/features/list/components/ShoppingCart";
import { ProductList } from "@/features/list/components/ProductList";
import { useCartStore } from "@/store/useCartStore";
import Link from "next/link";

export default function ProductsPage() {
  const { getGas, toggleGetGas } = useCartStore();

  return (
    <main className="min-h-screen bg-background px-4 py-6 font-sans text-foreground md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <h1 className="mb-6 text-center text-3xl font-semibold tracking-tight text-primary md:mb-8 md:text-5xl">Select Products</h1>
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          <div className="flex w-full flex-col items-center md:w-1/2">
            <ProductList />
          </div>
          <div className="flex w-full flex-col items-center md:w-1/2">
            <ShoppingCart />
            <div className="mt-4 flex w-full max-w-md items-center justify-between rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur">
              <label htmlFor="getGas" className="text-base font-medium text-slate-800 md:text-lg">Get Gas?</label>
              <input
                type="checkbox"
                id="getGas"
                checked={getGas}
                onChange={toggleGetGas}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </div>
            <Link href="/" className="mt-4 w-full max-w-md">
              <button className="w-full rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-[0_12px_30px_-12px_rgba(13,148,136,0.85)] ring-1 ring-emerald-200/70 transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:opacity-95">
                Plan Trip
              </button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
