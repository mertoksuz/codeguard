import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@codeguard/db";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 48);
}

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development" || !!process.env.NEXTAUTH_DEBUG,
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_OAUTH_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    newUser: "/dashboard",
  },
  callbacks: {
    async signIn() {
      // Allow all sign-ins — team creation happens in jwt callback
      // where the user is guaranteed to be persisted in the DB
      return true;
    },

    async jwt({ token, user, account, profile }) {
      if (user) {
        token.userId = user.id;
      }
      if (account?.access_token) {
        token.githubAccessToken = account.access_token;
      }

      // On first sign-in (user + account present), create team if needed
      // At this point the PrismaAdapter has already persisted the User
      if (user && account && account.provider === "github") {
        const githubLogin = (profile as any)?.login || user.name || "user";

        let membership = await prisma.teamMember.findFirst({
          where: { userId: user.id },
        });

        if (!membership) {
          const teamName = (profile as any)?.login
            ? `${(profile as any).login}'s Team`
            : `${user.name || "My"}'s Team`;

          const baseSlug = generateSlug((profile as any)?.login || user.name || "team");
          let slug = baseSlug;
          let counter = 0;
          while (await prisma.team.findUnique({ where: { slug } })) {
            counter++;
            slug = `${baseSlug}-${counter}`;
          }

          const team = await prisma.team.create({
            data: {
              name: teamName,
              slug,
              plan: "FREE",
              members: {
                create: {
                  userId: user.id,
                  role: "OWNER",
                },
              },
            },
          });

          membership = await prisma.teamMember.findFirst({
            where: { userId: user.id, teamId: team.id },
          });
        }

        // Save/update the GitHub token in GitHubInstallation for this team
        if (membership && account.access_token) {
          await prisma.gitHubInstallation.upsert({
            where: { teamId: membership.teamId },
            create: {
              teamId: membership.teamId,
              accountLogin: githubLogin,
              accountType: (profile as any)?.type === "Organization" ? "Organization" : "User",
              accessToken: account.access_token,
              scope: account.scope || null,
            },
            update: {
              accessToken: account.access_token,
              accountLogin: githubLogin,
              scope: account.scope || null,
              updatedAt: new Date(),
            },
          });
        }

        // Attach team info to token immediately
        if (membership) {
          const team = await prisma.team.findUnique({ where: { id: membership.teamId } });
          if (team) {
            token.teamId = membership.teamId;
            token.teamSlug = team.slug;
            token.teamPlan = team.plan;
            token.teamRole = membership.role;
          }
        }
      }

      // For subsequent requests (not initial sign-in), always refresh team data from DB
      // This ensures plan changes (e.g. after billing callback) are reflected immediately
      if (token.userId && !(user && account)) {
        const membership = await prisma.teamMember.findFirst({
          where: { userId: token.userId as string },
          include: { team: true },
        });
        if (membership) {
          token.teamId = membership.teamId;
          token.teamSlug = membership.team.slug;
          token.teamPlan = membership.team.plan;
          token.teamRole = membership.role;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).teamId = token.teamId;
        (session.user as any).teamSlug = token.teamSlug;
        (session.user as any).teamPlan = token.teamPlan;
        (session.user as any).teamRole = token.teamRole;
      }
      return session;
    },
  },
};
