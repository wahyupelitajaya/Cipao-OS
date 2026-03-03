"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, AlertCircle, MessageCircle, Play, Settings2, BookOpen, FlaskConical, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { testWhatsAppMessageInsert } from "@/app/actions/whatsapp-test";
import { sendWhatsAppMessage } from "@/app/actions/whatsapp-send";

const CONTOH_PESAN = `Selasa, 3 Maret 2026

Pagi Toko :
- Bersih - bersih
- Kasi Makan`;

interface WhatsAppSetupProps {
  callbackUrl: string | null;
  hasVerifyToken: boolean;
  hasServiceRoleKey: boolean;
  hasSendConfig: boolean;
}

export function WhatsAppSetup({
  callbackUrl,
  hasVerifyToken,
  hasServiceRoleKey,
  hasSendConfig,
}: WhatsAppSetupProps) {
  const [copied, setCopied] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [sendResult, setSendResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [sendPending, startSendTransition] = useTransition();
  const [testMessage, setTestMessage] = useState(CONTOH_PESAN);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    error?: string;
    parsed?: { date: string; timeSlot: string; location: string; note: string };
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCopyCallback = () => {
    if (!callbackUrl) return;
    void navigator.clipboard.writeText(callbackUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const allEnvSet = hasVerifyToken && hasServiceRoleKey;

  return (
    <div className="space-y-8">
      {/* 1. Setup & konfigurasi */}
      <section className="rounded-xl border border-border/60 bg-muted/20 p-6 space-y-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Setup & konfigurasi
        </h2>

        <div>
          <h3 className="text-sm font-medium text-foreground">Callback URL (untuk Meta)</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Paste URL ini di Meta for Developers → WhatsApp → Configuration → Callback URL.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="flex-1 min-w-0 rounded bg-muted px-2 py-2 text-sm text-foreground break-all">
              {callbackUrl ?? "https://NAMA-PROJECT.vercel.app/api/webhooks/whatsapp"}
            </code>
            {callbackUrl && (
              <Button type="button" variant="outline" size="sm" onClick={handleCopyCallback} className="shrink-0">
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
              Deploy di Vercel agar URL terisi. Atau isi manual dengan domain Anda.
            </p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-foreground">Environment (Vercel)</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              {hasVerifyToken ? (
                <Check className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              )}
              <span className={hasVerifyToken ? "text-foreground" : "text-amber-600"}>
                WHATSAPP_VERIFY_TOKEN {hasVerifyToken ? "sudah di-set" : "belum di-set"}
              </span>
            </li>
            <li className="flex items-center gap-2">
              {hasServiceRoleKey ? (
                <Check className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              )}
              <span className={hasServiceRoleKey ? "text-foreground" : "text-amber-600"}>
                SUPABASE_SERVICE_ROLE_KEY {hasServiceRoleKey ? "sudah di-set" : "belum di-set"}
              </span>
            </li>
            <li className="flex items-center gap-2">
              {hasSendConfig ? (
                <Check className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={hasSendConfig ? "text-foreground" : "text-muted-foreground"}>
                WHATSAPP_ACCESS_TOKEN + PHONE_NUMBER_ID {hasSendConfig ? "sudah di-set (bisa kirim pesan)" : "belum (opsional, untuk kirim pesan)"}
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-medium text-foreground">Langkah sambung ke WhatsApp</h3>
          <ol className="mt-2 list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
            <li>Set env di Vercel → Redeploy.</li>
            <li>
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Meta for Developers
              </a>{" "}
              → App → WhatsApp → Configuration: isi Callback URL dan Verify token → Verify and Save.
            </li>
            <li>Subscribe field <strong>messages</strong>.</li>
            <li>WhatsApp → API Setup: hubungkan nomor untuk menerima pesan.</li>
          </ol>
        </div>

        {allEnvSet && callbackUrl && (
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/60">
            Tes verifikasi: buka{" "}
            <code className="rounded bg-muted px-1 break-all">
              {callbackUrl}?hub.mode=subscribe&hub.verify_token=TOKEN_ANDA&hub.challenge=12345
            </code>{" "}
            (ganti TOKEN_ANDA). Response harus: 12345.
          </p>
        )}
      </section>

      {/* 2. Format pesan (cara pakai) */}
      <section className="rounded-xl border border-border/60 bg-muted/20 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Format pesan agar tanggal, waktu & lokasi terbaca
        </h2>
        <p className="text-sm text-muted-foreground">
          Baris pertama: <strong>tanggal</strong> (contoh: Selasa, 3 Maret 2026). Lalu baris kosong, lalu{" "}
          <strong>waktu</strong> + <strong>lokasi</strong> (Pagi/Siang/Sore/Malam + Rumah/Toko), lalu isi catatan.
          Sistem akan memakai nilai ini untuk Activity. Jika tidak ada, dipakai: hari ini, jam server (WITA), Rumah.
        </p>
        <ul className="text-sm text-muted-foreground space-y-0.5">
          <li><strong>Waktu:</strong> Pagi, Siang, Sore, Malam</li>
          <li><strong>Lokasi:</strong> Rumah, Toko</li>
        </ul>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Contoh:</p>
          <pre className="rounded bg-muted p-3 text-xs text-muted-foreground whitespace-pre-wrap font-mono">
{`Selasa, 3 Maret 2026

Pagi Toko :
- Bersih - bersih
- Kasi Makan`}
          </pre>
          <p className="mt-1 text-xs text-muted-foreground">
            → Activity: tanggal 3 Maret 2026, waktu Pagi, lokasi Toko.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          <strong>Cara uji:</strong> Kirim pesan ke nomor WhatsApp Business yang terhubung → cek halaman Activity.
        </p>
      </section>

      {/* 3. Kirim pesan (dari nomor Business ke nomor lain) */}
      {hasSendConfig && (
        <section className="rounded-xl border border-border/60 bg-muted/20 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Send className="h-4 w-4" />
            Kirim pesan (dari nomor Business)
          </h2>
          <p className="text-sm text-muted-foreground">
            Kirim pesan ke nomor lain sebagai nomor WhatsApp Business yang terdaftar di API. Nomor tujuan: format 62xxx (tanpa +). Penerima harus pernah mengirim pesan ke nomor Business Anda dalam 24 jam terakhir.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nomor tujuan (62xxx)</label>
            <Input
              type="text"
              placeholder="6281234567890"
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Pesan</label>
            <textarea
              value={sendBody}
              onChange={(e) => setSendBody(e.target.value)}
              placeholder="Tulis pesan..."
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={sendPending || !sendTo.trim() || !sendBody.trim()}
              onClick={() => {
                setSendResult(null);
                startSendTransition(async () => {
                  const res = await sendWhatsAppMessage(sendTo.trim(), sendBody.trim());
                  setSendResult(res);
                });
              }}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" />
              {sendPending ? "Mengirim…" : "Kirim"}
            </Button>
          </div>
          {sendResult && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                sendResult.ok
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                  : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
              }`}
            >
              {sendResult.ok ? (
                <p className="font-medium text-green-800 dark:text-green-200">Pesan terkirim.</p>
              ) : (
                <p className="text-amber-800 dark:text-amber-200">{sendResult.error}</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* 4. Tes simulasi parsing */}
      <section className="rounded-xl border border-border/60 bg-muted/20 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <FlaskConical className="h-4 w-4" />
          Tes parsing (simulasi ke Activity)
        </h2>
        <p className="text-sm text-muted-foreground">
          Cek apakah format teks terbaca benar tanpa kirim WA. Tempel teks di bawah, klik Simulasikan → satu Activity
          akan dibuat dengan tanggal/waktu/lokasi hasil parsing. Berguna untuk uji format sebelum kirim ke nomor Business.
        </p>
        {!hasServiceRoleKey && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>SUPABASE_SERVICE_ROLE_KEY</strong> belum di-set. Tambahkan di .env.local (Supabase → API →
            service_role), lalu restart dev server. Tanpa ini simulasi dan webhook tidak bisa menyimpan Activity.
          </div>
        )}
        <textarea
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          placeholder={CONTOH_PESAN}
          rows={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap items-center gap-2">
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
          <div
            className={`rounded-md border px-3 py-2 text-sm ${
              testResult.ok
                ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
            }`}
          >
            {testResult.ok ? (
              <>
                <p className="font-medium text-green-800 dark:text-green-200">Berhasil disimpan.</p>
                {testResult.parsed && (
                  <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                    Tanggal: {testResult.parsed.date}, Waktu: {testResult.parsed.timeSlot}, Lokasi:{" "}
                    {testResult.parsed.location}
                  </p>
                )}
                <Link href="/activity" className="mt-2 inline-block text-xs font-medium text-green-700 underline dark:text-green-400">
                  Buka Activity →
                </Link>
              </>
            ) : (
              <p className="text-amber-800 dark:text-amber-200">{testResult.error}</p>
            )}
          </div>
        )}
      </section>

      {/* 5. Link cepat */}
      <section className="flex flex-wrap items-center gap-3">
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
    </div>
  );
}
