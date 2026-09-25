import { SectionHeading } from "@/components/layout/Page";
import type {
  HomeAttentionItem,
  HomeCloserMetrics,
  HomeLearningItem,
} from "@/lib/db/home";
import type { Bet, FocusItem } from "@/lib/types";
import Link from "next/link";
import type { ReactNode } from "react";

function HomeSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <SectionHeading title={title} description={description} actions={action} />
      {children}
    </section>
  );
}

function ItemList({
  items,
  empty,
}: {
  items: { kind: string; id: string; href: string; title: string; meta?: string | null }[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <li key={`${item.kind}:${item.id}`} className="py-3">
          <Link
            href={item.href}
            className="block text-sm font-medium text-navy hover:underline"
          >
            {item.title}
          </Link>
          {item.meta ? (
            <p className="mt-0.5 text-xs text-muted">{item.meta}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function AttentionSection({ items }: { items: HomeAttentionItem[] }) {
  return (
    <HomeSection
      title="What needs our attention?"
      description="Strategically meaningful gaps — not a task inbox."
      action={
        <Link href="/assumptions" className="text-sm text-blue hover:underline">
          Assumptions
        </Link>
      }
    >
      <ItemList
        items={items}
        empty="Nothing urgent right now. Keep validating high-importance assumptions."
      />
    </HomeSection>
  );
}

export function LearningSection({ items }: { items: HomeLearningItem[] }) {
  return (
    <HomeSection
      title="What are we learning?"
      description="Recent movement in company knowledge."
      action={
        <Link href="/evidence" className="text-sm text-blue hover:underline">
          Evidence
        </Link>
      }
    >
      <ItemList
        items={items}
        empty="No recent learning yet. Discovery and evidence will show here."
      />
    </HomeSection>
  );
}

export function DoingSection({
  bets,
  jonFocus,
  ahmedFocus,
}: {
  bets: Bet[];
  jonFocus: FocusItem[];
  ahmedFocus: FocusItem[];
}) {
  return (
    <HomeSection
      title="What are we doing?"
      description="Active commitments and this week's focus."
      action={
        <Link href="/focus" className="text-sm text-blue hover:underline">
          Focus
        </Link>
      }
    >
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="space-y-2">
          <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
            Active bets
          </h3>
          {bets.length === 0 ? (
            <p className="text-sm text-muted">No active bets.</p>
          ) : (
            <ul className="space-y-2">
              {bets.slice(0, 4).map((bet) => (
                <li key={bet.id}>
                  <Link
                    href={`/bets/${bet.id}`}
                    className="text-sm font-medium text-navy hover:underline"
                  >
                    {bet.title}
                  </Link>
                  <p className="text-xs text-muted">{bet.status}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <FocusBrief name="Jon" items={jonFocus} />
        <FocusBrief name="Ahmed" items={ahmedFocus} />
      </div>
    </HomeSection>
  );
}

function FocusBrief({ name, items }: { name: string; items: FocusItem[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
        {name}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No focus set this week.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="text-sm text-navy">
              {item.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CloserSection({ metrics }: { metrics: HomeCloserMetrics }) {
  const pipeline =
    metrics.pipeline_value != null
      ? new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: metrics.pipeline_currency,
          maximumFractionDigits: 0,
        }).format(metrics.pipeline_value)
      : null;

  const items = [
    {
      label: "Discovery conversations",
      value: String(metrics.discovery_sessions),
      href: "/discovery",
    },
    {
      label: "Organisations spoken to",
      value: String(metrics.organisations),
      href: "/discovery",
    },
    {
      label: "Active opportunities",
      value: String(metrics.active_opportunities),
      href: "/commercial",
    },
    {
      label: "Proposal / pilot",
      value: String(metrics.proposal_or_pilot),
      href: "/commercial",
    },
    {
      label: "Commercial evidence",
      value: String(metrics.commercial_evidence),
      href: "/evidence?type=commercial",
    },
    ...(pipeline
      ? [
          {
            label: "Open pipeline value",
            value: pipeline,
            href: "/commercial",
          },
        ]
      : []),
  ];

  return (
    <HomeSection
      title="Are we getting closer to a business?"
      description="Early commercial indicators — not vanity metrics."
      action={
        <Link href="/commercial" className="text-sm text-blue hover:underline">
          Commercial
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded border border-line bg-white/60 px-4 py-3 transition-colors hover:bg-cream-tint/50"
          >
            <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
              {item.label}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-navy">
              {item.value}
            </p>
          </Link>
        ))}
      </div>
    </HomeSection>
  );
}

export function ActivitySection({ items }: { items: HomeLearningItem[] }) {
  if (items.length === 0) return null;
  return (
    <HomeSection
      title="Recent activity"
      description="Secondary signal from history and evidence — not the main view."
    >
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={`activity:${item.kind}:${item.id}`} className="text-sm">
            <Link href={item.href} className="text-navy hover:underline">
              {item.meta ?? item.title}
            </Link>
            <span className="text-muted"> — {item.title}</span>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
