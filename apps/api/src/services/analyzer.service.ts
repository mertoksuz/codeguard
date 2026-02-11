import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";

const provider = env.AI_PROVIDER;
const openai = provider === "openai" ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const anthropic = provider === "claude" ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

const ANALYSIS_SYSTEM_PROMPT = (rules: string[]) =>
  `You are an expert code reviewer. Analyze the following PR diff for violations of these rules: ${rules.join(", ")}.
Return a JSON object: { "issues": [{ "ruleId": string, "ruleName": string, "severity": "error"|"warning"|"info", "file": string, "line": number, "message": string, "suggestion": string }] }
Only return the JSON, no other text.`;

const FIX_SYSTEM_PROMPT = `You are an expert code fixer. Fix the following issues in the provided code. Return ONLY the complete fixed file content, no explanations.`;

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<string> {
  if (provider === "claude" && anthropic) {
    const response = await anthropic.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const block = response.content[0];
    return block.type === "text" ? block.text : "";
  }

  // Default: OpenAI
  const oa = openai || new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await oa.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });
  return response.choices[0]?.message?.content || "";
}

export async function analyzePRWithAI(diff: string, rules: string[]) {
  const content = await callAI(ANALYSIS_SYSTEM_PROMPT(rules), diff, 4000);
  try {
    const parsed = JSON.parse(content);
    return parsed.issues || parsed;
  } catch {
    return [];
  }
}

export async function generateFixWithAI(fileContent: string, issues: Array<{ message: string; line: number; suggestion: string }>) {
  const userPrompt = `File content:\n\`\`\`\n${fileContent}\n\`\`\`\n\nIssues to fix:\n${issues.map((i) => `- Line ${i.line}: ${i.message} (Suggestion: ${i.suggestion})`).join("\n")}`;
  return await callAI(FIX_SYSTEM_PROMPT, userPrompt, 8000) || fileContent;
}
