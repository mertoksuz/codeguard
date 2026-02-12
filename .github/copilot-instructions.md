# CodeGuard AI — Project Context & Instructions

## Overview

CodeGuard AI is an **AI-powered code review SaaS** that analyzes GitHub pull requests for SOLID principle violations, code quality issues, and generates auto-fix PRs. Users interact via Slack (share a PR link → get analysis) and a web dashboard.

**Owner:** Mert Oksuz (`mertoksuz/codeguard` on GitHub)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Web App** | Next.js 14 (App Router), Tailwind CSS, Framer Motion |
| **API** | Express.js (standalone on Render) |
| **Worker** | BullMQ + Redis (processes review/fix jobs) |
| **Database** | PostgreSQL via Prisma v5.22.0 |
| **Auth** | NextAuth.js (GitHub OAuth + credentials) |
| **Payments** | iyzico V2 API (direct HTTP with HMAC-SHA256, **no SDK**) |
| **AI** | OpenAI (default) or Anthropic Claude (configurable via `AI_PROVIDER`) |
| **Integrations** | GitHub API (Octokit), Slack (bolt/web-api) |
| **Node** | v20.10.0 |

### Terminal PATH Fix (always run first)
```bash
export PATH="$HOME/.local/share/pnpm:$HOME/.nvm/versions/node/v20.10.0/bin:$PATH"
```

---

## Monorepo Structure

```
codeguard-ai/
├── apps/
│   ├── web/          # Next.js 14 — Vercel (codeguard-ai.vercel.app)
│   ├── api/          # Express.js — Render
│   └── worker/       # BullMQ worker — Render
├── packages/
│   ├── db/           # Prisma schema + client
│   ├── analyzer/     # Static analysis rules engine
│   └── shared/       # Shared types and utils
```

---

## Database Schema (key models)

- **User** — NextAuth users with `UserRole` (ADMIN/MEMBER)
- **Team** — Organizations, has `plan` (FREE/PRO/ENTERPRISE), tracks `reviewsUsedThisMonth`
- **TeamMember** — User↔Team join (OWNER/ADMIN/MEMBER roles)
- **Repository** — GitHub repos linked to teams
- **Review** — PR analysis results with score, issue counts, status (PENDING→ANALYZING→COMPLETED→FIXING→FIXED)
- **Issue** — Individual findings: ruleId, ruleName, severity (ERROR/WARNING/INFO), file, line, message, suggestion
- **RuleConfig** — Per-team rule enable/disable + severity override
- **CustomRule** — User-defined AI rules with custom prompts
- **SlackInstallation** — Per-team Slack bot tokens
- **GitHubInstallation** — Per-team GitHub access tokens
- **Subscription** — iyzico billing: plan, interval (MONTHLY/YEARLY), amountTL (kuruş), status
- **Payment** — Individual payment records
- **Ticket / TicketMessage** — Support ticket system

### Enums
- `Plan`: FREE, PRO, ENTERPRISE
- `ReviewStatus`: PENDING, ANALYZING, COMPLETED, FIXING, FIXED, FAILED
- `Severity`: ERROR, WARNING, INFO
- `SubscriptionStatus`: ACTIVE, CANCELED, PAST_DUE, TRIALING, INCOMPLETE
- `BillingInterval`: MONTHLY, YEARLY

---

## Pricing Plans

| Plan | Monthly | Yearly (per month) | Reviews | Rules |
|------|---------|-------------------|---------|-------|
| Free | ₺0 | ₺0 | 50/month | 5 SOLID |
| Pro | ₺700 | ₺600 | 500/month | All 9+ |
| Enterprise | ₺2.000 | ₺1.700 | Unlimited | Custom rules engine |

Amounts stored in **kuruş** (TL cents) in `apps/web/lib/iyzico.ts` PLANS object.

---

## Web App Architecture (`apps/web/`)

