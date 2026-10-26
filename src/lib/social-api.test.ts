import assert from "node:assert/strict";
import { test } from "node:test";
import { publishInstagram, publishPinterest, verifyInstagram, verifyPinterest, socialOriginError, SocialApiError } from "./social-api";

function mockResponses(responses: { body: object; status?: number }[]) {
  const calls: { url: string; options?: RequestInit }[] = [];
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    const response = responses.shift();
    assert.ok(response, "Unexpected network call");
    return Response.json(response.body, { status: response.status || 200 });
  };
  return { calls, restore: () => { globalThis.fetch = previous; } };
}

test("Instagram verifies account ownership before credentials are saved", async () => {
  const mock = mockResponses([{ body: { user_id: "123", username: "ourdeals" } }, { body: { user_id: "999" } }]);
  try { assert.equal(await verifyInstagram("123", "secret"), "@ourdeals"); await assert.rejects(verifyInstagram("123", "secret"), /different account/); }
  finally { mock.restore(); }
});
test("Instagram prepares an original JPEG then publishes the ready container", async () => {
  const mock = mockResponses([{ body: { id: "container" } }, { body: { status_code: "FINISHED" } }, { body: { id: "published" } }]);
  try {
    assert.equal(await publishInstagram({ accountId: "123", token: "secret", caption: "#ad Pick", imageUrl: "https://shop.example.com/api/social-image/pick" }), "published");
    assert.match(mock.calls[2].url, /123\/media_publish$/);
    const create = JSON.parse(String(mock.calls[0].options?.body));
    assert.match(create.image_url, /social-image/);
    assert.ok(!mock.calls.some((call) => call.url.includes("secret")));
    assert.equal(JSON.parse(String(mock.calls[2].options?.body)).creation_id, "container");
  } finally { mock.restore(); }
});
test("Instagram rejects failed processing without publishing", async () => {
  const mock = mockResponses([{ body: { id: "container" } }, { body: { status_code: "ERROR" } }]);
  try { await assert.rejects(publishInstagram({ accountId: "123", token: "secret", caption: "#ad", imageUrl: "https://example.com/card.jpg" }), /could not prepare/); assert.equal(mock.calls.length, 2); }
  finally { mock.restore(); }
});
test("Pinterest sends the board, disclosure, original image and destination", async () => {
  const mock = mockResponses([{ body: { id: "456", name: "Picks", privacy: "PUBLIC" } }, { body: { id: "pin" } }]);
  try {
    assert.equal(await verifyPinterest("456", "secret"), "Picks");
    assert.equal(await publishPinterest({ boardId: "456", token: "secret", imageUrl: "https://example.com/card.jpg", title: "Pick", description: "#ad Affiliate pick", link: "https://www.amazon.ca/dp/B000000001?tag=owner-20" }), "pin");
    const body = JSON.parse(String(mock.calls[1].options?.body));
    assert.equal(body.board_id, "456"); assert.equal(body.media_source.source_type, "image_url"); assert.match(body.description, /#ad/); assert.match(body.link, /amazon.ca/);
  } finally { mock.restore(); }
});
test("unconfirmed writes require review; explicit API rejection can be retried", async () => {
  const mock = mockResponses([{ body: { message: "Invalid secret token" }, status: 401 }, { body: { message: "Try later" }, status: 503 }]);
  const opts = { boardId: "456", token: "secret", imageUrl: "https://example.com/card.jpg", title: "Pick", description: "#ad", link: "https://example.com" };
  try {
    await assert.rejects(publishPinterest(opts), (error) => error instanceof SocialApiError && !error.uncertain && !error.message.includes("secret"));
    await assert.rejects(publishPinterest(opts), (error) => error instanceof SocialApiError && error.uncertain);
  } finally { mock.restore(); }
});
test("local preview domains cannot advertise image publishing as ready", () => {
  for (const origin of ["https://ourdeals.lan", "http://shop.example.com", "https://192.168.2.232", "https://localhost", "https://[::1]"]) assert.ok(socialOriginError(origin));
  assert.equal(socialOriginError("https://shop.example.com"), null);
});
