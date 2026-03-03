import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { todayWITA, parseWhatsAppActivityMessage } from "@/lib/whatsapp-activity-parser";

/** Tambah interval ke tanggal (YYYY-MM-DD) berdasarkan teks interval. Contoh: "sebulan", "3 bulan", "seminggu". */
function addIntervalToDate(baseDate: string, intervalRaw: string): string | null {
  const trimmed = String(intervalRaw).trim().toLowerCase();
  if (!baseDate || !trimmed) return null;

  const [y, m, d] = baseDate.split("-").map((v) => parseInt(v, 10));
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);

  // Minggu / hari → tambah hari.
  const weekMatch = trimmed.match(/^(\d+)?\s*(minggu|pekan)$/);
  const dayMatch = trimmed.match(/^(\d+)?\s*hari$/);
  if (weekMatch) {
    const n = weekMatch[1] ? parseInt(weekMatch[1], 10) : 1;
    if (Number.isFinite(n) && n > 0) {
      date.setDate(date.getDate() + n * 7);
    }
  } else if (dayMatch) {
    const n = dayMatch[1] ? parseInt(dayMatch[1], 10) : 1;
    if (Number.isFinite(n) && n > 0) {
      date.setDate(date.getDate() + n);
    }
  } else {
    // Bulan / tahun → tambah bulan.
    const monthMatch = trimmed.match(/^(\d+)?\s*bulan$/);
    const yearMatch = trimmed.match(/^(\d+)?\s*tahun$/);
    if (monthMatch) {
      const n = monthMatch[1] ? parseInt(monthMatch[1], 10) : 1;
      if (Number.isFinite(n) && n > 0) {
        date.setMonth(date.getMonth() + n);
      }
    } else if (yearMatch) {
      const n = yearMatch[1] ? parseInt(yearMatch[1], 10) : 1;
      if (Number.isFinite(n) && n > 0) {
        date.setFullYear(date.getFullYear() + n);
      }
    } else {
      // Kata umum: sebulan, setahun, seminggu (fallback jika tidak kena pola angka).
      if (trimmed === "sebulan") {
        date.setMonth(date.getMonth() + 1);
      } else if (trimmed === "setahun") {
        date.setFullYear(date.getFullYear() + 1);
      } else if (trimmed === "seminggu") {
        date.setDate(date.getDate() + 7);
      } else if (trimmed === "3 bulan") {
        date.setMonth(date.getMonth() + 3);
      } else {
        return null;
      }
    }
  }

  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

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

            const commandText = String(rawNote).trim();
            const commandLower = commandText.toLowerCase();

            // Helper: ambil daftar kucing aktif dan fungsi cocok nama.
            async function getCatMatcher() {
              const { data: cats, error: catsError } = await supabase
                .from("cats")
                .select("id, name")
                .eq("is_active", true);
              if (catsError) {
                console.error("[WhatsApp webhook] fetch cats error:", catsError.message);
                return null;
              }
              const list = (cats ?? []) as { id: string; name: string }[];
              const normalizedCats = list.map((c) => ({
                id: c.id,
                nameLower: c.name.trim().toLowerCase(),
              }));
              return (tokenRaw: string) => {
                const tokenLower = tokenRaw.trim().toLowerCase();
                if (!tokenLower) return null;
                const match = normalizedCats.find((c) => c.nameLower.includes(tokenLower));
                return match?.id ?? null;
              };
            }

            // 2) Obat cacing / obat kutu / vaksin → preventive logs dengan jadwal berikutnya.
            const isDeworm = commandLower.startsWith("obat cacing");
            const isFlea = commandLower.startsWith("obat kutu");
            const isVaccine = commandLower.startsWith("vaksin");
            if (isDeworm || isFlea || isVaccine) {
              const parts = commandText
                .split("-")
                .map((p) => p.trim())
                .filter((p) => p.length > 0);
              const namesPart = parts[1] ?? "";
              const drugPart = parts[2] ?? "";
              const intervalPart = parts[3] ?? "";

              const nameTokens = namesPart
                .split(/[,\n]/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
              if (nameTokens.length === 0) {
                continue;
              }

              const matchCatId = await getCatMatcher();
              if (!matchCatId) {
                continue;
              }

              const catIds = new Set<string>();
              for (const token of nameTokens) {
                const id = matchCatId(token);
                if (id) catIds.add(id);
              }
              if (catIds.size === 0) {
                continue;
              }

              const nextDue = intervalPart ? addIntervalToDate(activityDate, intervalPart) : null;
              const type = isDeworm ? "DEWORM" : isFlea ? "FLEA" : "VACCINE";
              const baseTitle = isDeworm ? "Obat cacing" : isFlea ? "Obat kutu" : "Vaksin";
              const title = drugPart ? `${baseTitle} - ${drugPart.trim()}` : baseTitle;
              const details = intervalPart
                ? `Jadwal berikutnya: ${intervalPart.trim()}`
                : null;

              const rows = Array.from(catIds).map((catId) => ({
                cat_id: catId,
                date: activityDate,
                type,
                title,
                details,
                next_due_date: nextDue,
                is_active_treatment: false,
              }));

              const { error: hlError } = await supabase.from("health_logs").insert(rows);
              if (hlError) {
                console.error("[WhatsApp webhook] health_logs insert error:", hlError.message);
              } else {
                saved++;
                await supabase.from("activity_log").insert({
                  user_id: null,
                  action: "create",
                  entity_type: "health_log",
                  summary: `${baseTitle} via WhatsApp untuk ${catIds.size} kucing pada ${activityDate}`,
                });
              }

              // Tidak membuat daily_activities untuk perintah preventive.
              continue;
            }

            // 3) Dirawat:
            //    Format lengkap (disarankan):
            //    "dirawat - nama kucing - kondisi(status) - lokasi - menular - keterangan"
            //    Contoh: "dirawat - boodie - ringan - klinik - tidak menular - kaki sakit"
            //    Masih mendukung format lama: "dirawat - nama kucing - keterangan".
            const isDirawat = commandLower.startsWith("dirawat");
            if (isDirawat) {
              const parts = commandText
                .split("-")
                .map((p) => p.trim())
                .filter((p) => p.length > 0);
              const namesPart = parts[1] ?? "";
              const kondisiPart = (parts[2] ?? "").toLowerCase();
              const lokasiPart = (parts[3] ?? "").toLowerCase();
              const menularPart = (parts[4] ?? "").toLowerCase();
              const notePart =
                parts[5] ??
                parts[4] ??
                parts[3] ??
                parts[2] ??
                "";

              const nameTokens = namesPart
                .split(/[,\n]/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
              if (nameTokens.length === 0) {
                continue;
              }

              const matchCatId = await getCatMatcher();
              if (!matchCatId) {
                continue;
              }
              const catIds = new Set<string>();
              for (const token of nameTokens) {
                const id = matchCatId(token);
                if (id) catIds.add(id);
              }
              if (catIds.size === 0) {
                continue;
              }

              // Map teks kondisi bebas → nilai dirawat_status yang valid.
              const statusTokens = kondisiPart
                ? kondisiPart
                    .split(/[,\s/]+/)
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0)
                : [];
              const dirawatValues = new Set<string>();
              for (const t of statusTokens) {
                if (t === "parah") dirawatValues.add("parah");
                else if (t === "sedang") dirawatValues.add("sedang");
                else if (t === "ringan") dirawatValues.add("ringan");
                else if (t === "seger" || t === "segar" || t === "membaik") dirawatValues.add("seger");
                else if (t === "lemes" || t === "lemah") dirawatValues.add("lemes");
                else if (t === "makan" || t === "mau_makan") dirawatValues.add("mau_makan");
                else if (t === "tidak_makan" || t === "ga_mau_makan" || t === "gak_mau_makan" || t === "tdk_mau_makan") {
                  dirawatValues.add("tidak_mau_makan");
                }
              }

              const rows = Array.from(catIds).map((catId) => ({
                cat_id: catId,
                date: activityDate,
                type: "NOTE" as const,
                title: "Dalam perawatan",
                details: notePart ? notePart.trim() : null,
                next_due_date: null,
                is_active_treatment: true,
              }));

              const { error: hlError } = await supabase.from("health_logs").insert(rows);
              if (hlError) {
                console.error("[WhatsApp webhook] dirawat logs insert error:", hlError.message);
              } else {
                saved++;
                await supabase.from("activity_log").insert({
                  user_id: null,
                  action: "create",
                  entity_type: "health_log",
                  summary: `Menandai ${catIds.size} kucing sebagai Dirawat via WhatsApp pada ${activityDate}`,
                });
              }

              // Siapkan update ke kolom cats: dirawat_status + status + location + is_contagious + treatment_notes.
              const allowedDirawat = [
                "tidak_ada_perubahan",
                "ada_perubahan",
                "parah",
                "sedang",
                "ringan",
                "mau_makan",
                "tidak_mau_makan",
                "lemes",
                "seger",
              ];
              const finalDirawatStatuses =
                dirawatValues.size > 0
                  ? Array.from(dirawatValues).filter((v) => allowedDirawat.includes(v))
                  : [];

              // Kondisi → status umum kucing (jika cocok enum utama).
              let catStatus: string | null = null;
              if (kondisiPart === "sehat") catStatus = "sehat";
              else if (kondisiPart === "membaik") catStatus = "membaik";
              else if (kondisiPart === "memburuk") catStatus = "memburuk";
              else if (kondisiPart === "hampir sembuh" || kondisiPart === "hampir_sembuh") catStatus = "hampir_sembuh";
              else if (kondisiPart === "observasi") catStatus = "observasi";
              else if (kondisiPart === "sakit") catStatus = "sakit";

              // Lokasi.
              let catLocation: string | null = null;
              if (lokasiPart === "rumah") catLocation = "rumah";
              else if (lokasiPart === "toko") catLocation = "toko";
              else if (lokasiPart === "klinik") catLocation = "klinik";

              // Menular.
              let isContagious: boolean | null = null;
              if (menularPart === "menular" || menularPart === "ya") isContagious = true;
              else if (menularPart === "tidak menular" || menularPart === "tidak" || menularPart === "nggak" || menularPart === "ga") {
                isContagious = false;
              }

              const catUpdate: Record<string, unknown> = {};
              if (finalDirawatStatuses.length > 0) catUpdate.dirawat_status = finalDirawatStatuses;
              if (catStatus) catUpdate.status = catStatus;
              if (catLocation) catUpdate.location = catLocation;
              if (isContagious !== null) catUpdate.is_contagious = isContagious;
              if (notePart && notePart.trim()) catUpdate.treatment_notes = notePart.trim();

              if (Object.keys(catUpdate).length > 0) {
                const { error: catErr } = await supabase
                  .from("cats")
                  .update(catUpdate)
                  .in("id", Array.from(catIds));
                if (catErr) {
                  console.error("[WhatsApp webhook] update cats (dirawat) error:", catErr.message);
                } else {
                  await supabase.from("activity_log").insert({
                    user_id: null,
                    action: "update",
                    entity_type: "cat",
                    summary: `Update Dirawat via WhatsApp untuk ${catIds.size} kucing (status/kondisi/lokasi/menular/keterangan)`,
                  });
                }
              }

              // Tidak membuat daily_activities untuk perintah dirawat.
              continue;
            }

            // 4) Pesan diawali kata "grooming" → cari nama kucing dan buat grooming_logs, tanpa membuat activity.
            //    Mendukung dua format:
            //    - "grooming cipao, celo"
            //    - "grooming - cipao, celo"
            const isGroomingCommand = commandLower.startsWith("grooming");
            if (isGroomingCommand) {
              // Ambil bagian setelah kata "grooming"
              const afterKeyword = commandText.replace(/^grooming\s*/i, "");
              // Jika ada tanda "-", buang sampai "-" pertama agar format "grooming - cipao" juga didukung
              const namesSegment = afterKeyword.includes("-")
                ? afterKeyword.split("-").slice(1).join("-").trim()
                : afterKeyword.trim();
              const nameTokens = namesSegment
                .split(/[,\n]/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

              if (nameTokens.length > 0) {
                const matchCatId = await getCatMatcher();
                  if (matchCatId) {
                    const matchedIds = new Set<string>();
                    for (const token of nameTokens) {
                      const id = matchCatId(token);
                      if (id) matchedIds.add(id);
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
                        await supabase.from("activity_log").insert({
                          user_id: null,
                          action: "create",
                          entity_type: "grooming_log",
                          summary: `Grooming via WhatsApp untuk ${matchedIds.size} kucing pada ${activityDate}`,
                        });
                      }
                    }
                  }
              }

              // Tidak membuat daily_activities untuk perintah grooming.
              continue;
            }

            // 5) Berat badan: "berat - cipao - 3.2" → weight_logs (tanpa activity).
            const isWeight = commandLower.startsWith("berat");
            if (isWeight) {
              const parts = commandText
                .split("-")
                .map((p) => p.trim())
                .filter((p) => p.length > 0);
              const namesPart = parts[1] ?? "";
              const weightPart = parts[2] ?? "";

              const nameTokens = namesPart
                .split(/[,\n]/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
              if (nameTokens.length === 0 || !weightPart) {
                continue;
              }

              const weightNum = parseFloat(weightPart.replace(",", "."));
              if (!Number.isFinite(weightNum) || weightNum <= 0) {
                continue;
              }

              const matchCatId = await getCatMatcher();
              if (!matchCatId) {
                continue;
              }
              const catIds = new Set<string>();
              for (const token of nameTokens) {
                const id = matchCatId(token);
                if (id) catIds.add(id);
              }
              if (catIds.size === 0) {
                continue;
              }

              const rows = Array.from(catIds).map((catId) => ({
                cat_id: catId,
                date: activityDate,
                weight_kg: weightNum,
              }));

              const { error: wError } = await supabase.from("weight_logs").insert(rows);
              if (wError) {
                console.error("[WhatsApp webhook] weight_logs insert error:", wError.message);
              } else {
                saved++;
                await supabase.from("activity_log").insert({
                  user_id: null,
                  action: "create",
                  entity_type: "weight_log",
                  summary: `Log berat via WhatsApp (${weightNum} kg) untuk ${catIds.size} kucing pada ${activityDate}`,
                });
              }

              // Tidak membuat daily_activities untuk perintah berat.
              continue;
            }

            // 6) Inventory: "inventory - beli - whiskas basah - 5 - pcs" → inventory_movements.
            const isInventory = commandLower.startsWith("inventory");
            if (isInventory) {
              const parts = commandText
                .split("-")
                .map((p) => p.trim())
                .filter((p) => p.length > 0);
              const reasonPart = (parts[1] ?? "").toLowerCase();
              const namePart = parts[2] ?? "";
              const qtyPart = parts[3] ?? "";
              const unitPart = parts[4] ?? "";

              if (!reasonPart || !namePart || !qtyPart) {
                continue;
              }

              let reason: "PURCHASE" | "USAGE" | "ADJUSTMENT" | null = null;
              if (reasonPart.includes("beli") || reasonPart === "purchase") reason = "PURCHASE";
              else if (reasonPart.includes("pakai") || reasonPart.includes("keluar") || reasonPart === "usage") reason = "USAGE";
              else if (reasonPart.includes("adjust") || reasonPart.includes("selisih")) reason = "ADJUSTMENT";

              if (!reason) {
                continue;
              }

              const qtyNum = parseFloat(qtyPart.replace(",", "."));
              if (!Number.isFinite(qtyNum) || qtyNum === 0) {
                continue;
              }

              const { data: items, error: itemsError } = await supabase
                .from("inventory_items")
                .select("id, name, unit");

              if (itemsError) {
                console.error("[WhatsApp webhook] fetch inventory_items error:", itemsError.message);
                continue;
              }

              const list = (items ?? []) as { id: string; name: string; unit: string }[];
              const nameLower = namePart.toLowerCase();
              const matchItem = list.find((it) => it.name.trim().toLowerCase().includes(nameLower));
              if (!matchItem) {
                continue;
              }

              const delta = reason === "USAGE" ? -Math.abs(qtyNum) : Math.abs(qtyNum);
              const note =
                unitPart && unitPart.trim()
                  ? `${reason === "PURCHASE" ? "Pembelian" : reason === "USAGE" ? "Pemakaian" : "Penyesuaian"} via WhatsApp (${unitPart.trim()})`
                  : `${reason === "PURCHASE" ? "Pembelian" : reason === "USAGE" ? "Pemakaian" : "Penyesuaian"} via WhatsApp`;

              const { error: mvError } = await supabase.from("inventory_movements").insert({
                item_id: matchItem.id,
                date: activityDate,
                change_qty: delta,
                reason,
                note,
              });

              if (mvError) {
                console.error("[WhatsApp webhook] inventory_movements insert error:", mvError.message);
              } else {
                saved++;
                await supabase.from("activity_log").insert({
                  user_id: null,
                  action: "update",
                  entity_type: "inventory",
                  entity_id: matchItem.id,
                  summary: `Inventory dari WhatsApp: ${matchItem.name} ${delta > 0 ? `+${delta}` : delta} (${reason})`,
                });
              }

              // Tidak membuat daily_activities untuk perintah inventory.
              continue;
            }

            // 7) Default: pesan biasa → simpan ke daily_activities seperti sebelumnya.
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