### Pages (App Router)
- `/` — Landing page (Navbar, Hero, Features, HowItWorks, Pricing, Testimonials, CTA, Footer)
- `/auth/login` + `/auth/register` — Session-aware (redirects to `/dashboard` if logged in)
- `/dashboard` — Main dashboard with stats
- `/dashboard/reviews` — Review list with `ExpandableIssues` component
- `/dashboard/reviews/[id]` — Review detail (all issues grouped by file)
- `/dashboard/rules` — Rule configuration
- `/dashboard/integrations` — GitHub + Slack setup
- `/dashboard/settings` — SettingsClient.tsx (profile, billing, plan management)
- `/dashboard/support` — SupportClient.tsx (ticket system)
- `/admin` — AdminClient.tsx (team management, tickets — requires ADMIN role or `ADMIN_EMAILS` env)
- `/admin/tickets` — Admin ticket management

### API Routes
- `/api/auth/[...nextauth]` — NextAuth handler
- `/api/github/webhook` — GitHub PR webhook receiver
- `/api/slack/events` — Slack event handler
- `/api/billing/route.ts` — Subscription management (checkout, cancel, plan change)
- `/api/billing/callback` — iyzico payment callback
- `/api/billing/invoice/[id]` — PDF-style invoice HTML
- `/api/iyzico/...` — iyzico payment endpoints
- `/api/rules/...` — Rule CRUD
- `/api/tickets/...` — Ticket CRUD
- `/api/admin/teams` + `/api/admin/tickets` — Admin endpoints

### Key Libraries
- `lib/auth.ts` — NextAuth config (GitHub + Credentials providers)
- `lib/api.ts` — API client wrapper for dashboard→API calls
- `lib/iyzico.ts` — **PLANS source of truth**, iyzico V2 HTTP helpers (HMAC-SHA256 auth, no SDK)
- `lib/utils.ts` — `cn()` class merger

---

## iyzico Billing (Important)

**We do NOT use the iyzico SDK** — it crashes on Vercel due to native dependencies. All iyzico integration uses direct HTTP calls with HMAC-SHA256 authentication.

Key file: `apps/web/lib/iyzico.ts`
- `PLANS` object — single source of truth for pricing
- `generateAuthorizationHeader()` — builds V2 auth header
- Helper functions for subscription create/cancel/update

---

## Worker Architecture (`apps/worker/`)

Two BullMQ queues:
1. **`code-review`** — Analyzes PRs
2. **`code-fix`** — Generates fix PRs

### Token Optimization (implemented)
- `preprocessDiff()` — Strips diff headers, deleted lines, context lines, binary/lock files (~60% input reduction)
- Duplicate detection via `headSha` in branch field (`branchName@sha7chars`)
- Analysis uses `gpt-4o-mini` by default (15x cheaper) via `ANALYSIS_MODEL` env var
- Fix generation uses `gpt-4o` by default via `FIX_MODEL` env var
- `max_tokens: 2000` (reduced from 4000)
- Fix worker reuses DB issues instead of re-calling AI

### Key Functions
- `getPRDiff()` — Fetches diff + returns `headSha`
- `preprocessDiff()` — Cleans diff for AI consumption
- `analyzeWithAI()` — Sends cleaned diff to AI, returns structured issues
- `generateFixWithAI()` — Generates code fixes for issues
- `getOctokitForTeam()` — Gets team-specific GitHub token
- `getSlackClientForTeam()` — Gets team-specific Slack token

---

## Analyzer Package (`packages/analyzer/`)

Static analysis engine with rules:
- `complexity.rule.ts` — Function complexity/length
- `srp.rule.ts` — Single Responsibility Principle
- `ocp.rule.ts` — Open/Closed Principle
- `lsp.rule.ts` — Liskov Substitution Principle
- `isp.rule.ts` — Interface Segregation Principle
- `dip.rule.ts` — Dependency Inversion Principle
- `naming.rule.ts` — Naming conventions
- `file-length.rule.ts` — File length limits
- `import-organization.rule.ts` — Import ordering

---

## Brand & Design System

### Colors (Royal Blue + Cyan)
| Token | Hex | Usage |
|-------|-----|-------|
| **brand-500** | `#3b82f6` | Primary buttons, logos, links |
| **brand-600** | `#2563eb` | Hover states |
| **brand-700** | `#1d4ed8` | Active/pressed |
| **accent-500** | `#06b6d4` | Gradient endpoints, secondary highlights |
| **accent-400** | `#22d3ee` | Light accent |
| **surface-900** | `#0f172a` | Dark backgrounds |
| **surface-50** | `#f8fafc` | Light section backgrounds |

