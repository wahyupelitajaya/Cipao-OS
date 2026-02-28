import { revalidatePath } from "next/cache";

export function revalidateCat(catId: string) {
  revalidatePath("/cats");
  revalidatePath(`/cats/${catId}`);
  revalidatePath("/dashboard");
  revalidatePath("/health");
  revalidatePath("/grooming");
  revalidatePath("/reports");
  revalidatePath(`/reports/${catId}`);
}

export function revalidateCats() {
  revalidatePath("/cats");
  revalidatePath("/dashboard");
  revalidatePath("/health");
  revalidatePath("/grooming");
  revalidatePath("/reports");
}

export function revalidateHealth() {
  revalidatePath("/health");
  revalidatePath("/reports");
}

export function revalidateGrooming() {
  revalidatePath("/grooming");
}

export function revalidateReports() {
  revalidatePath("/reports");
}

export function revalidateInventory() {
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

export function revalidateActivity() {
  revalidatePath("/activity");
  revalidatePath("/dashboard");
}
