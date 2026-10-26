/**
 * Optional error reporting — set SENTRY_DSN to enable.
 * No extra npm package; uses Sentry store endpoint when configured.
 */
export async function reportError(
  error: unknown,
  context?: Record<string, string | number | boolean | null | undefined>
): Promise<void> {
  // Alert summaries intentionally exclude raw errors, request data and stacks.
  try {
    const { recordSystemEvent } = await import("./system-events");
    const source = String(context?.source || "application").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    if (context?.source !== "socialQueue") await recordSystemEvent({ category: "operations", level: "error", title: "Application error reported", detail: `An operation failed in ${source || "application"}. Review application logs for details.`, dedupeKey: `runtime-error:${source}:${new Date().toISOString().slice(0, 13)}`, adminPath: "/admin/settings#email" });
  } catch { /* reporting must never break the application */ }
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  try {
    const match = dsn.match(
      /^https:\/\/([^@]+)@([^/]+)\/(\d+)/
    );
    if (!match) return;
    const [, key, host, projectId] = match;
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;

    await fetch(`https://${host}/api/${projectId}/store/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${key}`,
      },
      body: JSON.stringify({
        message,
        level: "error",
        platform: "node",
        timestamp: Date.now() / 1000,
        exception: stack
          ? {
              values: [
                {
                  type: error instanceof Error ? error.name : "Error",
                  value: message,
                  stacktrace: { frames: [{ filename: "app", function: stack }] },
                },
              ],
            }
          : undefined,
        tags: context || {},
        extra: context || {},
      }),
      cache: "no-store",
    });
  } catch {
    /* never throw from reporter */
  }
}
