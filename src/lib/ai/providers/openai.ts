import { z } from "zod";
import {
  getOpenAiApiKey,
  getOpenAiModel,
  type AiModelRole,
} from "@/lib/ai/config";
import { ProviderUnavailableError } from "@/lib/research/providers/types";
import type { UsageStats } from "@/lib/research/providers/types";

type ChatMessage = {
  role: "system" | "user" | "developer";
  content: string;
};

export type OpenAiStructuredCallResult<T> = {
  data: T;
  usage: UsageStats;
  model: string;
  role: AiModelRole;
  latencyMs: number;
};

/**
 * Minimal OpenAI Chat Completions client (fetch).
 * Structured JSON via response_format json_schema — validated again by Zod.
 * Compatible with Cloudflare Workers (no Node-only SDK).
 */
export async function openAiStructuredJson<T>(options: {
  role: AiModelRole;
  messages: ChatMessage[];
  schemaName: string;
  schema: Record<string, unknown>;
  zodSchema: z.ZodType<T>;
  temperature?: number;
}): Promise<OpenAiStructuredCallResult<T>> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new ProviderUnavailableError(
      "openai",
      "OPENAI_API_KEY is not configured.",
    );
  }

  const model = getOpenAiModel(options.role);
  const started = Date.now();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.2,
      messages: options.messages.map((m) => ({
        role: m.role === "developer" ? "system" : m.role,
        content: m.content,
      })),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: options.schemaName,
          strict: true,
          schema: options.schema,
        },
      },
    }),
  });

  const latencyMs = Date.now() - started;
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
    };
  };

  if (!response.ok) {
    throw new Error(
      payload.error?.message ??
        `OpenAI request failed (${response.status}).`,
    );
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty content.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned non-JSON content.");
  }

  const validated = options.zodSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error(
      `OpenAI structured output failed validation: ${validated.error.errors[0]?.message ?? "invalid"}`,
    );
  }

  return {
    data: validated.data,
    usage: {
      inputTokens: payload.usage?.prompt_tokens ?? 0,
      outputTokens: payload.usage?.completion_tokens ?? 0,
      aiCalls: 1,
      searchCalls: 0,
      estimatedCost: null,
    },
    model,
    role: options.role,
    latencyMs,
  };
}
