import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/** Tanggal hari ini WITA (UTC+8). */
function todayWITA(): string {
  const now = new Date();
  const wita = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const y = wita.getUTCFullYear();
  const m = String(wita.getUTCMonth() + 1).padStart(2, "0");
  const d = String(wita.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTimeSlot(): string {
  const h = (new Date().getUTCHours() + 8 + 24) % 24;
  if (h >= 5 && h < 11) return "Pagi";
  if (h >= 11 && h < 15) return "Siang";
  if (h >= 15 && h < 18) return "Sore";
  return "Malam";
}

/**
 * GET: Tes koneksi WA → Activity.
 * Panggil dengan: /api/webhooks/whatsapp/test?token=WHATSAPP_VERIFY_TOKEN_ANDA
 * Jika sukses: insert 1 activity dummy untuk hari ini, lalu cek halaman Aktivitas.
 */
export async function GET(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get("token") ?? "").trim();
  const expected = (process.env.WHATSAPP_VERIFY_TOKEN ?? "").trim();

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "WHATSAPP_VERIFY_TOKEN tidak di-set di env." },
      { status: 503 },
    );
  }
  if (token !== expected) {
    return NextResponse.json(
      { ok: false, error: "Token salah. Pakai nilai WHATSAPP_VERIFY_TOKEN dari Vercel." },
      { status: 403 },
    );
  }

  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
    const supabase = createSupabaseAdminClient();
    const today = todayWITA();
    const timeSlot = getTimeSlot();
    const note = `[WhatsApp] 6200000000000: Pesan tes koneksi WA → Activity (${new Date().toISOString()})`;

    const { error } = await supabase.from("daily_activities").insert({
      date: today,
      time_slots: [timeSlot],
      locations: ["Rumah"],
      categories: [],
      cat_ids: [],
      activity_type: "Lainnya",
      note,
      created_by: null,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Gagal insert ke Supabase.", detail: error.message },
        { status: 500 },
      );
    }

    revalidatePath("/activity");
    return NextResponse.json({
      ok: true,
      message: "Activity tes berhasil disimpan.",
      date: today,
      note: note.slice(0, 60) + "...",
      next: "Buka halaman Aktivitas, pilih tanggal hari ini — harus ada 1 activity dari WhatsApp tes.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "Error saat insert.", detail: msg },
      { status: 500 },
    );
  }
}
