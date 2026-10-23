import { unstable_rethrow } from "next/navigation";

/**
 * Admin forms show validation problems inline. Server actions throw Error
 * with a user-facing message; in production Next.js hides thrown messages, so
 * the form wrappers below catch them and return the text instead.
 */
export type FormState = { error: string } | null;

export async function toFormState(run: () => Promise<unknown>): Promise<FormState> {
  try {
    await run();
    return null;
  } catch (e) {
    // Let redirect()/notFound() through — they're control flow, not errors
    unstable_rethrow(e);
    const issues = (e as { issues?: { message?: string }[] })?.issues;
    if (Array.isArray(issues) && issues.length) {
      return { error: issues.map((i) => i.message).filter(Boolean).join(" ") };
    }
    return {
      error: e instanceof Error && e.message ? e.message : "Something went wrong. Try again.",
    };
  }
}
