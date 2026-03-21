"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const dummyItems = [
  { id: 1, name: "Milk", checked: false },
  { id: 2, name: "Bread", checked: true },
  { id: 3, name: "Eggs", checked: false },
  { id: 4, name: "Cheese", checked: false },
  { id: 5, name: "Apples", checked: true },
  { id: 6, name: "Bananas", checked: false },
];

export default function ShoppingListPage() {
  const [items, setItems] = useState(dummyItems);
  const [newItem, setNewItem] = useState("");
  const router = useRouter();

  const handleAddItem = () => {
    if (newItem.trim()) {
      setItems([...items, { id: Date.now(), name: newItem.trim(), checked: false }]);
      setNewItem("");
    }
  };

  const handleToggleItem = (id: number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };
  
  const handleDeleteItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handlePlanRoute = () => {
    router.push("/");
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8 text-center drop-shadow-lg">Shopping List</h1>
      <div className="card bg-base-100 shadow-2xl max-w-2xl mx-auto">
        <div className="card-body">
          <div className="flex mb-4">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add a new item"
              className="input input-bordered w-full mr-2"
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <button onClick={handleAddItem} className="btn btn-primary">
              Add
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 transition-colors duration-200">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleToggleItem(item.id)}
                    className="checkbox checkbox-primary mr-4"
                  />
                  <span className={item.checked ? "line-through" : ""}>
                    {item.name}
                  </span>
                </div>
                <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="btn btn-ghost btn-sm"
                  >
                    🗑️
                  </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="fixed bottom-20 right-4 md:hidden">
        <button onClick={handlePlanRoute} className="btn btn-secondary btn-circle btn-lg shadow-lg">
        🗺️
        </button>
      </div>
      <div className="mt-8 hidden md:block max-w-2xl mx-auto">
        <button onClick={handlePlanRoute} className="btn btn-secondary w-full">
          Plan Route
        </button>
      </div>
    </div>
  );
}
