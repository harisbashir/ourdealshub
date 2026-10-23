import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { assertSuperAdminPage } from "@/lib/admin-actions";
import { updateCategoryForm } from "@/lib/form-actions";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Edit Category — Admin" };

export default async function EditCategoryPage({ params }: Props) {
  await assertSuperAdminPage();
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  const parents = await prisma.category.findMany({
    where: {
      parentId: null,
      NOT: { OR: [{ slug: "trending" }, { id }] },
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  const action = updateCategoryForm.bind(null, category.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Edit category</h1>
      <CategoryForm
        action={action}
        parents={parents}
        category={{
          name: category.name,
          icon: category.icon,
          sortOrder: category.sortOrder,
          featured: category.featured,
          badge: category.badge,
          description: category.description,
          imageUrl: category.imageUrl,
          parentId: category.parentId,
        }}
      />
    </div>
  );
}
