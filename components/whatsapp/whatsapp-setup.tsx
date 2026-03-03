"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, AlertCircle, MessageCircle, Play, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { testWhatsAppMessageInsert } from "@/app/actions/whatsapp-test";
import { processWhatsAppInbox, type InboxRow } from "@/app/actions/whatsapp-inbox";

const CONTOH_PESAN = `Selasa, 3 Maret 2026

Pagi Toko :
- Bersih - bersih
- Kasi Makan`;

interface LastWebhookDebug {
  raw_preview: string;
  parsed_date: string | null;
  parsed_time_slot: string | null;
  parsed_location: string | null;
  received_at: string;
}

interface WhatsAppSetupProps {
  callbackUrl: string | null;
  hasVerifyToken: boolean;
  hasServiceRoleKey: boolean;
  lastWebhookDebug: LastWebhookDebug | null;
  inboxUnprocessed: InboxRow[];
}

export function WhatsAppSetup({
  callbackUrl,
  hasVerifyToken,
  hasServiceRoleKey,
  lastWebhookDebug,
  inboxUnprocessed,
}: WhatsAppSetupProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [testMessage, setTestMessage] = useState(CONTOH_PESAN);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; parsed?: { date: string; timeSlot: string; location: string; note: string } } | null>(null);
  const [processResult, setProcessResult] = useState<{ processed: number; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isProcessing, startProcessing] = useTransition();

  const handleCopyCallback = () => {
    if (!callbackUrl) return;
    void navigator.clipboard.writeText(callbackUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const allEnvSet = hasVerifyToken && hasServiceRoleKey;

  const handleProcessInbox = () => {
    setProcessResult(null);
    startProcessing(async () => {
      const res = await processWhatsAppInbox();
      setProcessResult(res.ok ? { processed: res.processed } : { processed: 0, error: res.error });
      if (res.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-6 rounded-xl border border-border/60 bg-muted/20 p-6">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Inbox className="h-4 w-4" />
          Kotak masuk WA (penampungan sementara)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Pesan dari WA masuk ke sini dulu. Klik &quot;Proses ke Activity&quot; agar sistem membaca tanggal, waktu, dan lokasi dari teks lalu memindahkan ke halaman Activity.
        </p>
        {inboxUnprocessed.length > 0 ? (
          <>
            <ul className="mt-3 space-y-2">
              {inboxUnprocessed.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-border bg-background/80 p-3 text-sm"
                >
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.received_at).toLocaleString("id-ID")} · {item.from_number}
                  </p>
                  <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-xs">
                    {item.raw_body || "(kosong)"}
                  </pre>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isProcessing}
                onClick={handleProcessInbox}
                className="gap-1.5"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                {isProcessing ? "Memproses…" : "Proses ke Activity"}
              </Button>
              {processResult && (
                <span className={`text-sm ${processResult.error ? "text-destructive" : "text-muted-foreground"}`}>
                  {processResult.error ?? (
                    <>
                      {processResult.processed} pesan diproses ke Activity.{" "}
                      <Link href="/activity" className="underline">Buka Activity →</Link>
                    </>
                  )}
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Tidak ada pesan yang belum diproses. Kirim pesan ke nomor Business agar muncul di sini.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Callback URL (untuk Meta)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste URL ini di Meta for Developers → WhatsApp → Configuration → Callback URL.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-0 rounded bg-muted px-2 py-2 text-sm text-foreground break-all">
            {callbackUrl ?? "https://NAMA-PROJECT.vercel.app/api/webhooks/whatsapp"}
          </code>
          {callbackUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyCallback}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4 text-green-600" />
                  Disalin
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Salin
                </>
              )}
            </Button>
          )}
        </div>
        {!callbackUrl && (
          <p className="mt-2 text-xs text-amber-600">
            Deploy di Vercel agar URL otomatis terisi. Atau ganti manual dengan domain Anda.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Cek environment
        </h2>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            {hasVerifyToken ? (
              <Check className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <span className={hasVerifyToken ? "text-foreground" : "text-amber-600"}>
              WHATSAPP_VERIFY_TOKEN {hasVerifyToken ? "sudah di-set" : "belum di-set (Vercel → Environment Variables)"}
            </span>
          </li>
          <li className="flex items-center gap-2">
            {hasServiceRoleKey ? (
              <Check className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <span className={hasServiceRoleKey ? "text-foreground" : "text-amber-600"}>
              SUPABASE_SERVICE_ROLE_KEY {hasServiceRoleKey ? "sudah di-set" : "belum di-set (untuk simpan pesan ke Activity)"}
            </span>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Langkah sambung ke WhatsApp
        </h2>
        <ol className="mt-2 list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
          <li>Set <code className="rounded bg-muted px-1">WHATSAPP_VERIFY_TOKEN</code> dan <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code> di Vercel → Redeploy.</li>
          <li>Buka <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Meta for Developers</a> → App Anda → WhatsApp → Configuration.</li>
          <li>Isi Callback URL (paste dari atas) dan Verify token (nilai sama dengan <code className="rounded bg-muted px-1">WHATSAPP_VERIFY_TOKEN</code>) → Verify and Save.</li>
          <li>Subscribe field <strong>messages</strong>.</li>
          <li>WhatsApp → API Setup: hubungkan nomor telepon yang dipakai untuk menerima pesan.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Atur waktu & lokasi lewat chat
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Format yang didukung: baris pertama <strong>tanggal</strong> (contoh: Selasa, 3 Maret 2026), lalu baris kosong, lalu <strong>waktu</strong> dan <strong>lokasi</strong> (Pagi/Siang/Sore/Malam + Rumah/Toko), lalu catatan. Tanggal di baris pertama akan dipakai sebagai tanggal activity di website. Jika tidak ada tanggal/waktu/lokasi, dipakai hari ini, jam server (WITA), dan lokasi Rumah.
        </p>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li><strong>Waktu:</strong> Pagi, Siang, Sore, Malam</li>
          <li><strong>Lokasi:</strong> Rumah, Toko</li>
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Contoh format (persis seperti ini):</p>
        <pre className="mt-1 rounded bg-muted p-2 text-xs text-muted-foreground whitespace-pre-wrap">
{`Selasa, 3 Maret 2026

Pagi Toko :
- Bersih - bersih
- Kasi Makan`}
        </pre>
        <p className="mt-1 text-xs text-muted-foreground">
          → Di website: tanggal 3 Maret 2026, waktu Pagi, lokasi Toko, catatan dua baris di atas.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tes parsing (localhost)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tempel pesan di bawah lalu klik Simulasikan. Satu activity akan masuk ke DB dengan tanggal/waktu/lokasi hasil parsing. Cek halaman Activity.
        </p>
        {!hasServiceRoleKey && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>SUPABASE_SERVICE_ROLE_KEY</strong> belum di-set. Tambahkan di <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">.env.local</code> (ambil dari Supabase → Project Settings → API → <strong>service_role</strong>), lalu restart dev server (<code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">npm run dev</code>). Tanpa ini, tes simulasi dan webhook WA tidak bisa menyimpan Activity.
          </div>
        )}
        <textarea
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          placeholder={CONTOH_PESAN}
          rows={6}
          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="mt-2 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isPending || !testMessage.trim() || !hasServiceRoleKey}
            onClick={() => {
              setTestResult(null);
              startTransition(async () => {
                const res = await testWhatsAppMessageInsert(testMessage);
                setTestResult(res);
              });
            }}
            className="gap-1.5"
          >
            <Play className="h-4 w-4" />
            {isPending ? "Memproses…" : "Simulasikan & simpan ke Activity"}
          </Button>
        </div>
        {testResult && (
          <div className={`mt-2 rounded-md border px-3 py-2 text-sm ${testResult.ok ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"}`}>
            {testResult.ok ? (
              <>
                <p className="font-medium text-green-800 dark:text-green-200">Berhasil disimpan.</p>
                {testResult.parsed && (
                  <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                    Tanggal: {testResult.parsed.date}, Waktu: {testResult.parsed.timeSlot}, Lokasi: {testResult.parsed.location}
                  </p>
                )}
                <Link href="/activity" className="mt-2 inline-block text-xs font-medium text-green-700 underline dark:text-green-400">Buka Activity →</Link>
              </>
            ) : (
              <p className="text-amber-800 dark:text-amber-200">{testResult.error}</p>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pesan terakhir dari WA (untuk cek parsing)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Setiap pesan yang masuk lewat webhook akan dicatat di sini. Jika tanggal/waktu/lokasi belum otomatis, bandingkan teks di bawah dengan format yang diharapkan (baris pertama tanggal, lalu baris seperti &quot;Pagi Toko :&quot;).
        </p>
        {lastWebhookDebug ? (
          <div className="mt-3 rounded-md border border-border bg-muted/30 p-3 text-xs">
            <p className="font-medium text-muted-foreground">Teks yang diterima webhook:</p>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-background p-2 font-mono text-[11px]">
              {lastWebhookDebug.raw_preview || "(kosong)"}
            </pre>
            <p className="mt-2 font-medium text-muted-foreground">Hasil parsing:</p>
            <ul className="mt-0.5 list-inside list-disc space-y-0.5">
              <li>Tanggal: {lastWebhookDebug.parsed_date ?? <span className="text-amber-600">null (pakai hari ini)</span>}</li>
              <li>Waktu: {lastWebhookDebug.parsed_time_slot ?? "—"}</li>
              <li>Lokasi: {lastWebhookDebug.parsed_location ?? "—"}</li>
            </ul>
            <p className="mt-1 text-muted-foreground">Diterima: {new Date(lastWebhookDebug.received_at).toLocaleString("id-ID")}</p>
          </div>
        ) : (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>Belum ada data di sini. Kirim satu pesan ke nomor Business, lalu refresh halaman ini.</p>
            <p>Jika pesan sudah tampil di halaman Activity tapi tidak muncul di sini, jalankan migration Supabase agar tabel debug ada: <code className="rounded bg-muted px-1">supabase/migrations/20250227900000_webhook_whatsapp_debug.sql</code> (lewat <code className="rounded bg-muted px-1">npx supabase db push</code> atau SQL Editor di dashboard Supabase).</p>
          </div>
        )}
      </section>

      <section className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
        <Link href="/activity">
          <Button variant="secondary" size="sm" className="gap-1.5">
            <MessageCircle className="h-4 w-4" />
            Lihat Activity
          </Button>
        </Link>
        <a
          href="https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline"
        >
          Dokumentasi Meta Webhook
        </a>
      </section>

      {allEnvSet && callbackUrl && (
        <p className="text-xs text-muted-foreground">
          Tes verifikasi: buka{" "}
          <code className="rounded bg-muted px-1 break-all">
            {callbackUrl}?hub.mode=subscribe&hub.verify_token=TOKEN_ANDA&hub.challenge=12345
          </code>
          {" "}(ganti TOKEN_ANDA dengan nilai WHATSAPP_VERIFY_TOKEN). Response harus hanya angka 12345.
        </p>
      )}
    </div>
  );
}
