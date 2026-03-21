"use client";

import { useState } from "react";
import { useGasDeals } from "@/hooks/useGasDeals";
import { useGroceryDeals } from "@/hooks/useGroceryDeals";
import { useDiningDeals } from "@/hooks/useDiningDeals";
import { Deal } from "@/types/Deals";

const DealCard = ({ deal }: { deal: Deal }) => (
  <div className="card w-full bg-base-100 shadow-xl transition-transform hover:scale-105 border-2 border-transparent hover:border-primary">
    <div className="card-body">
      <h2 className="card-title">
        {deal.title}
        {deal.sponsored && <div className="badge badge-secondary ml-2">Sponsored</div>}
      </h2>
      <p className="flex-grow">{deal.description}</p>
      <div className="card-actions justify-between items-center mt-4">
        <p className="text-2xl font-bold text-primary">
          {deal.discountedPrice && (
            <span className="line-through mr-2 text-lg">
              ${deal.price.toFixed(2)}
            </span>
          )}
          ${(deal.discountedPrice || deal.price).toFixed(2)}
        </p>
        <button className="btn btn-primary">Get Deal</button>
      </div>
    </div>
  </div>
);

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState("gas");
  const { data: gasDeals } = useGasDeals();
  const { data: groceryDeals } = useGroceryDeals();
  const { data: diningDeals } = useDiningDeals();

  const renderDeals = () => {
    switch (activeTab) {
      case "gas":
        return gasDeals.map((deal) => <DealCard key={deal.id} deal={deal} />);
      case "groceries":
        return groceryDeals.map((deal) => <DealCard key={deal.id} deal={deal} />);
      case "dining":
        return diningDeals.map((deal) => <DealCard key={deal.id} deal={deal} />);
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-8 text-center drop-shadow-lg">Deals</h1>
      <div role="tablist" className="tabs tabs-boxed max-w-sm mx-auto bg-base-100 shadow-lg">
        <a
          role="tab"
          className={`tab ${activeTab === "gas" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("gas")}
        >
          Gas
        </a>
        <a
          role="tab"
          className={`tab ${activeTab === "groceries" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("groceries")}
        >
          Groceries
        </a>
        <a
          role="tab"
          className={`tab ${activeTab === "dining" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("dining")}
        >
          Dining
        </a>
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {renderDeals()}
      </div>
    </div>
  );
}
