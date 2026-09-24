"use client";

import { BetForm } from "@/components/bets/BetForm";
import { BetOutcomeForm } from "@/components/bets/BetOutcomeForm";
import { Button } from "@/components/ui/Button";
import type { Bet } from "@/lib/types";
import { useState } from "react";

export function BetDetailActions({ bet }: { bet: Bet }) {
  const [editOpen, setEditOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
        Edit
      </Button>
      <Button type="button" onClick={() => setOutcomeOpen(true)}>
        Record outcome
      </Button>
      <BetForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        bet={bet}
      />
      <BetOutcomeForm
        open={outcomeOpen}
        onClose={() => setOutcomeOpen(false)}
        betId={bet.id}
      />
    </div>
  );
}
