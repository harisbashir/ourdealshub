"use client";

import {
  useState,
  useTransition,
  type ComponentType,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Facebook,
  AtSign,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  connectFacebookPage,
  connectThreadsAccount,
  connectSocialStub,
  disconnectSocialPlatform,
  setSocialPlatformActive,
  retryFailedSocialPosts,
} from "@/lib/social-actions";
import type {
  PublicSocialConnection,
  SocialPlatform,
} from "@/lib/social-connections";
import { buildPlatformPost } from "@/lib/social-posting-styles";
import { CopyTextButton } from "@/components/admin/CopyTextButton";

export type ShareDeal = {
  id: string;
  title: string;
  slug: string;
  categoryName: string;
  geminiText: string;
  affiliateUrl: string;
  dealUrl: string;
  goUrl: string;
};

export type PostActivityRow = {
  id: string;
  productId: string;
  productTitle: string;
  platform: string;
  status: string;
  externalId: string | null;
  error: string | null;
  createdAt: string;
};

type ConnectFn = (formData: FormData) => Promise<
  { ok: true; pageName: string } | { ok: false; error: string }
>;

type PlatformConfig = {
  id: SocialPlatform;
  label: string;
  icon: ComponentType<{ className?: string }>;
  connectAction: ConnectFn;
  setupHint: string;
  guide: {
    steps: ReactNode[];
    idLabel: string;
    idPlaceholder: string;
    tokenLabel: string;
    tokenPlaceholder: string;
  };
};

const DocLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="font-medium text-brand hover:underline inline-flex items-center gap-0.5"
  >
    {children}
    <ExternalLink className="h-3 w-3" />
  </a>
);

const PLATFORMS: PlatformConfig[] = [
  {
    id: "facebook",
    label: "Facebook Page",
    icon: Facebook,
    connectAction: connectFacebookPage,
    setupHint: "Page ID + Page access token required",
    guide: {
      steps: [
        <>
          Open <DocLink href="https://developers.facebook.com/">Meta for Developers</DocLink>{" "}
          → create / select an app.
        </>,
        <>
          In{" "}
          <DocLink href="https://developers.facebook.com/tools/explorer/">
            Graph API Explorer
          </DocLink>
          , pick your app + <strong>Page</strong>, add{" "}
          <code className="text-xs bg-card-muted px-1 rounded">
            pages_manage_posts
          </code>
          , generate a <strong>Page</strong> access token.
        </>,
        <>
          Copy your <strong>Facebook Page ID</strong> + token and paste below.
        </>,
      ],
      idLabel: "Facebook Page ID",
      idPlaceholder: "e.g. 123456789012345",
      tokenLabel: "Page access token",
      tokenPlaceholder: "Paste Page access token",
    },
  },
  {
    id: "threads",
    label: "Threads",
    icon: AtSign,
    connectAction: connectThreadsAccount,
    setupHint: "Threads user ID + access token required",
    guide: {
      steps: [
        <>
          Threads is a <strong>Meta / Instagram</strong> product — not a Facebook
          Page.
        </>,
        <>
          In <DocLink href="https://developers.facebook.com/">Meta for Developers</DocLink>
          , add the <strong>Threads API</strong> product.
        </>,
        <>
          Paste <strong>Threads user ID</strong> + access token below.
        </>,
      ],
      idLabel: "Threads user ID",
      idPlaceholder: "Threads user / account ID",
      tokenLabel: "Threads access token",
      tokenPlaceholder: "Paste Threads access token",
    },
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: Send,
    connectAction: (fd) => connectSocialStub(fd, "telegram"),
    setupHint: "Missing: bot token + chat / channel ID",
    guide: {
      steps: [
        <>
          Talk to <DocLink href="https://t.me/BotFather">@BotFather</DocLink> →
          create a bot → copy the bot token.
        </>,
        <>Add the bot to your channel/group as admin, then get the chat ID.</>,
        <>Paste chat ID + bot token below.</>,
      ],
      idLabel: "Chat / channel ID",
      idPlaceholder: "e.g. -1001234567890",
      tokenLabel: "Bot token",
      tokenPlaceholder: "Paste BotFather token",
    },
  },
  // Instagram / Pinterest / X intentionally omitted — auto-post is not
  // implemented for those platforms yet (would look "connected" but silent).
];

const PLATFORM_LABEL: Record<string, string> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p.label])
);

