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
    <div className="p-6 border border-border rounded-lg shadow-lg bg-white w-full max-w-md mt-8">
      <h2 className="text-2xl font-bold mb-4 text-secondary">Available Products</h2>
      <div className="grid grid-cols-1 gap-4">
        {dummyProducts.map((product) => (
          <div key={product.id} className="flex justify-between items-center py-3 border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors duration-200 ease-in-out">
            <span className="text-foreground text-lg">{product.name} (<span className="text-gray-500">{product.brand}</span>)</span>
            <button 
              onClick={() => addItem(product)}
              className="bg-primary text-primary-foreground py-2 px-4 rounded-lg shadow-sm hover:bg-primary-dark transition-all duration-300 ease-in-out transform hover:scale-105"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
