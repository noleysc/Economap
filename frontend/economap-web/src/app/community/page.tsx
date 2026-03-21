export default function CommunityPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Community Hub</h1>
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card bg-base-100 shadow-xl image-full">
            <figure><img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Zm9vZHxlbnwwfHwwfHx8MA%3D%3D" alt="Recipes" /></figure>
            <div className="card-body">
              <h2 className="card-title text-2xl">Recipe Sharing</h2>
              <p>
                Discover and share amazing recipes from the ClearCart community.
              </p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary" disabled>
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl image-full">
          <figure><img src="https://images.unsplash.com/photo-1579225555263-993a2a23d659?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGRlYWxzfGVufDB8fDB8fHww" alt="Deals" /></figure>
            <div className="card-body">
              <h2 className="card-title text-2xl">Crowdsourced Deals</h2>
              <p>
                Find and report the latest deals in your area, shared by fellow
                shoppers.
              </p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary" disabled>
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
