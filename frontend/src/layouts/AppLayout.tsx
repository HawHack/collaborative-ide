import { Outlet } from "react-router-dom";

import Topbar from "@/components/Topbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Topbar />
      <main className="mx-auto w-full max-w-[1680px] px-4 py-4 md:px-6 md:py-6">
        <Outlet />
      </main>
    </div>
  );
}