/** Pure HTTP clients for image channels. Only original editorial artwork is sent. */
export const INSTAGRAM_API = "https://graph.instagram.com/v25.0";
export const PINTEREST_API = "https://api.pinterest.com/v5";
export class SocialApiError extends Error {
  constructor(message: string, public uncertain = false) { super(message); }
}

type ApiData = { id?: string; user_id?: string; username?: string; name?: string; status_code?: string; error?: { message?: string }; message?: string; privacy?: string };
async function request(url: string, token: string, method = "GET", body?: object): Promise<ApiData> {
  let response: Response;
  try {
    response = await fetch(url, {
      method, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new SocialApiError("The platform did not confirm the request. Check its activity before retrying.", method === "POST");
  }
  const data = await response.json().catch(() => ({})) as ApiData;
  if (!response.ok || data.error) {
    // Never include a request URL, token or response dump in logs.
    const raw = data.error?.message || data.message || `Platform returned HTTP ${response.status}.`;
    const message = raw.split(token).join("[redacted]").slice(0, 500);
    throw new SocialApiError(message, method === "POST" && response.status >= 500);
  }
  return data;
}

export function socialOriginError(origin: string): string | null {
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || host === "localhost" || host.endsWith(".lan") || host.endsWith(".local") || host.endsWith(".test") || host.endsWith(".internal") || /^[\d.]+$/.test(host) || host.includes(":")) {
      return "Instagram and Pinterest need a public HTTPS domain so they can fetch your share cards. This local preview cannot publish image posts.";
    }
    return null;
  } catch { return "Set a public HTTPS site URL before publishing image posts."; }
}

export async function verifyInstagram(userId: string, token: string) {
  const data = await request(`${INSTAGRAM_API}/me?fields=user_id,username`, token);
  if ((data.user_id || data.id) !== userId) throw new Error("This Instagram token belongs to a different account. Use the Instagram user ID from Instagram Login.");
  return data.username ? `@${data.username}` : userId;
}
export async function verifyPinterest(boardId: string, token: string) {
  const data = await request(`${PINTEREST_API}/boards/${encodeURIComponent(boardId)}`, token);
  if (!data.id) throw new Error("Pinterest could not verify this board.");
  if (data.privacy && data.privacy !== "PUBLIC") throw new Error("Choose a public Pinterest board for published deals.");
  return data.name || boardId;
}

export async function publishInstagram(opts: { accountId: string; token: string; imageUrl: string; caption: string }) {
  const container = await request(`${INSTAGRAM_API}/${encodeURIComponent(opts.accountId)}/media`, opts.token, "POST", { image_url: opts.imageUrl, caption: opts.caption });
  if (!container.id) throw new SocialApiError("Instagram did not return a media container ID.");
  // Bounded polling: cron can finish cleanly; no endless in-process worker.
  let ready = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    const state = await request(`${INSTAGRAM_API}/${encodeURIComponent(container.id)}?fields=status_code`, opts.token);
    if (state.status_code === "FINISHED") { ready = true; break; }
    if (state.status_code === "ERROR" || state.status_code === "EXPIRED") throw new SocialApiError("Instagram could not prepare the share card. Check account permissions and public image access.");
    if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!ready) throw new SocialApiError("Instagram is still preparing the image. Retry later; nothing was published.");
  const result = await request(`${INSTAGRAM_API}/${encodeURIComponent(opts.accountId)}/media_publish`, opts.token, "POST", { creation_id: container.id });
  if (!result.id) throw new SocialApiError("Instagram did not confirm a published post ID. Check the account before retrying.", true);
  return result.id;
}
export async function publishPinterest(opts: { boardId: string; token: string; imageUrl: string; title: string; description: string; link: string }) {
  const result = await request(`${PINTEREST_API}/pins`, opts.token, "POST", {
    board_id: opts.boardId, title: opts.title.slice(0, 100), description: opts.description.slice(0, 800), link: opts.link,
    alt_text: `${opts.title} — OurDealsHub editorial pick`,
    media_source: { source_type: "image_url", url: opts.imageUrl, is_standard: true },
  });
  if (!result.id) throw new SocialApiError("Pinterest did not confirm a Pin ID. Check the board before retrying.", true);
  return result.id;
}
