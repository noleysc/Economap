'use client';

import { ShoppingCart } from "@/features/list/components/ShoppingCart";
import { ProductList } from "@/features/list/components/ProductList";
import { useCartStore } from "@/store/useCartStore";
import Link from "next/link";

export default function ProductsPage() {
  const { getGas, toggleGetGas } = useCartStore();

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-background text-foreground font-sans">
      <h1 className="text-4xl font-bold mb-8 text-primary">Select Products</h1>
      <div className="flex flex-col md:flex-row w-full max-w-5xl gap-8">
        <div className="flex flex-col items-center w-full md:w-1/2">
          <ProductList />
        </div>
        <div className="flex flex-col items-center w-full md:w-1/2">
          <ShoppingCart />
          <div className="w-full max-w-md mt-4 p-4 border border-border rounded-lg shadow-lg bg-white flex items-center justify-between">
            <label htmlFor="getGas" className="text-lg font-medium text-foreground">Get Gas?</label>
            <input
              type="checkbox"
              id="getGas"
              checked={getGas}
              onChange={toggleGetGas}
              className="h-5 w-5 text-primary rounded border-gray-300 focus:ring-primary"
            />
          </div>
          <Link href="/" className="w-full max-w-md mt-4">
            <button className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg shadow-md hover:bg-primary-dark transition-all duration-300 ease-in-out transform hover:scale-105">
              Plan Trip
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}