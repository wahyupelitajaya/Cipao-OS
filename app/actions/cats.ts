"use server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { requireAdmin } from "@/lib/auth";
import { AppError, ErrorCode, getFriendlyMessage } from "@/lib/errors";
import { revalidateCat, revalidateCats } from "@/lib/revalidate";
import {
  getString,
  getOptionalString,
  getJsonStringArray,
  validateCatStatus,
  validateCatLocation,
  validateSuggestedStatus,
  isValidPhotoUrl,
} from "@/lib/validation";
import { toISODateString } from "@/lib/dates";
import {
  CAT_STATUSES,
  CAT_LOCATIONS,
  PHOTO_BUCKET,
  PHOTO_MAX_BYTES,
  PHOTO_ALLOWED_MIME_TYPES,
} from "@/lib/constants";

const DEFAULT_STATUS = "baik";
const DEFAULT_LOCATION = "rumah";

export async function createCat(formData: FormData) {
  await requireAdmin();

  const catId = getString(formData, "cat_id", { required: true });
  const name = getString(formData, "name", { required: true });
  const dobRaw = getOptionalString(formData, "dob");
  const statusRaw = getOptionalString(formData, "status");
  const locationRaw = getOptionalString(formData, "location");
  const ownerEmail = getOptionalString(formData, "owner_email");
  const ownerIdRaw = getOptionalString(formData, "owner_id");

  if (statusRaw && !validateCatStatus(statusRaw)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Status harus salah satu: Baik, Kurang Baik, Sakit.");
  }
  if (locationRaw && !validateCatLocation(locationRaw)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Lokasi harus salah satu: Rumah, Toko, Klinik.");
  }

  const dob = dobRaw ? toISODateString(dobRaw) : null;
  if (dobRaw && !dob) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Tanggal lahir harus format tanggal yang valid.");
  }

  const supabase = await createSupabaseServerClient();

  let ownerId = ownerIdRaw || null;
  if (!ownerId && ownerEmail) {
    const { data: ownerProfile, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", ownerEmail)
      .maybeSingle();
    if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
    ownerId = ownerProfile?.id ?? null;
  }

  if (!ownerId) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Owner tidak ditemukan. Isi email atau UUID owner yang valid.");
  }

  const status = statusRaw && validateCatStatus(statusRaw) ? statusRaw : DEFAULT_STATUS;
  const location = locationRaw && validateCatLocation(locationRaw) ? locationRaw : DEFAULT_LOCATION;

  const { error: insertError } = await supabase.from("cats").insert({
    cat_id: catId,
    name,
    owner_id: ownerId,
    dob,
    status,
    location,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "Cat ID sudah dipakai. Pilih ID lain.");
    }
    throw new AppError(ErrorCode.DB_ERROR, insertError.message, insertError);
  }

  revalidateCats();
}

