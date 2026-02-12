export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";
import { redirect } from "next/navigation";
import AdminTicketsClient from "./AdminTicketsClient";

export default async function AdminTicketsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
  const isAdmin = user?.role === "ADMIN" || adminEmails.includes((user?.email || "").toLowerCase());

  if (!isAdmin) redirect("/dashboard");

  return <AdminTicketsClient />;
}
