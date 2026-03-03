"use server";

import { getSessionProfile, isAdmin } from "@/lib/auth";

const META_API_VERSION = "v18.0";
const SEND_URL = (phoneNumberId: string) =>
  `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`;

/**
 * Kirim pesan WhatsApp dari nomor Business (terdaftar di API) ke nomor tujuan.
 * Butuh WHATSAPP_ACCESS_TOKEN dan WHATSAPP_PHONE_NUMBER_ID di env.
 * Hanya admin. Penerima harus pernah mengirim pesan ke nomor kita dalam 24 jam terakhir (session message).
 */
export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const { session, profile } = await getSessionProfile();
  if (!session || !isAdmin(profile)) {
    return { ok: false, error: "Hanya admin." };
  }

  const token = (process.env.WHATSAPP_ACCESS_TOKEN ?? "").trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID ?? "").trim();
  if (!token || !phoneNumberId) {
    return {
      ok: false,
      error:
        "WHATSAPP_ACCESS_TOKEN atau WHATSAPP_PHONE_NUMBER_ID belum di-set. Tambahkan di Vercel → Environment Variables.",
    };
  }

  const normalizedTo = to.replace(/\D/g, "");
  if (normalizedTo.length < 10) {
    return { ok: false, error: "Nomor tujuan tidak valid (minimal 10 digit)." };
  }

  const text = (body ?? "").trim();
  if (!text) {
    return { ok: false, error: "Isi pesan kosong." };
  }

  try {
    const res = await fetch(SEND_URL(phoneNumberId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedTo,
        type: "text",
        text: { body: text, preview_url: false },
      }),
    });

    const data = (await res.json()) as { messages?: Array<{ id: string }>; error?: { message: string } };
    if (!res.ok) {
      const msg = data?.error?.message ?? res.statusText ?? "Gagal mengirim.";
      return { ok: false, error: msg };
    }
    const messageId = data?.messages?.[0]?.id;
    return { ok: true, messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
