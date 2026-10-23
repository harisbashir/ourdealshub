import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-auth";
import { isSuperAdmin } from "@/lib/permissions";
import { HelpList, type HelpItem } from "@/components/HelpList";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Help" };

const START: HelpItem[] = [
  {
    q: "First steps for a new admin",
    a: (
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          Ask a Super Admin to add your Amazon <strong>Tracking ID</strong> (for example{" "}
          <code>yourname-20</code>) under Admins. Without it you can&apos;t add deals, because every
          link must carry your own tag.
        </li>
        <li>
          Open <Link href="/admin/products/new">Add Deal</Link> and paste an Amazon product link.
        </li>
        <li>Review the write-up, then publish.</li>
      </ol>
    ),
  },
  {
    q: "Getting around the admin on a phone",
    a: (
      <p>
        Tap the menu button at the top left to open every section. The current section&apos;s
        name is shown in the top bar. On a computer the same list is always visible on the left.
      </p>
    ),
  },
  {
    q: "What can Admins and Super Admins do?",
    a: (
      <p>
        <strong>Admins</strong> add and manage their own deals and see analytics for them.{" "}
        <strong>Super Admins</strong> can manage every deal plus categories, the blog, social
        automation, admin accounts and site settings (colour theme, API keys, AI prompt).
      </p>
    ),
  },
];

const DEALS: HelpItem[] = [
  {
    q: "Adding a deal from an Amazon link",
    a: (
      <>
        <p>
          In <Link href="/admin/products/new">Add Deal</Link>, paste a product link (amazon.com or
          amazon.co.uk) or a 10-character ASIN. The site fetches the title, features, photo and
          category from Amazon&apos;s Creators API, then Gemini writes an original summary.
        </p>
        <p>
          If <em>Publish imported deals immediately</em> is off (Settings), you&apos;ll see a
          preview to edit before publishing. The store (US or UK) is detected from the link.
        </p>
      </>
    ),
  },
  {
    q: "Adding a deal by hand",
    a: (
      <p>
        Use the manual form when Amazon import isn&apos;t set up or a product won&apos;t import.
        Paste your Amazon link, a title, an Amazon image URL (from SiteStripe) and your write-up.
        Your tracking ID is added to the link automatically; any other tag is replaced.
      </p>
    ),
  },
  {
    q: "Why was my deal blocked as a duplicate?",
    a: (
      <p>
        Each product can appear once per store, across all admins, so visitors never see the
        same item twice. If another admin already added it, it can&apos;t be added again. US and
        UK listings of the same product count separately.
      </p>
    ),
  },
  {
    q: "Scheduling and expiry",
    a: (
      <p>
        On a deal&apos;s edit page you can set <strong>Publish at</strong> (it goes live at the
        next daily run after that time) and <strong>Expires</strong> (it disappears from the site
        after that time). Use expiry for anything tied to a limited-time event.
      </p>
    ),
  },
  {
    q: "What does “Refresh from Amazon” do?",
    a: (
      <p>
        It pulls the latest photo from Amazon without touching your title or write-up. The site
        also does this for every deal once a day when the Creators API is connected.
      </p>
    ),
  },
  {
    q: "A deal was unpublished on its own",
    a: (
      <p>
        The daily check takes a deal down when Amazon reports the product unavailable, or its page
        is missing, <strong>on two checks in a row</strong>. A single failure only flags it as
        broken in the product list. Fix the link or ASIN and publish again.
      </p>
    ),
  },
];

const RULES: HelpItem[] = [
  {
    q: "What must never appear in a deal",
    a: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Prices, discounts, “% off”, savings, coupon or promo codes.</li>
        <li>Customer reviews, star ratings, review counts, “Best Seller”, “#1” or “Amazon’s Choice”.</li>
        <li>Prime, shipping, delivery or stock claims, or urgency such as “today only”.</li>
        <li>Claims that you tested or own the product, unless that’s genuinely true.</li>
      </ul>
    ),
  },
  {
    q: "Why these rules?",
    a: (
      <>
        <p>
          They come from the Amazon Associates Operating Agreement and Program Policies plus FTC
          endorsement guidelines. Breaking them can close the Associates account and forfeit
          commissions. For example, prices may only be shown from Amazon&apos;s live data, and
          reviews and star ratings may not be displayed (Program Policies §6(t)).
        </p>
        <p>
          The site checks every title and write-up before saving and rejects text that breaks
          these rules, so you&apos;ll see a message naming the problem.
        </p>
      </>
    ),
  },
  {
    q: "Images and links",
    a: (
      <p>
        Product photos must come from Amazon (the Creators API or SiteStripe) and stay on
        Amazon&apos;s servers; never upload or edit them. Every “View on Amazon” button is labelled
        as a paid link and the site shows the Associates disclosure on every page.
      </p>
    ),
  },
  {
    q: "Sharing deals outside the website",
    a: (
      <p>
        Social posts are fine, with the paid-link disclosure the automation adds. Don&apos;t put
        Amazon links in printed material, e-books or unsolicited emails, and never buy through
        your own links or ask friends to.
      </p>
    ),
  },
];

