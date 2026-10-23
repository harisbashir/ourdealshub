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
