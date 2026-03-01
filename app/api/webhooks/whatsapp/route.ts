import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

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
 * Meta memanggil URL ini saat Anda klik "Verify and Save". Response harus 200 + body = challenge (plain text).
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const tokenFromMeta = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode !== "subscribe") {
    return NextResponse.json({ error: "Bad mode" }, { status: 400 });
  }

  // Baca token dari env di dalam request (penting di Vercel serverless)
  const expectedToken = (process.env.WHATSAPP_VERIFY_TOKEN ?? "").trim();
  const receivedToken = (tokenFromMeta ?? "").trim();

  if (!expectedToken) {
    return NextResponse.json(
      { error: "WHATSAPP_VERIFY_TOKEN not set on server. Add it in Vercel Environment Variables and redeploy." },
      { status: 503 },
    );
  }
  if (receivedToken !== expectedToken) {
    return NextResponse.json({ error: "Verify token mismatch" }, { status: 403 });
  }
  if (challenge == null || challenge === "") {
    return NextResponse.json({ error: "Missing challenge" }, { status: 400 });
  }

  // Meta mengharapkan response body = challenge (plain text), status 200
  return new NextResponse(String(challenge), {
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
