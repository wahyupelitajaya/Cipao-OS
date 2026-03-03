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

/**
 * POST: Pesan masuk dari WhatsApp Cloud API.
 * HANYA simpan ke whatsapp_inbox (kotak masuk). TIDAK menulis ke daily_activities.
 * Activity hanya diisi saat admin klik "Proses ke Activity" di halaman Koneksi WhatsApp.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) {
      return NextResponse.json({ ok: true });
    }

    for (const entry of body.entry) {
      const changes = entry.changes;
      if (!Array.isArray(changes)) continue;
      for (const change of changes) {
        if (change?.field !== "messages") continue;
        const value = change?.value;
        const messages = Array.isArray(value?.messages) ? value.messages : value?.message ? [value.message] : [];
        for (const msg of messages) {
          const textRaw = typeof msg?.text === "string" ? msg.text : msg?.text?.body;
          if (msg.type !== "text" || textRaw == null) continue;
          const text = String(textRaw).trim();
          if (!text) continue;
          const from = msg.from ?? "unknown";

          try {
            const { createSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
            const supabase = createSupabaseAdminClient();
            // Hanya inbox — tidak ada insert ke daily_activities di webhook ini.
            console.log("[WhatsApp webhook] Menyimpan ke kotak masuk (whatsapp_inbox) saja, tidak ke Activity.");
            const { error } = await supabase.from("whatsapp_inbox").insert({
              from_number: from,
              raw_body: text,
            });
            if (error) {
              console.error("[WhatsApp webhook] whatsapp_inbox insert failed:", error.message, "Code:", error.code);
            }
          } catch (e) {
            console.error("[WhatsApp webhook] inbox error:", e);
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}