import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      teamId?: string;
      teamSlug?: string;
      teamPlan?: string;
      teamRole?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    teamId?: string;
    teamSlug?: string;
    teamPlan?: string;
    teamRole?: string;
    githubAccessToken?: string;
  }
}
