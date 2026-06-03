import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("No OPENAI_API_KEY configured");
}

export function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey });
}
