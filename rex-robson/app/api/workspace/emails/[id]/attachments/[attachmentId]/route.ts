import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/api/workspace-post-parse";
import { fetchWorkspaceEmailAttachmentMeta } from "@/lib/data/workspace-emails";
import { getWorkspaceWriteClient } from "@/lib/data/workspace-mutations";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { id: emailId, attachmentId } = await context.params;
  if (!isValidUuid(emailId) || !isValidUuid(attachmentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const client = await getWorkspaceWriteClient();
    const meta = await fetchWorkspaceEmailAttachmentMeta(
      client,
      emailId,
      attachmentId,
    );
    if (!meta) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }
    if (!meta.storageBucket || !meta.storagePath) {
      return NextResponse.json(
        {
          error: "No file in storage",
          hint:
            "Ingest must upload the attachment to Supabase Storage and set storage_bucket / storage_path.",
        },
        { status: 404 },
      );
    }

    const { data, error } = await client.storage
      .from(meta.storageBucket)
      .createSignedUrl(meta.storagePath, 120);

    if (error || !data?.signedUrl) {
      const msg = error?.message ?? "Could not create download link";
      if (process.env.NODE_ENV === "development") {
        console.error("[rex-robson] attachment signed URL:", error);
      }
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Download failed";
    if (process.env.NODE_ENV === "development") {
      console.error("[rex-robson] GET attachment:", e);
    }
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
