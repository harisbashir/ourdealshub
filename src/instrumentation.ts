export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runSecurityBootChecks } = await import("./lib/security-boot");
    runSecurityBootChecks();

    // Unhandled rejections → optional Sentry
    process.on("unhandledRejection", (reason) => {
      void import("./lib/error-report").then(({ reportError }) =>
        reportError(reason, { source: "unhandledRejection" })
      );
    });
  }
}

/** Next.js server rendering/route errors; request headers and bodies stay private. */
export async function onRequestError(error: unknown) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("./lib/error-report");
  await reportError(error, { source: "serverRequest" });
}
