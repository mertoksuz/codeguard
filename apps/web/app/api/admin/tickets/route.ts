import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";

export const dynamic = "force-dynamic";

async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
  return adminEmails.includes((user.email || "").toLowerCase());
}

// ─── GET /api/admin/tickets — list all tickets ───
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status"); // optional filter

  const tickets = await prisma.ticket.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: [
      { status: "asc" }, // OPEN first
      { updatedAt: "desc" },
    ],
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      team: { select: { id: true, name: true, slug: true, plan: true } },
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
      user: t.user,
      team: t.team,
      messageCount: t._count.messages,
      lastMessage: t.messages[0] || null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  });
}

// ─── PATCH /api/admin/tickets — respond / change status ───
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminUserId = (session.user as any).id;
  if (!(await isAdmin(adminUserId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { ticketId, action, message, status: newStatus } = body as {
    ticketId: string;
    action: "reply" | "status";
    message?: string;
    status?: string;
  };

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  // ─── Reply ───
  if (action === "reply") {
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const [msg] = await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          body: message.trim(),
          isAdmin: true,
          ticketId: ticket.id,
          userId: adminUserId,
        },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "RESPONDED" },
      }),
    ]);

    return NextResponse.json({ success: true, message: msg });
  }

  // ─── Status change ───
  if (action === "status") {
    if (!["OPEN", "AWAITING_REPLY", "RESPONDED", "CLOSED"].includes(newStatus || "")) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: newStatus as any },
    });

    return NextResponse.json({ success: true, ticketId: ticket.id, status: newStatus });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
