"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteCategory } from "@/lib/admin-actions";

type Props = {
  categoryId: string;
  categoryName: string;
  productCount: number;
  childCount?: number;
};

export function DeleteCategoryButton({
  categoryId,
  categoryName,
  productCount,
  childCount = 0,
}: Props) {
  const [pending, startTransition] = useTransition();
  const blocked = productCount > 0 || childCount > 0;

  return (
    <button
      type="button"
      disabled={pending || blocked}
      title={
        blocked
          ? productCount > 0
            ? `Move or delete ${productCount} product(s) first`
            : `Delete ${childCount} subcategory(ies) first`
          : "Delete category"
      }
      aria-label={`Delete category ${categoryName}`}
      className="pressable inline-flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-card-muted hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
      onClick={() => {
        if (blocked) return;
        const ok = window.confirm(
          `Delete category “${categoryName}”? This cannot be undone.`
        );
        if (!ok) return;
        startTransition(async () => {
          try {
            await deleteCategory(categoryId);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Could not delete category.";
            window.alert(message);
          }
        });
      }}
    >
      <Trash2 className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}
