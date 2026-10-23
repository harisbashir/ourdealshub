import type { Metadata } from "next";
import { SavedList } from "./SavedList";

export const metadata: Metadata = {
  title: "Saved",
  robots: { index: false },
};

export default function SavedPage() {
  return (
    <div className="site-container pt-4">
      <h1 className="text-[28px] font-bold tracking-tight text-foreground sm:text-[34px]">
        Saved
      </h1>
      <p className="mt-1 text-[15px] text-muted">Kept on this device only. No account needed.</p>
      <SavedList />
    </div>
  );
}
