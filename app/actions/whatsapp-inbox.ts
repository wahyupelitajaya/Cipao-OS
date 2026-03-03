"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile, isAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { parseWhatsAppActivityMessage, todayWITA } from "@/lib/whatsapp-activity-parser";

export type InboxRow = {
  id: string;
  received_at: string;
  from_number: string;
  raw_body: string;
  processed_at: string | null;
  created_at: string;
};

/** Daftar pesan di inbox yang belum diproses (admin only). */
export async function getWhatsAppInboxUnprocessed(): Promise<InboxRow[]> {
  const { session, profile } = await getSessionProfile();
  if (!session || !isAdmin(profile)) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("whatsapp_inbox")
    .select("id, received_at, from_number, raw_body, processed_at, created_at")
    .is("processed_at", null)
    .order("received_at", { ascending: true });
  return (data ?? []) as InboxRow[];
}

/** Proses semua pesan yang belum diproses: parse teks (tanggal/waktu/lokasi) lalu insert ke daily_activities. */
export async function processWhatsAppInbox(): Promise<{
  ok: boolean;
  processed: number;
  error?: string;
}> {
  const { session, profile } = await getSessionProfile();
  if (!session || !isAdmin(profile)) {
    return { ok: false, processed: 0, error: "Hanya admin." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("whatsapp_inbox")
    .select("id, from_number, raw_body")
    .is("processed_at", null)
    .order("received_at", { ascending: true });

  if (!rows?.length) {
    revalidatePath("/whatsapp");
    revalidatePath("/activity");
    return { ok: true, processed: 0 };
  }

  const defaultToday = todayWITA();
  let processed = 0;

  for (const row of rows as { id: string; from_number: string; raw_body: string }[]) {
    const text = (row.raw_body ?? "").trim();
    if (!text) {
      await supabase.from("whatsapp_inbox").update({ processed_at: new Date().toISOString() }).eq("id", row.id);
      processed++;
      continue;
    }

    const parsed = parseWhatsAppActivityMessage(text);
    const activityDate = parsed.date ?? defaultToday;
    const note = `[WhatsApp] ${row.from_number}: ${parsed.note || text}`;

    const activityRow = {
      date: activityDate,
      time_slots: [parsed.timeSlot],
      locations: [parsed.location],
      categories: [],
      cat_ids: [],
      note,
      created_by: session.user.id,
    };

    let err = (await supabase.from("daily_activities").insert({ ...activityRow, activity_type: "Lainnya" })).error;
    if (err?.code === "23514" && err?.message?.includes("activity_type_check")) {
      err = (await supabase.from("daily_activities").insert({ ...activityRow, activity_type: "Other" })).error;
    }

    if (!err) {
      await supabase.from("whatsapp_inbox").update({ processed_at: new Date().toISOString() }).eq("id", row.id);
      processed++;
    }
  }

  revalidatePath("/whatsapp");
  revalidatePath("/activity");
  return { ok: true, processed };
}
