import Anthropic from "@anthropic-ai/sdk";

const keys = [
  process.env.ANTHROPIC_API_KEY,
  process.env.ANTHROPIC_API_KEY_2,
  process.env.ANTHROPIC_API_KEY_3,
  process.env.ANTHROPIC_API_KEY_4,
  process.env.ANTHROPIC_API_KEY_5,
].filter((k): k is string => Boolean(k));

if (keys.length === 0) {
  throw new Error("No ANTHROPIC_API_KEY configured");
}

let cursor = 0;

export function getAnthropic(): Anthropic {
  const key = keys[cursor % keys.length];
  cursor++;
  return new Anthropic({ apiKey: key });
}

export const MODEL = "claude-sonnet-4-6" as const;
