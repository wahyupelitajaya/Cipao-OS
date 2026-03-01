import { NextRequest, NextResponse } from "next/server";

/**
 * GET: Verifikasi webhook Meta.
 * Meta memanggil: ?hub.mode=subscribe&hub.verify_token=XXX&hub.challenge=YYY
 * Response harus 200 dengan body = challenge (plain text).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const tokenFromMeta = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe") {
    return NextResponse.json({ error: "Bad mode" }, { status: 400 });
  }

  // Baca env di dalam request (penting di Vercel serverless)
  const expectedToken = (process.env.WHATSAPP_VERIFY_TOKEN ?? "").trim();
  const receivedToken = (tokenFromMeta ?? "").trim();

  if (!expectedToken) {
    return NextResponse.json(
      { error: "WHATSAPP_VERIFY_TOKEN not set. Add it in Vercel → Settings → Environment Variables, then redeploy." },
      { status: 503 },
    );
  }
  if (receivedToken !== expectedToken) {
    return NextResponse.json({ error: "Verify token mismatch" }, { status: 403 });
  }
  if (challenge == null || String(challenge).trim() === "") {
    return NextResponse.json({ error: "Missing challenge" }, { status: 400 });
  }

  return new NextResponse(String(challenge), {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

/** Time slot dari jam sekarang (perkiraan WIB). */
function getTimeSlot(): string {
  const h = (new Date().getUTCHours() + 7 + 24) % 24;
  if (h >= 5 && h < 11) return "Pagi";
  if (h >= 11 && h < 15) return "Siang";
  if (h >= 15 && h < 18) return "Sore";
  return "Malam";
}

/**
 * POST: Pesan masuk dari WhatsApp Cloud API → simpan ke daily_activities.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) {
      return NextResponse.json({ ok: true });
    }

    const today = new Date().toISOString().slice(0, 10);
    const timeSlot = getTimeSlot();

    for (const entry of body.entry) {
      const changes = entry.changes;
      if (!Array.isArray(changes)) continue;
      for (const change of changes) {
        if (change?.field !== "messages" || !change?.value?.messages) continue;
        for (const msg of change.value.messages) {
          if (msg.type !== "text" || !msg.text?.body) continue;
          const text = String(msg.text.body).trim();
          if (!text) continue;
          const from = msg.from ?? "unknown";
          const note = `[WhatsApp] ${from}: ${text}`;

          try {
            const { createSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
            const supabase = createSupabaseAdminClient();
            await supabase.from("daily_activities").insert({
              date: today,
              time_slots: [timeSlot],
              locations: ["Rumah"],
              categories: [],
              cat_ids: [],
              activity_type: "Lainnya",
              note,
              created_by: null,
            });
          } catch (e) {
            console.error("[WhatsApp webhook] insert error:", e);
          }
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}