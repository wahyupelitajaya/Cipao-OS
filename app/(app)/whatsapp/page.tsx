import { redirect } from "next/navigation";
import { getSessionProfile, isAdmin } from "@/lib/auth";
import { getWhatsAppSentMessages } from "@/app/actions/whatsapp-send";
import { WhatsAppSetup } from "@/components/whatsapp/whatsapp-setup";

export default async function WhatsAppPage() {
  const { session, profile } = await getSessionProfile();
  if (!session) redirect("/login");
  if (!isAdmin(profile)) redirect("/dashboard");

  const baseUrl =
    process.env.VERCEL_URL != null && process.env.VERCEL_URL !== ""
      ? `https://${process.env.VERCEL_URL}`
      : null;
  const callbackUrl = baseUrl ? `${baseUrl}/api/webhooks/whatsapp` : null;
  const hasVerifyToken = !!(process.env.WHATSAPP_VERIFY_TOKEN ?? "").trim();
  const hasServiceRoleKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const hasSendConfig =
    !!(process.env.WHATSAPP_ACCESS_TOKEN ?? "").trim() &&
    !!(process.env.WHATSAPP_PHONE_NUMBER_ID ?? "").trim();
  const sentMessages = hasSendConfig ? await getWhatsAppSentMessages(100) : [];

  return (
    <div className="space-y-6">
      <header className="no-print">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Koneksi WhatsApp
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sambungkan nomor WhatsApp Business; pesan masuk diproses otomatis (tanggal, waktu, lokasi dari teks) dan tersimpan di Activity.
        </p>
      </header>

      <WhatsAppSetup
        callbackUrl={callbackUrl}
        hasVerifyToken={hasVerifyToken}
        hasServiceRoleKey={hasServiceRoleKey}
        hasSendConfig={hasSendConfig}
        sentMessages={sentMessages}
      />
    </div>
  );
}
