import type { Metadata } from "next";
import Link from "next/link";
import { HelpList, type HelpItem } from "@/components/HelpList";
import { AMAZON_ASSOCIATE_STATEMENT } from "@/lib/affiliate-disclosure";

export const metadata: Metadata = {
  title: "Help",
  description:
    "How to find, save and open picks on OurDealsHub, how paid links work, and what to do if something looks wrong.",
  alternates: { canonical: "/help" },
};

const GETTING_AROUND: HelpItem[] = [
  {
    q: "How do I find something?",
    a: (
      <>
        <p>
          On a phone, use the tabs at the bottom: <strong>Home</strong> for new and trending
          picks, <strong>Browse</strong> for every category, <strong>Search</strong> to look up a
          product by name, and <strong>Saved</strong> for picks you&apos;ve kept. On a computer
          the same sections are at the top of the page, with search on the right.
        </p>
        <p>Category chips under the top bar on the Home page jump straight to a category.</p>
      </>
    ),
  },
  {
    q: "What do All, US and UK mean?",
    a: (
      <p>
        Each pick opens in one Amazon store: <strong>US</strong> is Amazon.com and{" "}
        <strong>UK</strong> is Amazon.co.uk. Choose a store with the switch in the top bar to see
        only its picks, or <strong>All</strong> for everything. Your choice is remembered on this
        device.
      </p>
    ),
  },
  {
    q: "How do I save a pick for later?",
    a: (
      <p>
        Tap the heart on a product photo, or <strong>Save</strong> on its page. Saved picks appear
        in the Saved tab. They&apos;re stored only in this browser, so they won&apos;t follow you to
        another device, and clearing your browser data removes them. If a pick is taken off the
        site, it disappears from Saved automatically.
      </p>
    ),
  },
  {
    q: "Can I use dark mode?",
    a: (
      <p>
        Yes. The site follows your device&apos;s appearance by default. To choose Light or Dark
        regardless of your device, tap the sun, moon or screen icon in the top bar and pick an
        option. Choose <strong>System</strong> to go back to following your device.
      </p>
    ),
  },
  {
    q: "How do I share a pick?",
    a: (
      <p>
        Open the pick and tap <strong>Share</strong>. On phones this opens your share sheet; on
        computers it copies the link.
      </p>
    ),
  },
];

const PICKS: HelpItem[] = [
  {
    q: "What happens when I tap “View on Amazon”?",
    a: (
      <p>
        Amazon opens in a new tab on that product&apos;s page, where you can see the current price,
        delivery options and reviews, and buy if you want to. OurDealsHub never handles payments
        or orders.
      </p>
    ),
  },
  {
    q: "Why don’t you show prices?",
    a: (
      <p>
        Amazon prices change often, sometimes several times a day, and Amazon&apos;s rules only
        allow prices that come straight from its live data. To make sure you never see an
        out-of-date price, the current price is shown on Amazon.
      </p>
    ),
  },
  {
    q: "What does “Paid link” mean?",
    a: (
      <>
        <p>
          {AMAZON_ASSOCIATE_STATEMENT} If you buy something after following a link, Amazon may pay
          OurDealsHub a small commission. You pay exactly the same price.
        </p>
        <p>
          <Link href="/disclosure">Read the full affiliate disclosure</Link>.
        </p>
      </>
    ),
  },
  {
    q: "How are products chosen and written about?",
    a: (
      <p>
        Picks are chosen by the OurDealsHub team. Each write-up summarises the product&apos;s
        listed features in plain words to help you decide whether it&apos;s worth a closer look.
        Some write-ups are drafted with the help of AI and reviewed against Amazon&apos;s product
        details. Always check size, compatibility and the current price on Amazon before buying.
      </p>
    ),
  },
  {
    q: "Is the pick in my country’s store?",
    a: (
      <p>
        Each product page says which store it opens in. If you&apos;re outside that country, Amazon
        may suggest your local store or show delivery limits.
      </p>
    ),
  },
];

const TROUBLE: HelpItem[] = [
  {
    q: "A link didn’t work or the product is unavailable",
    a: (
      <p>
        Products sometimes sell out or are removed from Amazon. Links are checked every day and
        unavailable picks are taken down, but there can be a short delay. Please{" "}
        <Link href="/contact">let us know</Link> which pick it was.
      </p>
    ),
  },
  {
    q: "The text is too small or hard to read",
    a: (
      <p>
        The site follows your browser&apos;s text size and zoom. On iPhone or Android, increase the
        text size in your device settings or use pinch-to-zoom. On a computer, press Ctrl and +
        (Cmd and + on a Mac). Dark mode can also be more comfortable in low light.
      </p>
    ),
  },
  {
    q: "Do you collect my data?",
    a: (
      <p>
        Saved picks, your store choice and appearance stay in your browser. When you open a link,
        OurDealsHub counts the click (without storing your IP address) so popular picks show in
        Trending. <Link href="/privacy">Read the privacy policy</Link>.
      </p>
    ),
  },
  {
    q: "How do I contact you?",
    a: (
      <p>
        Use the <Link href="/contact">contact page</Link>. OurDealsHub can&apos;t help with Amazon
        orders, returns or deliveries; for those, contact Amazon customer service.
      </p>
    ),
  },
];

export default function HelpPage() {
  return (
    <div className="site-container max-w-2xl pb-4 pt-4">
      <h1 className="text-[28px] font-bold tracking-tight text-foreground sm:text-[34px]">
        Help
      </h1>
      <p className="mt-1 text-[15px] text-muted">
        Quick answers about finding, saving and opening picks.
      </p>

      <nav aria-label="Help topics" className="mt-4 flex flex-wrap gap-2">
        {[
          ["#getting-around", "Getting Around"],
          ["#picks", "Picks & Paid Links"],
          ["#trouble", "Something Wrong?"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="pressable inline-flex h-10 items-center rounded-full bg-card px-4 text-[15px] font-medium text-foreground ring-1 ring-border hover:bg-card-muted"
          >
            {label}
          </a>
        ))}
      </nav>

      <HelpList id="getting-around" title="Getting Around" items={GETTING_AROUND} />
      <HelpList id="picks" title="Picks & Paid Links" items={PICKS} />
      <HelpList id="trouble" title="Something Wrong?" items={TROUBLE} />
    </div>
  );
}