const STATS: HelpItem[] = [
  {
    q: "What counts as a click?",
    a: (
      <p>
        Each time a visitor opens a “View on Amazon” link. Obvious bots and rapid repeat clicks are
        ignored. Click history is kept for 90 days. Trending ranks deals by clicks.
      </p>
    ),
  },
  {
    q: "Tracking where clicks come from",
    a: (
      <p>
        Add <code>?src=</code> to a deal&apos;s link, for example <code>/go/deal-name?src=fb</code>,
        when you share it. Analytics then shows clicks per source. Social automation adds this for
        you.
      </p>
    ),
  },
];

const SUPER: HelpItem[] = [
  {
    q: "Changing the site’s colour theme",
    a: (
      <p>
        <Link href="/admin/settings#appearance">Settings → Colour Theme</Link>. Pick a colour and
        tap <strong>Apply Theme</strong>. It changes buttons, links and highlights across the site
        and admin immediately. Visitors still choose light or dark mode themselves.
      </p>
    ),
  },
  {
    q: "Adding or changing API keys",
    a: (
      <>
        <p>
          <Link href="/admin/settings#api-keys">Settings → API Keys</Link>. Paste the value and tap{" "}
          <strong>Save API Keys</strong>, then <strong>Test Connection</strong>. Saved keys are
          encrypted and never shown again in full; leave a field blank to keep its current value.
        </p>
        <p>
          <strong>Gemini:</strong> create a key in Google AI Studio on a project with billing
          enabled. <strong>Amazon:</strong> in Associates Central go to Tools → Creators API, create
          an application and add credentials. Amazon only grants access to approved accounts with
          recent qualifying sales.
        </p>
      </>
    ),
  },
  {
    q: "Managing admins and tracking IDs",
    a: (
      <p>
        <Link href="/admin/admins">Admins</Link> lets you add people, set their US and UK tracking
        IDs, limit them to product work, revoke access or delete them. Passwords need at least 10
        characters. Revoked admins are signed out within seconds.
      </p>
    ),
  },
  {
    q: "Editing the AI writing prompt",
    a: (
      <p>
        <Link href="/admin/settings#ai-prompt">Settings → AI Writing Prompt</Link>. The recommended
        prompt follows Amazon&apos;s rules; if you customise it, keep those rules in. Use{" "}
        <strong>Use Recommended Prompt</strong> to go back at any time.
      </p>
    ),
  },
  {
    q: "Server jobs, backups and updates",
    a: (
      <p>
        A daily job runs at 13:00 UTC: it publishes scheduled deals, refreshes Amazon data, checks
        links and sends the Telegram digest. The database is backed up nightly and the last 14
        backups are kept. Deployment and restore steps are in <code>docs/DEPLOY.md</code> in the
        repository. The Go-Live checklist in Settings shows when the job last ran.
      </p>
    ),
  },
];

const TROUBLE: HelpItem[] = [
  {
    q: "“Amazon denied the request” or “rejected the credentials”",
    a: (
      <p>
        Check that the Creators API credentials, their version, and your tracking ID belong to the
        same Associates store (US credentials with a US tag). Use Test Connection in Settings.
      </p>
    ),
  },
  {
    q: "“Gemini couldn’t generate copy”",
    a: (
      <p>
        If it says the model isn&apos;t available, choose a current model in Settings → API Keys.
        If the key was rejected, create a new one. The deal can still be saved with Amazon&apos;s
        own title and features.
      </p>
    ),
  },
  {
    q: "I can’t sign in",
    a: (
      <p>
        After several wrong passwords, sign-in is paused for 15 minutes for that email and
        network. A Super Admin can reset your password under Admins. Sessions last 8 hours.
      </p>
    ),
  },
];

export default async function AdminHelpPage() {
  const admin = await requireAdminSession();
  const superAdmin = isSuperAdmin(admin);

  const sections: [string, string, HelpItem[]][] = [
    ["start", "Getting Started", START],
    ["deals", "Adding & Managing Deals", DEALS],
    ["rules", "Amazon Rules", RULES],
    ["stats", "Clicks & Analytics", STATS],
    ...(superAdmin ? ([["super", "Super Admin", SUPER]] as [string, string, HelpItem[]][]) : []),
    ["trouble", "Troubleshooting", TROUBLE],
  ];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Help"
        description="How to add deals, stay within Amazon's rules, and run the site."
      />
      <nav aria-label="Help topics" className="flex flex-wrap gap-2">
        {sections.map(([id, title]) => (
          <a
            key={id}
            href={`#${id}`}
            className="pressable inline-flex h-10 items-center rounded-full bg-card px-4 text-[15px] font-medium text-foreground ring-1 ring-border hover:bg-card-muted"
          >
            {title}
          </a>
        ))}
      </nav>
      {sections.map(([id, title, items]) => (
        <HelpList key={id} id={id} title={title} items={items} />
      ))}
    </div>
  );
}
