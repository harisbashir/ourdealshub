"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/lib/form-state";

/**
 * <form> for admin server actions that shows the action's error message
 * above the fields (and moves focus there) instead of an error page.
 */
export function ActionForm({
  action,
  className,
  children,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const alertRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state?.error) alertRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className={className} aria-busy={pending}>
      {state?.error && (
        <p
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl bg-danger-soft px-4 py-3 text-[15px] font-medium text-danger outline-none"
        >
          {state.error}
        </p>
      )}
      {children}
    </form>
  );
}
