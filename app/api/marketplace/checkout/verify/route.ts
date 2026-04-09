import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe isn’t configured on this server." }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId?.trim()) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const cs = await stripe.checkout.sessions.retrieve(sessionId);
  if (cs.metadata?.buyer_id !== session.user.id) {
    return NextResponse.json({ error: "That checkout belongs to another account." }, { status: 403 });
  }

  return NextResponse.json({
    paymentStatus: cs.payment_status,
    listingId: cs.metadata?.listing_id ?? null,
  });
}
