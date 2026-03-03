import { redirect } from "next/navigation";
import { getSessionProfile, isAdmin } from "@/lib/auth";
import { getLastWebhookWhatsAppDebug } from "@/app/actions/whatsapp-test";
import { getWhatsAppInboxUnprocessed } from "@/app/actions/whatsapp-inbox";
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
  const lastWebhookDebug = await getLastWebhookWhatsAppDebug();
  const inboxUnprocessed = await getWhatsAppInboxUnprocessed();

  return (
    <div className="space-y-6">
      <header className="no-print">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Koneksi WhatsApp
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pesan masuk disimpan dulu di kotak masuk di bawah. Klik &quot;Proses ke Activity&quot; agar sistem membaca teks (tanggal, waktu, lokasi) lalu memindahkan ke halaman Activity.
        </p>
      </header>

      <WhatsAppSetup
        callbackUrl={callbackUrl}
        hasVerifyToken={hasVerifyToken}
        hasServiceRoleKey={hasServiceRoleKey}
        lastWebhookDebug={lastWebhookDebug}
        inboxUnprocessed={inboxUnprocessed}
      />
    </div>
  );
}
