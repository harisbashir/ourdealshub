"use client";
import { useActionState } from "react";
import { manageDemoCatalog } from "@/lib/demo-actions";
import { primaryButtonClass, secondaryButtonClass } from "@/components/admin/ui";
export function DemoCatalogControl({ count }: { count: number }) {
  const [result, action, pending] = useActionState(manageDemoCatalog, null);
  return <form action={action} className="space-y-4">
    <p className="text-[15px] leading-relaxed text-muted">Explore 12 sample listings across the US, UK and Canada. Samples use original illustrations, have no active shopping links, and never enter social automation. {count > 0 && `${count} samples are currently visible.`}</p>
    <div className="flex flex-wrap gap-3">
      <button name="operation" value="add" disabled={pending} className={primaryButtonClass}>{pending ? "Updating…" : "Add sample catalog"}</button>
      {count > 0 && <button name="operation" value="remove" disabled={pending} className={secondaryButtonClass}>Remove all samples</button>}
    </div>
    {result && <p role="status" className={`text-[15px] ${result.ok ? "text-success" : "text-danger"}`}>{result.message}</p>}
  </form>;
}
