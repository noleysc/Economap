"use client";

import { useUser } from "@/hooks/useUser";

export default function PremiumPage() {
  const { data: user } = useUser();

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-4xl md:text-5xl font-bold text-primary">
            {user.premiumSubscriber
              ? "Welcome to ClearCart Premium!"
              : "Upgrade to ClearCart Premium"}
          </h1>
          <p className="py-6">
            {user.premiumSubscriber
              ? "You have access to all premium features."
              : "Unlock exclusive features for just $1.99/mo."}
          </p>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center">
              <h2 className="card-title text-2xl">Premium Features</h2>
              <ul className="text-left my-4 space-y-2">
                <li className="flex items-center"><span className="mr-2">✅</span> Ad-free experience</li>
                <li className="flex items-center"><span className="mr-2">✅</span> Unlimited optimized routes</li>
                <li className="flex items-center"><span className="mr-2">✅</span> Exclusive deals and discounts</li>
                <li className="flex items-center"><span className="mr-2">✅</span> Advanced route planning</li>
              </ul>
              {!user.premiumSubscriber && (
                <div className="card-actions">
                  <button className="btn btn-primary btn-lg animate-pulse">
                    Upgrade Now for $1.99/mo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
