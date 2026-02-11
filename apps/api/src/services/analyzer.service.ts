import OpenAI from "openai";
import { env } from "../config/env";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function analyzePRWithAI(diff: string, rules: string[]) {
  const response = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert code reviewer. Analyze the following PR diff for violations of these rules: ${rules.join(", ")}.
Return a JSON array of issues found: [{ "ruleId": string, "ruleName": string, "severity": "error"|"warning"|"info", "file": string, "line": number, "message": string, "suggestion": string }]
Only return the JSON array, no other text.`,
      },
      { role: "user", content: diff },
    ],
    temperature: 0.1,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "[]";
  try {
    const parsed = JSON.parse(content);
    return parsed.issues || parsed;
  } catch {
    return [];
  }
}

export async function generateFixWithAI(fileContent: string, issues: Array<{ message: string; line: number; suggestion: string }>) {
  const response = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert code fixer. Fix the following issues in the provided code. Return ONLY the complete fixed file content, no explanations.`,
      },
      {
        role: "user",
        content: `File content:\n\`\`\`\n${fileContent}\n\`\`\`\n\nIssues to fix:\n${issues.map((i) => `- Line ${i.line}: ${i.message} (Suggestion: ${i.suggestion})`).join("\n")}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 8000,
  });

  return response.choices[0]?.message?.content || fileContent;
}
