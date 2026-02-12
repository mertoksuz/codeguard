export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SupportClient from "./SupportClient";

export default async function SupportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  return <SupportClient />;
}
