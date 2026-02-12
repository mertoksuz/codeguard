import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";
import { formatPriceTL } from "@/lib/iyzico";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/invoice/[id]
 * Generates a downloadable HTML invoice for a payment.
 * ?format=pdf  → returns HTML with print-friendly styling (user prints/saves as PDF)
 * ?format=html → returns inline HTML preview
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamId = (session.user as any).teamId;
  if (!teamId) {
    return NextResponse.json({ error: "No team" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      team: {
        select: { name: true, slug: true, plan: true },
      },
    },
  });

  if (!payment || payment.teamId !== teamId) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const invoiceNumber = `CG-${payment.createdAt.getFullYear()}${String(payment.createdAt.getMonth() + 1).padStart(2, "0")}-${payment.id.slice(-6).toUpperCase()}`;
  const amountFormatted = formatPriceTL(payment.amount);
  const kdvAmount = formatPriceTL(Math.round(payment.amount * 20 / 120)); // 20% KDV included
  const netAmount = formatPriceTL(Math.round(payment.amount * 100 / 120));
  const dateStr = payment.createdAt.toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const userName = session.user.name || "Customer";
  const userEmail = session.user.email || "";

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fatura ${invoiceNumber} — CodeGuard AI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #f8f9fa; padding: 40px 20px; }
    .invoice { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #2563eb, #06b6d4); color: white; padding: 40px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header-left h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
    .header-left p { opacity: 0.85; font-size: 14px; }
    .header-right { text-align: right; font-size: 14px; }
    .header-right .invoice-num { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .body { padding: 40px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .info-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 8px; font-weight: 600; }
    .info-block p { font-size: 14px; line-height: 1.6; color: #374151; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 600; padding: 12px 16px; border-bottom: 2px solid #e5e7eb; }
    .table td { padding: 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
    .table .amount { text-align: right; font-weight: 600; }
    .totals { margin-left: auto; width: 280px; }
    .totals .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #374151; }
    .totals .row.total { border-top: 2px solid #1a1a2e; padding-top: 12px; margin-top: 4px; font-size: 18px; font-weight: 700; color: #1a1a2e; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-success { background: #dcfce7; color: #166534; }
    .status-failed { background: #fef2f2; color: #991b1b; }
    .status-pending { background: #fef9c3; color: #854d0e; }
    .footer { padding: 24px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
    .footer a { color: #2563eb; text-decoration: none; }
    .no-print { margin: 24px auto; max-width: 800px; display: flex; gap: 12px; justify-content: center; }
    .btn { padding: 10px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: white; color: #374151; border: 1px solid #d1d5db; }
    .btn-secondary:hover { background: #f3f4f6; }
    @media print {
      body { background: white; padding: 0; }
      .invoice { box-shadow: none; border-radius: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn btn-primary" onclick="window.print()">📄 PDF Olarak İndir</button>
    <button class="btn btn-secondary" onclick="window.close()">Kapat</button>
  </div>

  <div class="invoice">
    <div class="header">
      <div class="header-left">
        <h1>🛡️ CodeGuard AI</h1>
        <p>AI-Powered Code Review Platform</p>
      </div>
      <div class="header-right">
        <div class="invoice-num">${invoiceNumber}</div>
        <div>${dateStr}</div>
        <div style="margin-top: 8px;">
          <span class="status-badge ${payment.status === "SUCCESS" ? "status-success" : payment.status === "FAILED" ? "status-failed" : "status-pending"}">
            ${payment.status === "SUCCESS" ? "✓ Ödendi" : payment.status === "FAILED" ? "✗ Başarısız" : "⏳ Beklemede"}
          </span>
        </div>
      </div>
    </div>

    <div class="body">
      <div class="info-grid">
        <div class="info-block">
          <h3>Satıcı / Seller</h3>
          <p>
            <strong>CodeGuard AI</strong><br>
            codeguard.ai<br>
            Istanbul, Turkey
          </p>
        </div>
        <div class="info-block">
          <h3>Müşteri / Customer</h3>
          <p>
            <strong>${userName}</strong><br>
            ${userEmail}<br>
            Team: ${payment.team.name}<br>
            ${payment.cardLastFour ? `Kart: •••• ${payment.cardLastFour}` : ""}
          </p>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Açıklama / Description</th>
            <th>Dönem / Period</th>
            <th class="amount">Tutar / Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${payment.description || "CodeGuard AI Subscription"}</td>
            <td>${dateStr}</td>
            <td class="amount">${amountFormatted}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="row">
          <span>Ara Toplam / Subtotal</span>
          <span>${netAmount}</span>
        </div>
        <div class="row">
          <span>KDV / VAT (20%)</span>
          <span>${kdvAmount}</span>
        </div>
        <div class="row total">
          <span>Toplam / Total</span>
          <span>${amountFormatted}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Bu belge CodeGuard AI tarafından otomatik olarak oluşturulmuştur.</p>
      <p>This document was automatically generated by <a href="https://codeguard-api-one.vercel.app">CodeGuard AI</a>.</p>
      <p style="margin-top: 8px;">iyzico Payment ID: ${payment.iyzicoPaymentId || "N/A"}</p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