export function AutomationWorkspace({
  connections,
  activity,
  previewDeal,
}: {
  deals?: ShareDeal[];
  connections: Record<SocialPlatform, PublicSocialConnection>;
  activity: PostActivityRow[];
  previewDeal?: ShareDeal | null;
}) {
  const router = useRouter();
  const [setupPlatform, setSetupPlatform] = useState<SocialPlatform | null>(
    null
  );
  const [pending, startTransition] = useTransition();
  const [retryMsg, setRetryMsg] = useState("");

  function onRetry() {
    setRetryMsg("");
    startTransition(async () => {
      const res = await retryFailedSocialPosts();
      setRetryMsg(
        res.retried > 0
          ? `Retried ${res.retried} deal${res.retried === 1 ? "" : "s"}.`
          : "Nothing to retry right now."
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {PLATFORMS.map((p) => (
          <PlatformCard
            key={p.id}
            config={p}
            connection={connections[p.id]}
            pending={pending}
            onSetup={() => setSetupPlatform(p.id)}
            onToggle={(active) => {
              startTransition(async () => {
                await setSocialPlatformActive(p.id, active);
                router.refresh();
              });
            }}
            onRemove={() => {
              startTransition(async () => {
                await disconnectSocialPlatform(p.id);
                if (setupPlatform === p.id) setSetupPlatform(null);
                router.refresh();
              });
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-60 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
          Retry failed posts now
        </button>
        {retryMsg && (
          <span className="text-xs font-medium text-success">{retryMsg}</span>
        )}
      </div>

      {setupPlatform && (
        <SetupPanel
          key={setupPlatform}
          config={PLATFORMS.find((p) => p.id === setupPlatform)!}
          connection={connections[setupPlatform]}
          previewDeal={previewDeal || null}
          onClose={() => setSetupPlatform(null)}
          onSaved={() => {
            setSetupPlatform(null);
            router.refresh();
          }}
        />
      )}

      {previewDeal && !setupPlatform && (
        <CaptionPreview deal={previewDeal} />
      )}

      <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all hover:border-brand/40">
        <div className="border-b border-border-subtle px-4 sm:px-5 py-3.5">
          <h2 className="text-base font-semibold text-foreground">
            Recent post activity
          </h2>
          <p className="text-xs text-muted-fg mt-0.5">
            Auto-posts when a deal first becomes published
          </p>
        </div>
        {activity.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-fg">
            No social posts yet. Publish a deal with Social auto-post enabled.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-card-muted text-xs uppercase tracking-wide text-muted-fg">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Deal</th>
                  <th className="px-4 py-2.5 font-semibold">Platform</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {activity.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-brand-soft"
                  >
                    <td className="px-4 py-3 max-w-[16rem]">
                      <Link
                        href={`/admin/products/${row.productId}/edit`}
                        className="text-xs font-medium text-foreground line-clamp-2 hover:text-brand"
                      >
                        {row.productTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                      {PLATFORM_LABEL[row.platform] || row.platform}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                          row.status === "ok"
                            ? "bg-success-soft text-success"
                            : "bg-danger-soft text-danger"
                        }`}
                      >
                        {row.status === "ok" ? "Published" : "Failed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-fg max-w-[14rem]">
                      <span className="line-clamp-2 font-mono">
                        {row.status === "ok"
                          ? row.externalId
                            ? `Post ID: ${row.externalId}`
                            : "OK"
                          : row.error || "Error"}
                      </span>
                      <span className="block text-xs text-muted-fg mt-0.5 tabular-nums">
                        {new Date(row.createdAt).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PlatformCard({
  config,
  connection,
  pending,
  onSetup,
  onToggle,
  onRemove,
}: {
  config: PlatformConfig;
  connection: PublicSocialConnection;
  pending: boolean;
  onSetup: () => void;
  onToggle: (active: boolean) => void;
  onRemove: () => void;
}) {
  const Icon = config.icon;
  const live = connection.configured && connection.connected;
  const disabled = connection.configured && !connection.connected;

  return (
    <div className="flex h-full flex-col rounded-xl sm:rounded-2xl border border-border bg-card p-2.5 sm:p-4 shadow-sm transition-all duration-200 hover:border-brand hover:shadow-md hover:shadow-brand/10">
      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
        <span className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-brand-soft text-brand">
          <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {config.label}
          </p>
          {live ? (
            <p className="mt-0.5 text-xs font-medium text-success flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate">Connected</span>
            </p>
          ) : disabled ? (
            <p className="mt-0.5 text-xs font-medium text-warning flex items-center gap-1">
              <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              Disabled
            </p>
          ) : (
            <p className="mt-0.5 text-xs font-medium text-warning flex items-center gap-1">
              <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate">Setup required</span>
            </p>
          )}
          {connection.pageName && live && (
            <p className="mt-0.5 text-xs text-muted-fg truncate hidden sm:block">
              {connection.pageName}
            </p>
          )}
          {connection.expiresSoon && (
            <p className="mt-0.5 text-xs font-semibold text-warning">
              Token expires soon
            </p>
          )}
          {!connection.configured && (
            <p className="mt-0.5 text-xs text-muted-fg leading-snug line-clamp-2 hidden sm:block">
              {config.setupHint}
            </p>
          )}
          {connection.lastError && connection.configured && (
            <p className="mt-0.5 text-xs text-danger line-clamp-1 sm:line-clamp-2">
              {connection.lastError}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto pt-2.5 sm:pt-4 flex flex-wrap gap-1 sm:gap-2">
        {live ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => onToggle(false)}
              className="rounded-md sm:rounded-lg border border-danger/30 bg-danger-soft px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft disabled:opacity-50"
            >
              Disable
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onSetup}
              className="rounded-md sm:rounded-lg border border-brand/30 bg-brand-soft px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-on-brand transition-colors"
            >
              Reconnect
            </button>
          </>
        ) : disabled ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => onToggle(true)}
              className="rounded-md sm:rounded-lg bg-brand px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-on-brand hover:bg-brand-dark disabled:opacity-50"
            >
              Enable
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onSetup}
              className="rounded-md sm:rounded-lg border border-border px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-muted hover:border-brand hover:text-brand"
            >
              Reconnect
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onRemove}
              className="rounded-md sm:rounded-lg border border-border px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-muted-fg hover:border-danger/30 hover:text-danger"
            >
              Remove
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={onSetup}
            className="rounded-md sm:rounded-lg bg-brand px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-on-brand hover:bg-brand-dark disabled:opacity-50"
          >
            Enable
          </button>
        )}
      </div>
    </div>
  );
}

function SetupPanel({
  config,
  connection,
  previewDeal,
  onClose,
  onSaved,
}: {
  config: PlatformConfig;
  connection: PublicSocialConnection;
  previewDeal: ShareDeal | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const Icon = config.icon;
  const sample = previewDeal
    ? buildPlatformPost(config.id, {
        ...previewDeal,
        goUrl: `${previewDeal.goUrl}?src=${config.id === "x" ? "x" : config.id.slice(0, 8)}`,
      })
    : null;

  function onConnect(formData: FormData) {
    setError("");
    startTransition(async () => {
      const res = await config.connectAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <section className="rounded-2xl border border-brand/30 bg-card p-4 sm:p-5 shadow-sm shadow-brand/5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Connect {config.label}
            </h2>
            <p className="text-xs text-muted-fg">
              Credentials stay on the server — never shown to the browser after
              save.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-muted-fg hover:text-brand"
        >
          Close
        </button>
      </div>

      <ol className="mb-4 space-y-1.5 text-sm text-muted list-decimal pl-5">
        {config.guide.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>

      <form action={onConnect} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">
            {config.guide.idLabel}
          </label>
          <input
            name="pageId"
            required
            defaultValue={connection.pageId || ""}
            placeholder={config.guide.idPlaceholder}
            className="w-full rounded-xl border border-border bg-card-muted px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:bg-card focus:ring-2 focus:ring-brand/15"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">
            {config.guide.tokenLabel}
          </label>
          <input
            name="accessToken"
            type="password"
            required
            autoComplete="off"
            placeholder={config.guide.tokenPlaceholder}
            className="w-full rounded-xl border border-border bg-card-muted px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:bg-card focus:ring-2 focus:ring-brand/15"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-on-brand hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Saving…" : `Save & enable ${config.label}`}
        </button>
      </form>

      {sample && (
        <div className="mt-5 border-t border-border-subtle pt-4">
          <p className="text-xs font-semibold text-muted mb-1">
            Sample caption preview
          </p>
          <p className="text-xs text-muted-fg mb-2 line-clamp-1">
            Based on: {previewDeal?.title}
          </p>
          <pre className="max-h-36 overflow-auto rounded-lg bg-card-muted border border-border-subtle px-2.5 py-2 text-xs leading-relaxed text-muted whitespace-pre-wrap font-mono">
            {sample.caption}
          </pre>
          <div className="mt-2">
            <CopyTextButton text={sample.caption} label="Copy sample" />
          </div>
        </div>
      )}
    </section>
  );
}

function CaptionPreview({ deal }: { deal: ShareDeal }) {
  const [platform, setPlatform] = useState<SocialPlatform>("facebook");
  const post = buildPlatformPost(platform, deal);
  const livePlatforms: SocialPlatform[] = ["facebook", "threads", "telegram"];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-brand/40">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Caption preview
          </h2>
          <p className="text-xs text-muted-fg line-clamp-1">
            Latest deal: {deal.title}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {livePlatforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${
                platform === p
                  ? "bg-brand text-on-brand"
                  : "border border-border text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <pre className="max-h-40 overflow-auto rounded-lg bg-card-muted border border-border-subtle px-2.5 py-2 text-xs leading-relaxed text-muted whitespace-pre-wrap font-mono">
        {post.caption}
      </pre>
      <div className="mt-2 flex gap-2">
        <CopyTextButton text={post.caption} label="Copy" />
        <span className="text-xs text-muted-fg self-center tabular-nums">
          {post.countLabel}
        </span>
      </div>
    </section>
  );
}
