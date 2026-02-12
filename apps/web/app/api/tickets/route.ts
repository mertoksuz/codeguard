import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";

export const dynamic = "force-dynamic";

// ─── GET /api/tickets — list user's tickets ───
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const tickets = await prisma.ticket.findMany({
    where: { teamId, userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, isAdmin: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({
    tickets: tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      messageCount: t._count.messages,
      lastMessage: t.messages[0] || null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  });
}

// ─── POST /api/tickets — create new ticket ───
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const body = await req.json();
  const { subject, message, priority } = body as {
    subject: string;
    message: string;
    priority?: string;
  };

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject: subject.trim(),
      priority: (["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority || "") ? priority : "NORMAL") as any,
      userId,
      teamId,
      messages: {
        create: {
          body: message.trim(),
          isAdmin: false,
          userId,
        },
      },
    },
    include: { messages: true },
  });

  return NextResponse.json({ ticket }, { status: 201 });
}
