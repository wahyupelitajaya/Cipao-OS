import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { requireAdmin } from "@/lib/auth";
import { AppError, ErrorCode } from "@/lib/errors";
import { revalidateCats } from "@/lib/revalidate";
import { getString } from "@/lib/validation";

export async function createBreed(formData: FormData) {
  await requireAdmin();
  const name = getString(formData, "name", { required: true, maxLength: 100 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("cat_breeds")
    .insert({ name, sort_order: 0 });
  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  revalidateCats();
}

export async function updateBreed(formData: FormData) {
  await requireAdmin();
  const id = getString(formData, "id", { required: true });
  const name = getString(formData, "name", { required: true, maxLength: 100 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("cat_breeds")
    .update({ name })
    .eq("id", id);
  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  revalidateCats();
}

export async function deleteBreed(formData: FormData) {
  await requireAdmin();
  const id = getString(formData, "id", { required: true });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("cat_breeds").delete().eq("id", id);
  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  revalidateCats();
}
