"use client";

import { useDailyRun } from "@/hooks/useDailyRun";
import { Stop } from "@/types/Routes";
import dynamic from "next/dynamic";
import { useMemo } from "react";

export default function DailyRunPage() {
  const { data: dailyRun, isLoading } = useDailyRun();

  const Map = useMemo(
    () =>
      dynamic(() => import("@/components/Map"), {
        loading: () => <div className="skeleton h-96 w-full"></div>,
        ssr: false,
      }),
    []
  );

  if (isLoading) {
    return <div className="container mx-auto p-4"><div className="skeleton h-8 w-48 mb-4"></div><div className="skeleton h-96 w-full"></div></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8 text-center drop-shadow-lg">{dailyRun.name}</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3">
          <div className="card bg-base-100 shadow-2xl rounded-lg overflow-hidden">
            <div className="card-body p-0">
              <Map stops={dailyRun.stops} />
            </div>
          </div>
        </div>
        <div className="lg:w-1/3">
          <h2 className="text-2xl font-semibold mb-4 text-center lg:text-left">Optimized Route</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto p-2">
            {dailyRun.optimizedRoute.map((stop: Stop) => (
              <div key={stop.id} className="card bg-base-100 shadow-lg hover:shadow-2xl transition-shadow duration-300">
                <div className="card-body">
                  <h3 className="card-title">
                    <span className="text-2xl mr-2">
                        {stop.type === 'Gas' && '⛽️'}
                        {stop.type === 'Grocery' && '🛒'}
                        {stop.type === 'Dining' && '🍔'}
                    </span>
                    {stop.name}
                  </h3>
                  <p>{stop.address}</p>
                  <div className="badge badge-primary badge-outline mt-2">{stop.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