### Gradients
- **Primary**: `from-brand-500 to-brand-600` (buttons)
- **Text gradient**: `from-brand-500 via-brand-400 to-accent-400` (headings)
- **Logo/badge**: `from-brand-500 to-accent-500` (blue→cyan)
- **HowItWorks steps**: dark blue → mid blue → cyan progression

### CSS Utilities (`globals.css`)
- `.gradient-text` — Blue→cyan text gradient
- `.glass` — Frosted glass effect with backdrop-blur
- `.glow` / `.glow-lg` — Blue+cyan box shadow glow
- `.gradient-border` — Animated gradient border
- `.dot-pattern` — Subtle blue dot grid background
- `.aurora` — Mesh gradient background effect
- `.code-block` — Dark code display

### Fonts
- **Sans**: Inter (body text)
- **Mono**: JetBrains Mono (code blocks)

### Animations
- `fade-in`, `slide-up`, `float`, `pulse-slow`
- `shimmer` — Sliding highlight effect
- `gradient-flow` — Animated gradient background position

---

## Environment Variables

### Required
```
DATABASE_URL          # PostgreSQL connection string
NEXTAUTH_SECRET       # NextAuth encryption key
NEXTAUTH_URL          # Web app URL (e.g. http://localhost:3000)
REDIS_URL             # Redis for BullMQ
OPENAI_API_KEY        # OpenAI API key
GITHUB_OAUTH_CLIENT_ID     # GitHub OAuth app
GITHUB_OAUTH_CLIENT_SECRET # GitHub OAuth secret
SLACK_BOT_TOKEN       # Slack bot token
SLACK_SIGNING_SECRET  # Slack request verification
SLACK_CLIENT_ID       # Slack OAuth
SLACK_CLIENT_SECRET   # Slack OAuth
IYZICO_API_KEY        # iyzico sandbox/live API key
IYZICO_SECRET_KEY     # iyzico secret key
IYZICO_BASE_URL       # https://sandbox-api.iyzipay.com or https://api.iyzipay.com
API_SECRET            # Shared secret between web↔api
```

### Optional
```
AI_PROVIDER=openai           # "openai" or "claude"
ANALYSIS_MODEL=gpt-4o-mini   # Model for PR analysis (cheap)
FIX_MODEL=gpt-4o             # Model for fix generation (smart)
ANTHROPIC_API_KEY             # If using Claude
ADMIN_EMAILS=mert@example.com # Comma-separated admin email allowlist
```

---

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Web | Vercel | codeguard-ai.vercel.app |
| API | Render | (configured in render.yaml) |
| Worker | Render | (configured in render.yaml) |
| Database | External PostgreSQL | |
| Redis | Upstash or Render Redis | |

---

## Admin Access

Admin pages (`/admin`) are protected by:
1. `UserRole.ADMIN` in database, OR
2. User email in `ADMIN_EMAILS` environment variable (comma-separated list)

---

## Key Patterns & Conventions

1. **All monetary amounts** are stored in **kuruş** (TL cents). Display amounts divide by 100.
2. **Team-scoped data**: Dashboard always operates within the user's current team context.
3. **Session-aware components**: Landing page components check `useSession()` to show "Dashboard" vs "Start Free Trial".
4. **Tailwind design tokens**: Always use `brand-*`, `accent-*`, `surface-*` — avoid hardcoded color classes like `blue-500` or `violet-600`.
5. **iyzico V2 Auth**: Always use `generateAuthorizationHeader()` from `lib/iyzico.ts` — never import the iyzico SDK.
6. **Git commits**: Use conventional commit format (`feat:`, `fix:`, `style:`, `chore:`). Avoid em-dashes in commit messages (zsh quoting issues).
7. **Component structure**: Landing components in `components/landing/`, dashboard in `components/dashboard/`, shared UI in `components/ui/`.
8. **API auth flow**: Web→API calls use `API_SECRET` header for inter-service auth.
