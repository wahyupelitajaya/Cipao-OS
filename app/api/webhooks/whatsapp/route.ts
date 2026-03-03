import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { todayWITA, parseWhatsAppActivityMessage } from "@/lib/whatsapp-activity-parser";

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
 * POST: Pesan masuk dari WhatsApp Cloud API → parse teks (tanggal, waktu, lokasi) lalu langsung simpan ke Activity.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) {
      return NextResponse.json({ ok: true });
    }

    const defaultToday = todayWITA();
    let saved = 0;

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

          const parsed = parseWhatsAppActivityMessage(text);
          const activityDate = parsed.date ?? defaultToday;
          const rawNote = parsed.note || text;
          const note = `[WhatsApp] ${from}: ${rawNote}`;
          const normalizedNote = String(rawNote).trim().toLowerCase();

          try {
            const { createSupabaseAdminClient } = await import("@/lib/supabaseAdmin");
            const supabase = createSupabaseAdminClient();

            // 1) Pesan "Libur" → tandai visit_days sebagai tidak dikunjungi dengan alasan Libur.
            if (normalizedNote === "libur") {
              const { error: visitError } = await supabase
                .from("visit_days")
                .upsert(
                  {
                    date: activityDate,
                    visited: false,
                    note: "Libur",
                    created_by: null,
                  },
                  { onConflict: "date" },
                );

              if (!visitError) {
                saved++;
                await supabase.from("activity_log").insert({
                  user_id: null,
                  action: "update",
                  entity_type: "visit_day",
                  entity_id: activityDate,
                  summary: `Status kunjungan ${activityDate}: Tidak dikunjungi (Libur via WhatsApp)`,
                });
              } else {
                console.error("[WhatsApp webhook] visit_days upsert error:", visitError.message);
              }

              continue;
            }

            // 2) Pesan diawali kata "grooming" → cari nama kucing dan buat grooming_logs, tanpa membuat activity.
            const lower = normalizedNote;
            const isGroomingCommand = lower.startsWith("grooming ");
            if (isGroomingCommand) {
              // Ambil teks setelah kata "grooming"
              const namesRaw = lower.replace(/^grooming\s+/, "");
              // Pisah dengan koma atau spasi, buang kosong
              const nameTokens = namesRaw
                .split(/[,\n]/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

              if (nameTokens.length > 0) {
                const { data: cats, error: catsError } = await supabase
                  .from("cats")
                  .select("id, name")
                  .eq("is_active", true);

                if (catsError) {
                  console.error("[WhatsApp webhook] fetch cats error:", catsError.message);
                } else {
                  const matchedIds = new Set<string>();
                  const catList = (cats ?? []) as { id: string; name: string }[];
                  const normalizedCats = catList.map((c) => ({
                    id: c.id,
                    name: c.name,
                    nameLower: c.name.trim().toLowerCase(),
                  }));

                  for (const token of nameTokens) {
                    const tokenLower = token.toLowerCase();
                    // Cari nama kucing yang mengandung token (case-insensitive)
                    const match = normalizedCats.find((c) => c.nameLower.includes(tokenLower));
                    if (match) {
                      matchedIds.add(match.id);
                    }
                  }

                  if (matchedIds.size > 0) {
                    const inserts = Array.from(matchedIds).map((catId) => ({
                      cat_id: catId,
                      date: activityDate,
                    }));
                    const { error: groomError } = await supabase.from("grooming_logs").insert(inserts);
                    if (groomError) {
                      console.error("[WhatsApp webhook] grooming_logs insert error:", groomError.message);
                    } else {
                      saved++;
                    }
                  }
                }
              }

              // Tidak membuat daily_activities untuk perintah grooming.
              continue;
            }

            // 3) Default: pesan biasa → simpan ke daily_activities seperti sebelumnya.
            const row = {
              date: activityDate,
              time_slots: [parsed.timeSlot],
              locations: [parsed.location],
              categories: [],
              cat_ids: [],
              note,
              created_by: null,
            };
            let err = (await supabase.from("daily_activities").insert({ ...row, activity_type: "Lainnya" })).error;
            if (err?.code === "23514" && err?.message?.includes("activity_type_check")) {
              err = (await supabase.from("daily_activities").insert({ ...row, activity_type: "Other" })).error;
            }
            if (!err) {
              saved++;
              await supabase.from("activity_log").insert({
                user_id: null,
                action: "create",
                entity_type: "daily_activity",
                summary: `Activity dari WhatsApp: ${activityDate} (${parsed.timeSlot}, ${parsed.location})`,
              });
            } else {
              console.error("[WhatsApp webhook] insert error:", err.message);
            }
          } catch (e) {
            console.error("[WhatsApp webhook] insert error:", e);
          }
        }
      }
    }

    if (saved > 0) revalidatePath("/activity");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}