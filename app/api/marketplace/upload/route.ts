import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MAX_BYTES = 1_500_000; // under typical function body limits after compression

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not set — add a Vercel Blob store and env var." },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const front = formData.get("front");
  const back = formData.get("back");

  if (!(front instanceof Blob) || !(back instanceof Blob)) {
    return NextResponse.json({ error: "Missing front or back image (use field names front and back)" }, { status: 400 });
  }

  if (front.size < 1 || back.size < 1) {
    return NextResponse.json({ error: "Images cannot be empty" }, { status: 400 });
  }

  if (front.size > MAX_BYTES || back.size > MAX_BYTES) {
    return NextResponse.json({ error: `Each image must be under ${MAX_BYTES / 1_000_000}MB` }, { status: 400 });
  }

  const prefix = `marketplace/${session.user.id}`;
  const stamp = Date.now();

  try {
    const [frontResult, backResult] = await Promise.all([
      put(`${prefix}/${stamp}-front.jpg`, front, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: true,
      }),
      put(`${prefix}/${stamp}-back.jpg`, back, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: true,
      }),
    ]);

    return NextResponse.json({
      photoFrontUrl: frontResult.url,
      photoBackUrl: backResult.url,
    });
  } catch (e) {
    console.error("[marketplace/upload]", e);
    return NextResponse.json({ error: "Upload to blob storage failed" }, { status: 500 });
  }
}
