"use server";
import { createChangeNotifier } from "@/lib/system-events";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { addDemoCatalog, removeDemoCatalog } from "@/lib/demo-catalog";
import { revalidatePath } from "next/cache";
export async function manageDemoCatalog(_previous: { ok: boolean; message: string } | null, form: FormData) {
  const notifyChange = createChangeNotifier("content", "Sample catalog updated", "/admin/settings#samples");
  const admin = await requireSuperAdmin();
  const action = String(form.get("operation"));
  if (action !== "add" && action !== "remove") return { ok: false, message: "Choose an action." };
  try {
    const count = action === "add" ? await addDemoCatalog(admin.id) : await removeDemoCatalog();
    if (count) await notifyChange();
  revalidatePath("/", "layout");
    return { ok: true, message: action === "add" ? `${count} sample listings added. No affiliate links or social posts are enabled for samples.` : `${count} sample listings removed. Your real deals are unchanged.` };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not update the sample catalog." }; }
}
