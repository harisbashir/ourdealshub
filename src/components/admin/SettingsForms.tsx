"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Eye, EyeOff, Plug } from "lucide-react";
import { ACCENT_PRESETS, type AccentId } from "@/lib/theme";
import {
  saveApiKeys,
  testApiConnection,
  updateAccentTheme,
  type ActionResult,
} from "@/lib/settings-actions";
import type { ApiConfigField, ApiConfigSource } from "@/lib/api-config";
import {
  hintClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  StatusBadge,
} from "@/components/admin/ui";

function ResultMessage({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <p
      role="status"
      className={`text-[15px] font-medium ${result.ok ? "text-success" : "text-danger"}`}
    >
      {result.message}
    </p>
  );
}

/** Colour theme: swatches (radio group) with both appearances previewed. */
export function AccentPicker({ current }: { current: AccentId }) {
  const [selected, setSelected] = useState<AccentId>(current);
  const [result, action, pending] = useActionState(updateAccentTheme, null);

  return (
    <form action={action}>
      <fieldset>
        <legend className="sr-only">Accent colour</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {ACCENT_PRESETS.map((p) => {
            const active = selected === p.id;
            return (
              <label
                key={p.id}
                className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl p-2 ring-1 ${
                  active ? "bg-card-muted ring-2 ring-foreground" : "ring-border-subtle hover:bg-card-muted"
                }`}
              >
                <input
                  type="radio"
                  name="accentTheme"
                  value={p.id}
                  checked={active}
                  onChange={() => setSelected(p.id)}
                  className="sr-only"
                />
                <span className="flex h-11 w-full overflow-hidden rounded-xl ring-1 ring-black/10" aria-hidden>
                  <span className="flex flex-1 items-center justify-center" style={{ background: p.light }}>
                    {active && <Check className="h-4 w-4 text-white" />}
                  </span>
                  <span className="flex flex-1 items-center justify-center bg-[#1c1c1e]">
                    <span className="h-4 w-4 rounded-full" style={{ background: p.dark }} />
                  </span>
                </span>
                <span className="text-[13px] font-medium text-foreground">{p.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <p className={hintClass}>
        Left half: light appearance. Right half: dark. Every option meets WCAG AA contrast in both.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || selected === current} className={primaryButtonClass}>
          {pending ? "Saving…" : "Apply Theme"}
        </button>
        <ResultMessage result={result} />
      </div>
    </form>
  );
}

type FieldView = {
  field: ApiConfigField;
  source: ApiConfigSource;
  display: string;
};

const SOURCE_LABEL: Record<ApiConfigSource, string> = {
  database: "Saved here",
  env: "From server .env",
  default: "Default",
  unset: "Not set",
};

function SecretInput({ view }: { view: FieldView }) {
  const [show, setShow] = useState(false);
  const { field, source, display } = view;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={field.key} className={labelClass}>
          {field.label}
        </label>
        <span className="text-[13px] text-muted">
          {display ? `${display} · ` : ""}
          {SOURCE_LABEL[source]}
        </span>
      </div>
      <div className="relative mt-1.5">
        <input
          id={field.key}
          name={field.key}
          type={show ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          placeholder={display ? "Leave blank to keep the current value" : field.placeholder || "Paste value"}
          className={`${inputClass} pr-12 font-mono`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? `Hide ${field.label}` : `Show ${field.label}`}
          className="absolute right-0.5 top-1/2 inline-flex h-10 w-11 -translate-y-1/2 items-center justify-center text-muted hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {source === "database" && (
        <label className="mt-1.5 inline-flex min-h-9 items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" name={`${field.key}__clear`} className="h-4 w-4" />
          Remove saved value
        </label>
      )}
    </div>
  );
}

function SelectInput({ view }: { view: FieldView }) {
  const { field, source, display } = view;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={field.key} className={labelClass}>
          {field.label}
        </label>
        <span className="text-[13px] text-muted">{SOURCE_LABEL[source]}</span>
      </div>
      <select id={field.key} name={field.key} defaultValue={display} className={`${inputClass} mt-1.5`}>
        {field.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        {display && !field.options?.includes(display) && <option value={display}>{display}</option>}
      </select>
    </div>
  );
}

function TestButton({ target, disabled }: { target: "gemini" | "amazon-us" | "amazon-uk"; disabled: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => start(async () => setResult(await testApiConnection(target)))}
        className={secondaryButtonClass}
      >
        <Plug className="h-4 w-4" aria-hidden />
        {pending ? "Testing…" : "Test Connection"}
      </button>
      <ResultMessage result={result} />
    </div>
  );
}

const GROUPS: {
  id: "gemini" | "amazon-us" | "amazon-uk";
  title: string;
  description: React.ReactNode;
}[] = [
  {
    id: "gemini",
    title: "Google Gemini",
    description: (
      <>
        Writes the editorial copy for new deals. Create a key in Google AI Studio. Use a project
        with <strong>billing enabled</strong>: on the free tier Google may use requests to improve
        its models, and Amazon doesn&apos;t allow its product data to be used for that.
      </>
    ),
  },
  {
    id: "amazon-us",
    title: "Amazon Creators API · US store",
    description: (
      <>
        Fetches product details and keeps them fresh daily. In Associates Central go to Tools →
        Creators API → Create Application, then add credentials. Amazon requires an approved
        account with recent qualifying sales. US credentials are usually version 3.1.
      </>
    ),
  },
  {
    id: "amazon-uk",
    title: "Amazon Creators API · UK store",
    description: (
      <>Only needed for UK deals. Create these in your Amazon.co.uk Associates account (usually version 3.2).</>
    ),
  },
];

/** API keys form. Secrets are write-only: the page only ever shows the last 4 characters. */
export function ApiKeysForm({ views }: { views: FieldView[] }) {
  const [result, action, pending] = useActionState(saveApiKeys, null);

  return (
    <form action={action} className="space-y-6">
      {GROUPS.map((g) => {
        const groupViews = views.filter((v) => v.field.group === g.id);
        const configured = groupViews
          .filter((v) => v.field.secret)
          .every((v) => v.source === "database" || v.source === "env");
        return (
          <fieldset key={g.id} className="rounded-2xl p-4 ring-1 ring-border-subtle">
            <legend className="sr-only">{g.title}</legend>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[17px] font-semibold text-foreground">{g.title}</h3>
              <StatusBadge tone={configured ? "success" : "neutral"}>
                {configured ? "Configured" : "Not configured"}
              </StatusBadge>
            </div>
            <p className="mb-4 text-[13px] leading-relaxed text-muted">{g.description}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {groupViews.map((v) =>
                v.field.options ? (
                  <SelectInput key={v.field.key} view={v} />
                ) : (
                  <SecretInput key={v.field.key} view={v} />
                )
              )}
            </div>
            <div className="mt-4">
              <TestButton target={g.id} disabled={!configured} />
            </div>
          </fieldset>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Saving…" : "Save API Keys"}
        </button>
        <ResultMessage result={result} />
      </div>
      <p className={hintClass}>
        Keys are encrypted in the database with the server&apos;s AUTH_SECRET. Values saved here
        override the server&apos;s .env file. Save first, then test.
      </p>
    </form>
  );
}
