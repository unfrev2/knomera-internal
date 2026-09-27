"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import {
  acceptResearchFinding,
  getResearchFinding,
  rejectResearchFinding,
} from "@/lib/db/research-findings";
import {
  runAssumptionExternalResearch,
  runManualCompetitorSweep,
  runManualMarketSweep,
} from "@/lib/domain/external-research";
import { EVIDENCE_DIRECTIONS, EVIDENCE_TYPES } from "@/lib/types";

const rejectSchema = z.object({
  finding_id: z.string().uuid(),
  reason: z.string().trim().max(500).nullable().optional(),
  as_duplicate: z.boolean().optional(),
});

const acceptSchema = z.object({
  finding_id: z.string().uuid(),
  assumption_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).nullable().optional(),
  direction: z.enum(EVIDENCE_DIRECTIONS),
  strength: z.number().int().min(1).max(5),
  evidence_type: z.enum(EVIDENCE_TYPES),
  evidence_date: z.string().date(),
});

export async function runCompetitorSweepAction() {
  const { user, workspace } = await requirePageContext();
  const result = await runManualCompetitorSweep({
    workspaceId: workspace.id,
    triggeredBy: user.id,
  });
  revalidatePath("/evidence");
  revalidatePath("/evidence/research");
  return result;
}

export async function runMarketSweepAction() {
  const { user, workspace } = await requirePageContext();
  const result = await runManualMarketSweep({
    workspaceId: workspace.id,
    triggeredBy: user.id,
  });
  revalidatePath("/evidence");
  revalidatePath("/evidence/research");
  return result;
}

export async function researchAssumptionExternallyAction(input: {
  assumptionId: string;
  mode: "market" | "competitor" | "both";
}) {
  const { user, workspace } = await requirePageContext();
  const results = await runAssumptionExternalResearch({
    workspaceId: workspace.id,
    triggeredBy: user.id,
    assumptionId: input.assumptionId,
    mode: input.mode,
  });
  revalidatePath(`/assumptions/${input.assumptionId}`);
  revalidatePath("/evidence");
  revalidatePath("/evidence/research");
  return results;
}

export async function rejectResearchFindingAction(
  input: z.infer<typeof rejectSchema>,
) {
  const { user, workspace } = await requirePageContext();
  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid rejection.");
  }

  const updated = await rejectResearchFinding(
    workspace.id,
    parsed.data.finding_id,
    user.id,
    parsed.data.reason ?? null,
    parsed.data.as_duplicate ? "duplicate" : "rejected",
  );
  if (!updated) throw new Error("Finding not found or already reviewed.");

  revalidatePath("/evidence/research");
  revalidatePath("/evidence");
  for (const link of updated.assumptions) {
    revalidatePath(`/assumptions/${link.assumption_id}`);
  }
  return updated;
}

export async function acceptResearchFindingAction(
  input: z.infer<typeof acceptSchema>,
) {
  const { user, workspace } = await requirePageContext();
  const parsed = acceptSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid acceptance.");
  }

  const existing = await getResearchFinding(
    workspace.id,
    parsed.data.finding_id,
  );
  if (!existing) throw new Error("Finding not found.");

  const result = await acceptResearchFinding(
    workspace.id,
    parsed.data.finding_id,
    user.id,
    {
      assumption_id: parsed.data.assumption_id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      direction: parsed.data.direction,
      strength: parsed.data.strength,
      evidence_type: parsed.data.evidence_type,
      evidence_date: parsed.data.evidence_date,
    },
  );

  revalidatePath("/evidence/research");
  revalidatePath("/evidence");
  revalidatePath(`/assumptions/${parsed.data.assumption_id}`);
  return result;
}
