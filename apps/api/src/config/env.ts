import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("4000"),
  API_PORT: z.string().default("4000"),
  DATABASE_URL: z.string().default("postgresql://codeguard:codeguard_secret@localhost:5433/codeguard_db"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  NEXTAUTH_URL: z.string().default("http://localhost:3000"),
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  GITHUB_APP_ID: z.string().default(""),
  GITHUB_APP_PRIVATE_KEY: z.string().default(""),
  SLACK_BOT_TOKEN: z.string().default(""),
});

export const env = envSchema.parse(process.env);
