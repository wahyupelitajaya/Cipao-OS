"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile, isAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { parseWhatsAppActivityMessage, todayWITA } from "@/lib/whatsapp-activity-parser";

/** Ambil baris terakhir dari webhook_whatsapp_debug (hanya admin, untuk tampilan di halaman WhatsApp). */
export async function getLastWebhookWhatsAppDebug(): Promise<{
  raw_preview: string;
  parsed_date: string | null;
  parsed_time_slot: string | null;
  parsed_location: string | null;
  received_at: string;
} | null> {
  const { session, profile } = await getSessionProfile();
  if (!session || !isAdmin(profile)) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("webhook_whatsapp_debug")
    .select("raw_preview, parsed_date, parsed_time_slot, parsed_location, received_at")
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/**
 * Untuk tes localhost: parse pesan WA dan insert 1 activity ke DB.
 * Hanya admin. Token tidak perlu — dipanggil dari dalam app.
 */
export async function testWhatsAppMessageInsert(message: string): Promise<{
  ok: boolean;
  error?: string;
  parsed?: { date: string; timeSlot: string; location: string; note: string };
}> {
  const { session, profile } = await getSessionProfile();
  if (!session || !isAdmin(profile)) {
    return { ok: false, error: "Hanya admin." };
  }
  const text = (message ?? "").trim();
  if (!text) {
    return { ok: false, error: "Pesan kosong." };
  }

  try {
    const parsed = parseWhatsAppActivityMessage(text);
    const activityDate = parsed.date ?? todayWITA();
    const note = parsed.note?.trim() ?? "";
    const textLower = text.toLowerCase();
    const timeMatches = Array.from(textLower.matchAll(/\b(pagi|siang|sore|malam)\b/g)).map((m) => m[1]);
    const uniqueTimeSlots = Array.from(
      new Set(
        timeMatches.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
      ),
    );
    const locationMatches = Array.from(textLower.matchAll(/\b(rumah|toko)\b/g)).map((m) => m[1]);
    const uniqueLocations = Array.from(
      new Set(
        locationMatches.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
      ),
    );
    const timeSlotsArray =
      uniqueTimeSlots.length > 0 ? uniqueTimeSlots : [parsed.timeSlot];
    const locationsArray =
      uniqueLocations.length > 0 ? uniqueLocations : [parsed.location];

    let supabase;
    try {
      const { createSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
      supabase = createSupabaseAdminClient();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        return {
          ok: false,
          error: "SUPABASE_SERVICE_ROLE_KEY belum di-set. Tambahkan di .env.local (Supabase → Project Settings → API → service_role), lalu restart dev server.",
        };
      }
      throw e;
    }
    const row = {
      date: activityDate,
      time_slots: timeSlotsArray,
      locations: locationsArray,
      categories: [],
      cat_ids: [],
      note,
      created_by: null,
    };
    let error = (await supabase.from("daily_activities").insert({ ...row, activity_type: "Lainnya" })).error;
    if (error?.code === "23514" && error?.message?.includes("activity_type_check")) {
      error = (await supabase.from("daily_activities").insert({ ...row, activity_type: "Other" })).error;
    }
    if (error) {
      return { ok: false, error: error.message, parsed: { date: activityDate, timeSlot: parsed.timeSlot, location: parsed.location, note: parsed.note } };
    }
    revalidatePath("/activity");
    return {
      ok: true,
      parsed: { date: activityDate, timeSlot: parsed.timeSlot, location: parsed.location, note: parsed.note },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
