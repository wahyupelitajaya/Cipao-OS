import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "";

/** Tentukan time_slot dari jam sekarang (WIB). */
function getTimeSlotForNow(): string {
  const hour = new Date().getUTCHours() + 7; // UTC+7
  const h = hour < 0 ? hour + 24 : hour >= 24 ? hour - 24 : hour;
  if (h >= 5 && h < 11) return "Pagi";
  if (h >= 11 && h < 15) return "Siang";
  if (h >= 15 && h < 18) return "Sore";
  return "Malam";
}

/**
 * GET: Verifikasi webhook dengan Meta.
 * Query: hub.mode, hub.verify_token, hub.challenge
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode !== "subscribe") {
    return NextResponse.json({ error: "Bad mode" }, { status: 400 });
  }
  if (!WHATSAPP_VERIFY_TOKEN || token !== WHATSAPP_VERIFY_TOKEN) {
    return NextResponse.json({ error: "Verify token mismatch" }, { status: 403 });
  }
  if (typeof challenge !== "string") {
    return NextResponse.json({ error: "Missing challenge" }, { status: 400 });
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * POST: Terima pesan masuk dari WhatsApp Cloud API.
 * Simpan isi pesan sebagai Activity (daily_activities) dengan tanggal hari ini.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Unknown object" }, { status: 400 });
    }

    const entry = body.entry as Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            from: string;
            id: string;
            timestamp: string;
            type: string;
            text?: { body: string };
          }>;
        };
        field?: string;
      }>;
    }>;

    if (!Array.isArray(entry)) {
      return NextResponse.json({ ok: true });
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeSlot = getTimeSlotForNow();

    for (const item of entry) {
      const changes = item.changes;
      if (!Array.isArray(changes)) continue;

      for (const change of changes) {
        if (change.field !== "messages") continue;
        const value = change.value;
        if (!value?.messages) continue;

        for (const msg of value.messages) {
          if (msg.type !== "text" || !msg.text?.body) continue;

          const text = String(msg.text.body).trim();
          if (!text) continue;

          const from = msg.from || "unknown";
          const note = `[WhatsApp] ${from}: ${text}`;

          try {
            const supabase = createSupabaseAdminClient();
            const { error } = await supabase.from("daily_activities").insert({
              date: dateStr,
              time_slots: [timeSlot],
              locations: ["Rumah"],
              categories: [],
              cat_ids: [],
              activity_type: "Lainnya",
              note,
              created_by: null,
            });

            if (error) {
              console.error("[WhatsApp webhook] Supabase insert error:", error.message);
            }
          } catch (err) {
            console.error("[WhatsApp webhook] Error saving activity:", err);
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[WhatsApp webhook] POST error:", e);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
