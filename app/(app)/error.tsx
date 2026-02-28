"use client";

/**
 * Error boundary for the authenticated app routes.
 * Catches server-side exceptions (e.g. from Supabase rate limits, DB timeouts)
 * and shows a retry button instead of crashing the entire page.
 */
export default function AppError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">
                Terjadi kesalahan
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
                Gagal memuat halaman. Ini biasanya bersifat sementara — coba muat ulang.
            </p>
            <button
                onClick={reset}
                className="mt-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
                Coba lagi
            </button>
        </div>
    );
}
