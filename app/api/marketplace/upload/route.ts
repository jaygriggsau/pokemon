import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MAX_BYTES = 1_500_000; // under typical function body limits after compression

export const runtime = "nodejs";
/** Vercel: allow large multipart + Blob uploads without cutting off mid-request. */
export const maxDuration = 60;
/** Session + multipart body must not be statically optimized away. */
export const dynamic = "force-dynamic";

function asBlobPart(v: FormDataEntryValue | null): Blob | null {
  if (v == null || typeof v !== "object") return null;
  const b = v as Blob;
  if (typeof b.size !== "number" || typeof b.arrayBuffer !== "function") return null;
  return b;
}

function uploadFailureMessage(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message;
    if (m.startsWith("Vercel Blob:")) {
      return m.replace(/^Vercel Blob:\s*/, "").trim() || "Blob storage rejected the upload.";
    }
    if (m.length > 0 && m.length < 400) return m;
  }
  return "Upload to blob storage failed.";
}

export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (authErr) {
      console.error("[marketplace/upload] getServerSession", authErr);
      const msg = authErr instanceof Error ? authErr.message : "Session error";
      return NextResponse.json(
        {
          error: "Sign out and sign back in. If this keeps happening, the server auth settings may be wrong.",
          detail: msg,
        },
        { status: 401 }
      );
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!blobToken) {
      return NextResponse.json(
        { error: "Image uploads aren’t enabled on this server." },
        { status: 503 }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (parseErr) {
      console.error("[marketplace/upload] formData", parseErr);
      return NextResponse.json(
        { error: "Upload failed to load. Try smaller images or a better connection." },
        { status: 400 }
      );
    }

    const front = formData.get("front");
    const back = formData.get("back");

    const frontBlob = asBlobPart(front);
    const backBlob = asBlobPart(back);
    if (!frontBlob || !backBlob) {
      return NextResponse.json({ error: "Send both front and back images." }, { status: 400 });
    }

    if (frontBlob.size < 1 || backBlob.size < 1) {
      return NextResponse.json({ error: "Images cannot be empty" }, { status: 400 });
    }

    if (frontBlob.size > MAX_BYTES || backBlob.size > MAX_BYTES) {
      return NextResponse.json({ error: `Each image must be under ${MAX_BYTES / 1_000_000}MB` }, { status: 400 });
    }

    const prefix = `marketplace/${session.user.id}`;
    const stamp = Date.now();

    try {
      const [frontResult, backResult] = await Promise.all([
        put(`${prefix}/${stamp}-front.jpg`, frontBlob, {
          access: "public",
          contentType: "image/jpeg",
          addRandomSuffix: true,
          token: blobToken,
        }),
        put(`${prefix}/${stamp}-back.jpg`, backBlob, {
          access: "public",
          contentType: "image/jpeg",
          addRandomSuffix: true,
          token: blobToken,
        }),
      ]);

      return NextResponse.json({
        photoFrontUrl: frontResult.url,
        photoBackUrl: backResult.url,
      });
    } catch (e) {
      console.error("[marketplace/upload] put", e);
      return NextResponse.json({ error: uploadFailureMessage(e) }, { status: 500 });
    }
  } catch (e) {
    console.error("[marketplace/upload] unhandled", e);
    return NextResponse.json(
      {
        error: uploadFailureMessage(e),
        code: "UPLOAD_UNHANDLED",
      },
      { status: 500 }
    );
  }
}