export async function updateCat(formData: FormData) {
  await requireAdmin();

  const id = getString(formData, "id", { required: true });
  const name = getString(formData, "name", { required: true });
  const dobRaw = getOptionalString(formData, "dob");
  const statusRaw = getOptionalString(formData, "status");
  const locationRaw = getOptionalString(formData, "location");
  const breedIdRaw = getOptionalString(formData, "breed_id");
  const photoFile = formData.get("photo") as File | null;
  const photoUrlRaw = getOptionalString(formData, "photo_url");

  if (statusRaw && !validateCatStatus(statusRaw)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Status harus salah satu: Baik, Kurang Baik, Sakit.");
  }
  if (locationRaw && !validateCatLocation(locationRaw)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Lokasi harus salah satu: Rumah, Toko, Klinik.");
  }

  const dob = dobRaw ? toISODateString(dobRaw) : null;
  if (dobRaw && !dob) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Tanggal lahir harus format tanggal yang valid.");
  }

  const supabase = await createSupabaseServerClient();

  let photoUrl: string | null = null;

  if (photoFile && photoFile.size > 0) {
    if (photoFile.size > PHOTO_MAX_BYTES) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "Ukuran foto maksimal 5MB.");
    }
    const mime = (photoFile.type ?? "").toLowerCase();
    const allowed = PHOTO_ALLOWED_MIME_TYPES.some((t) => mime === t || mime.startsWith(t));
    if (!allowed) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "Format foto: JPG, PNG, GIF, atau WebP saja.");
    }
    const ext = mime.replace("image/", "") || "jpg";
    const path = `${id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, photoFile, { contentType: photoFile.type, upsert: true });
    if (uploadError) {
      throw new AppError(
        ErrorCode.DB_ERROR,
        uploadError.message === "Bucket not found"
          ? `Bucket '${PHOTO_BUCKET}' belum ada. Buat di Supabase Dashboard → Storage.`
          : `Gagal upload foto: ${uploadError.message}`,
        uploadError,
      );
    }
    const { data: urlData } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    photoUrl = urlData.publicUrl;
  } else if (photoUrlRaw) {
    if (!isValidPhotoUrl(photoUrlRaw)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "URL foto harus https yang valid.");
    }
    photoUrl = photoUrlRaw;
  }

  const breedId = breedIdRaw && breedIdRaw.trim() ? breedIdRaw.trim() : null;

  const { data, error } = await supabase
    .from("cats")
    .update({
      name,
      dob,
      status: statusRaw && validateCatStatus(statusRaw) ? statusRaw : DEFAULT_STATUS,
      location: locationRaw && validateCatLocation(locationRaw) ? locationRaw : DEFAULT_LOCATION,
      breed_id: breedId,
      photo_url: photoUrl,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  if (!data) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Kucing tidak ditemukan.");
  }

  revalidateCat(id);
}

export async function bulkUpdateCats(formData: FormData) {
  await requireAdmin();

  const catIds = getJsonStringArray(formData, "cat_ids");
  if (catIds.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Pilih minimal satu kucing.");
  }

  const status = getOptionalString(formData, "status");
  const location = getOptionalString(formData, "location");
  const breedIdRaw = getOptionalString(formData, "breed_id");

  if (status && !validateCatStatus(status)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Status harus salah satu: Baik, Kurang Baik, Sakit.");
  }
  if (location && !validateCatLocation(location)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Lokasi harus salah satu: Rumah, Toko, Klinik.");
  }
  if (!status && !location && !breedIdRaw) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Pilih status, lokasi, atau jenis yang akan diubah.");
  }

  const breedId = breedIdRaw && breedIdRaw.trim() ? breedIdRaw.trim() : null;

  const supabase = await createSupabaseServerClient();
  const updates: { status?: string; location?: string; breed_id?: string | null } = {};
  if (status) updates.status = status;
  if (location) updates.location = location;
  if (breedId) updates.breed_id = breedId;

  const { data: updatedRows, error } = await supabase
    .from("cats")
    .update(updates)
    .in("id", catIds)
    .select("id");

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  const updatedCount = updatedRows?.length ?? 0;
  if (updatedCount === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Tidak ada kucing yang diubah. Periksa ID kucing.");
  }
  if (updatedCount < catIds.length) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `Hanya ${updatedCount} dari ${catIds.length} kucing yang diubah. Beberapa ID mungkin tidak ditemukan.`,
    );
  }

  revalidateCats();
  for (const id of catIds) {
    revalidateCat(id);
  }
}

type UpdateCatState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

function getErrorMessage(error: unknown): string {
  return getFriendlyMessage(error);
}

export async function updateCatWithState(
  _prevState: UpdateCatState,
  formData: FormData,
): Promise<UpdateCatState> {
  try {
    await updateCat(formData);
    return { status: "success" };
  } catch (error) {
    console.error("Failed to update cat", error);
    return {
      status: "error",
      message: getFriendlyMessage(error),
    };
  }
}

export async function acceptSuggestedStatus(formData: FormData) {
  await requireAdmin();

  const catId = getString(formData, "cat_id", { required: true });
  const status = getString(formData, "status", { required: true });

  if (!validateSuggestedStatus(status)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Status harus salah satu: Perlu perhatian, Pantau, Sehat.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cats")
    .update({ status_manual: status })
    .eq("id", catId)
    .select("id")
    .maybeSingle();

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  if (!data) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Kucing tidak ditemukan.");
  }

  revalidateCat(catId);
}
