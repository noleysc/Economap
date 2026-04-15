'use client';

import { useCartStore } from '@/store/useCartStore';
import { Product } from '@/types';
import React from 'react';

const dummyProducts: Product[] = [
  {
    id: "prod1",
    name: "Milk",
    brand: "DairyCo",
    category: "Dairy",
    image_url: "/images/milk.png",
  },
  {
    id: "prod2",
    name: "Bread",
    brand: "Bakery Delights",
    category: "Baked Goods",
    image_url: "/images/bread.png",
  },
  {
    id: "prod3",
    name: "Eggs",
    brand: "Farm Fresh",
    category: "Dairy & Eggs",
    image_url: "/images/eggs.png",
  },
  {
    id: "prod4",
    name: "Chicken Breast",
    brand: "Poultry King",
    category: "Meat",
    image_url: "/images/chicken.png",
  },
  {
    id: "prod5",
    name: "Rice",
    brand: "Grain Goodness",
    category: "Pantry",
    image_url: "/images/rice.png",
  },
  {
    id: "prod6",
    name: "Pasta",
    brand: "Italian Delights",
    category: "Pantry",
    image_url: "/images/pasta.png",
  },
  {
    id: "prod7",
    name: "Tomatoes",
    brand: "Garden Fresh",
    category: "Produce",
    image_url: "/images/tomatoes.png",
  },
  {
    id: "prod8",
    name: "Potatoes",
    brand: "Earth's Bounty",
    category: "Produce",
    image_url: "/images/potatoes.png",
  },
  {
    id: "prod9",
    name: "Cheese",
    brand: "DairyCo",
    category: "Dairy",
    image_url: "/images/cheese.png",
  },
  {
    id: "prod10",
    name: "Yogurt",
    brand: "Happy Cow",
    category: "Dairy",
    image_url: "/images/yogurt.png",
  },
];

export const ProductList = () => {
  const { addItem } = useCartStore();

  return (
    <div className="mt-8 w-full max-w-md rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg backdrop-blur md:p-6">
      <h2 className="mb-4 text-2xl font-semibold text-slate-900">Available Products</h2>
      <div className="grid grid-cols-1 gap-3">
        {dummyProducts.map((product) => (
          <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors duration-200 ease-in-out hover:bg-slate-100">
            <span className="min-w-0 text-base text-slate-800 md:text-lg">{product.name} (<span className="text-slate-500">{product.brand}</span>)</span>
            <button 
              onClick={() => addItem(product)}
              className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_-12px_rgba(13,148,136,0.85)] ring-1 ring-emerald-200/70 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:bg-emerald-700"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
