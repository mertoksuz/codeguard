import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";

export const dynamic = "force-dynamic";

// ─── GET /api/tickets/[id] — get ticket detail with all messages ───
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const teamId = (session.user as any).teamId;

  const ticket = await prisma.ticket.findFirst({
    where: { id: params.id, teamId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  return NextResponse.json({ ticket });
}

// ─── POST /api/tickets/[id] — add a reply to a ticket ───
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const teamId = (session.user as any).teamId;

  const ticket = await prisma.ticket.findFirst({
    where: { id: params.id, teamId, userId },
  });

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  if (ticket.status === "CLOSED") {
    return NextResponse.json({ error: "Cannot reply to a closed ticket" }, { status: 400 });
  }

  const body = await req.json();
  const { message } = body as { message: string };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const [msg] = await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        body: message.trim(),
        isAdmin: false,
        ticketId: ticket.id,
        userId,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "AWAITING_REPLY" },
    }),
  ]);

  return NextResponse.json({ message: msg });
}
