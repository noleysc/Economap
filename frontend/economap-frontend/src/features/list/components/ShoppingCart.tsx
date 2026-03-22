'use client';

import { useCartStore } from '@/store/useCartStore';
import { Product } from '@/types';
import React from 'react';

export const ShoppingCart = () => {
  const { items, removeItem, clearCart } = useCartStore();

  return (
    <div className="p-6 border border-border rounded-lg shadow-lg bg-white w-full max-w-md mt-8 animate-slide-in-right">
      <h2 className="text-2xl font-bold mb-4 text-accent">Shopping Cart</h2>
      {items.length === 0 ? (
        <p className="text-foreground text-lg">Your cart is empty. Add some products!</p>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                <span className="text-foreground text-lg font-medium">{item.name}</span>
                <button 
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-700 transition-colors duration-200 ease-in-out transform hover:scale-105"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button 
            onClick={clearCart}
            className="mt-6 w-full bg-secondary text-secondary-foreground py-3 px-6 rounded-lg shadow-md hover:bg-secondary-dark transition-all duration-300 ease-in-out transform hover:scale-105"
          >
            Clear Cart
          </button>
        </>
      )}
    </div>
  );
};
