import { ActionForm } from "@/components/admin/ActionForm";
import type { FormState } from "@/lib/form-state";
type CategoryValues = {
  name: string;
  icon: string;
  sortOrder: number;
  featured: boolean;
  badge: string | null;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
};

type ParentOption = { id: string; name: string };

export function CategoryForm({
  action,
  category,
  parents = [],
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  category?: CategoryValues;
  /** Main categories only — used as parent for subcategories */
  parents?: ParentOption[];
}) {
  return (
    <ActionForm
      action={action}
      className="max-w-2xl space-y-5 rounded-xl bg-card border border-border p-6 shadow-sm"
    >
      <Field label="Name" name="name" required defaultValue={category?.name} />

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Parent (main category)
        </label>
        <select
          name="parentId"
          defaultValue={category?.parentId || ""}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        >
          <option value="">None — this is a main category</option>
          {parents
            .filter((p) => p.id !== (category as { id?: string } | undefined)?.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <p className="mt-1 text-xs text-muted-fg">
          Example: main “Electronics”, sub “Cables &amp; Chargers”.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Icon key"
          name="icon"
          defaultValue={category?.icon || "tag"}
          placeholder="flame, cpu, home, shirt…"
        />
        <Field
          label="Sort order"
          name="sortOrder"
          type="number"
          defaultValue={String(category?.sortOrder ?? 0)}
        />
      </div>
      <Field
        label="Badge (HOT / NEW / TRENDING / FEATURED / POPULAR only)"
        name="badge"
        defaultValue={category?.badge || ""}
        hint="Only those labels are allowed — no % off or savings text."
      />
      <Field
        label="Description"
        name="description"
        defaultValue={category?.description || ""}
        hint="Neutral category copy only — no fake discounts or promo codes."
      />
      <Field
        label="Featured banner image URL"
        name="imageUrl"
        defaultValue={category?.imageUrl || ""}
      />
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={category?.featured ?? false}
          className="rounded border-border text-brand focus:ring-brand"
        />
        Show in homepage category banners (main categories only)
      </label>
      <button
        type="submit"
        className="rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-on-brand hover:bg-brand-dark"
      >
        {category ? "Save changes" : "Create category"}
      </button>
    </ActionForm>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-muted-fg"
      />
      {hint && <p className="mt-1 text-xs text-muted-fg">{hint}</p>}
    </div>
  );
}
