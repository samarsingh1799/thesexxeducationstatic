import { NextRequest, NextResponse } from "next/server";
import { submitFeedback, FeedbackApiError } from "@/lib/wordpress/feedback";
import { getClientIp } from "@/lib/wordpress/client-ip";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 3000;
const MAX_PAGE_URL_LENGTH = 500;

type FeedbackPayload = {
  rating?: number;
  name?: string;
  email?: string;
  message?: string;
  pageUrl?: string;
  contactable?: boolean;
  /** Honeypot — a real visitor never sees or fills this field. */
  website?: string;
};

export async function POST(request: NextRequest) {
  let payload: FeedbackPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (payload.website) {
    // Bot took the honeypot bait — fake success, no WordPress call, no tell.
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const rating = Number(payload.rating);
  const name = payload.name?.trim();
  const email = payload.email?.trim().toLowerCase();
  const message = payload.message?.trim() ?? "";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Please choose a rating." }, { status: 400 });
  }
  if (!name || name.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Feedback must be under ${MAX_MESSAGE_LENGTH} characters.` }, { status: 400 });
  }

  const clientIp = getClientIp(request);

  try {
    await submitFeedback(
      {
        rating,
        name,
        email,
        message,
        pageUrl: payload.pageUrl?.slice(0, MAX_PAGE_URL_LENGTH),
        contactable: Boolean(payload.contactable),
      },
      clientIp
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof FeedbackApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }
}
