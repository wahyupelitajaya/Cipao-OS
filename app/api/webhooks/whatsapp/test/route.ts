import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  todayWITA,
  getTimeSlot,
  parseWhatsAppActivityMessage,
} from "@/lib/whatsapp-activity-parser";

function checkToken(token: string): NextResponse | null {
  const expected = (process.env.WHATSAPP_VERIFY_TOKEN ?? "").trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "WHATSAPP_VERIFY_TOKEN tidak di-set di env." },
      { status: 503 },
    );
  }
  if ((token ?? "").trim() !== expected) {
    return NextResponse.json(
      { ok: false, error: "Token salah. Pakai nilai WHATSAPP_VERIFY_TOKEN dari .env.local." },
      { status: 403 },
    );
  }
  return null;
}

/**
 * GET: Tes dengan pesan custom (untuk tes parsing di localhost).
 * URL: /api/webhooks/whatsapp/test?token=XXX&message=Selasa%2C%203%20Maret%202026%0A%0APagi%20Toko%20%3A%0A-%20Bersih...
 * Atau tanpa message = insert dummy seperti dulu.
 */
export async function GET(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get("token") ?? "").trim();
  const err = checkToken(token);
  if (err) return err;
  const message = (req.nextUrl.searchParams.get("message") ?? "").trim();

  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
    const supabase = createSupabaseAdminClient();

    if (message) {
      const parsed = parseWhatsAppActivityMessage(message);
      const activityDate = parsed.date ?? todayWITA();
      const note = `[WhatsApp] 6200000000000: ${parsed.note || "(tanpa catatan)"}`;
      const row = {
        date: activityDate,
        time_slots: [parsed.timeSlot],
        locations: [parsed.location],
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
        return NextResponse.json(
          { ok: false, error: "Gagal insert ke Supabase.", detail: error.message },
          { status: 500 },
        );
      }
      revalidatePath("/activity");
      return NextResponse.json({
        ok: true,
        message: "Activity disimpan dengan hasil parsing.",
        parsed: {
          date: activityDate,
          timeSlot: parsed.timeSlot,
          location: parsed.location,
          note: parsed.note.slice(0, 80) + (parsed.note.length > 80 ? "…" : ""),
        },
        next: `Buka halaman Activity, pilih tanggal ${activityDate} — harus ada activity dengan waktu ${parsed.timeSlot}, lokasi ${parsed.location}.`,
      });
    }

    const today = todayWITA();
    const timeSlot = getTimeSlot();
    const note = `[WhatsApp] 6200000000000: Pesan tes koneksi WA → Activity (${new Date().toISOString()})`;
    const row = {
      date: today,
      time_slots: [timeSlot],
      locations: ["Rumah"],
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

/**
 * POST: Tes parsing + insert dari body (untuk localhost).
 * Body: { "token": "WHATSAPP_VERIFY_TOKEN_ANDA", "message": "Selasa, 3 Maret 2026\n\nPagi Toko :\n- Bersih - bersih\n- Kasi Makan" }
 */
export async function POST(req: NextRequest) {
  const expected = (process.env.WHATSAPP_VERIFY_TOKEN ?? "").trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "WHATSAPP_VERIFY_TOKEN tidak di-set di env." },
      { status: 503 },
    );
  }

  let body: { token?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body harus JSON dengan token dan message." },
      { status: 400 },
    );
  }
  const token = (body.token ?? "").trim();
  const message = typeof body.message === "string" ? body.message : "";
  if (token !== expected) {
    return NextResponse.json(
      { ok: false, error: "Token salah. Pakai nilai WHATSAPP_VERIFY_TOKEN dari .env.local." },
      { status: 403 },
    );
  }
  if (!message) {
    return NextResponse.json(
      { ok: false, error: "Body harus berisi 'message' (teks pesan WA untuk di-parse)." },
      { status: 400 },
    );
  }

  try {
    const parsed = parseWhatsAppActivityMessage(message);
    const activityDate = parsed.date ?? todayWITA();
    const note = `[WhatsApp] 6200000000000: ${parsed.note || "(tanpa catatan)"}`;

    const { createSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
    const supabase = createSupabaseAdminClient();
    const row = {
      date: activityDate,
      time_slots: [parsed.timeSlot],
      locations: [parsed.location],
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
      return NextResponse.json(
        { ok: false, error: "Gagal insert ke Supabase.", detail: error.message },
        { status: 500 },
      );
    }
    revalidatePath("/activity");
    return NextResponse.json({
      ok: true,
      message: "Activity disimpan dengan hasil parsing.",
      parsed: {
        date: activityDate,
        timeSlot: parsed.timeSlot,
        location: parsed.location,
        note: parsed.note,
      },
      next: `Buka halaman Activity, pilih tanggal ${activityDate} — harus ada activity dengan waktu ${parsed.timeSlot}, lokasi ${parsed.location}.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "Error.", detail: msg },
      { status: 500 },
    );
  }
}
