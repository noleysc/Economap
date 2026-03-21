import { TopNav } from "./TopNav";

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <main className="flex-grow overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
