import { IdeaDetailActions } from "@/components/ideas/IdeaDetailActions";
import {
  IdeaAssumptionsPanel,
  IdeaProblemsPanel,
} from "@/components/ideas/IdeaLinksPanels";
import { PageAlert, PageFrame } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { requirePageContext } from "@/lib/auth/context";
import {
  getIdea,
  listAssumptionsForIdea,
  listProblemsForIdea,
} from "@/lib/db/ideas";
import { formatDate } from "@/lib/format";
import { displayName } from "@/lib/labels";
import { notFound } from "next/navigation";

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requirePageContext();
  const { id } = await params;

  let idea;
  let problems;
  let assumptions;

  try {
    idea = await getIdea(workspace.id, id);
    if (!idea) notFound();
    [problems, assumptions] = await Promise.all([
      listProblemsForIdea(workspace.id, id),
      listAssumptionsForIdea(workspace.id, id),
    ]);
  } catch {
    return (
      <PageFrame width="narrow">
        <PageAlert>
          We could not load this idea. Check your connection and try again.
        </PageAlert>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="narrow">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              Idea
            </p>
            <h1 className="text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
              {idea.title}
            </h1>
          </div>
          <IdeaDetailActions idea={idea} />
        </div>

        <Badge variant="idea-status" value={idea.status} />

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Submitted by</dt>
            <dd className="font-medium text-navy">
              {displayName(idea.submitted_by)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Captured</dt>
            <dd className="font-medium text-navy">
              {formatDate(idea.created_at)}
            </dd>
          </div>
        </dl>
      </header>

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">Notes</h2>
        <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
          {idea.description ?? "No notes."}
        </p>
      </section>

      <IdeaProblemsPanel ideaId={idea.id} problems={problems} />
      <IdeaAssumptionsPanel ideaId={idea.id} assumptions={assumptions} />
    </PageFrame>
  );
}
