import { CategoryForm } from "@/components/admin/CategoryForm";
import { assertSuperAdminPage } from "@/lib/admin-actions";
import { createCategoryForm } from "@/lib/form-actions";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "New Category — Admin" };

export default async function NewCategoryPage() {
  await assertSuperAdminPage();
  const parents = await prisma.category.findMany({
    where: { parentId: null, NOT: { slug: "trending" } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Add category</h1>
      <CategoryForm action={createCategoryForm} parents={parents} />
    </div>
  );
}
