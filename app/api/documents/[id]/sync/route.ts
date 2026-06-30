import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_SYNC_PAYLOAD } from "@/lib/validations";
import * as Y from "yjs";

type Params = Promise<{ id: string }>;

export async function POST(req: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!member)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (member.role === "VIEWER")
    return NextResponse.json(
      { error: "Forbidden — viewers cannot sync" },
      { status: 403 },
    );

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_SYNC_PAYLOAD) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const buffer = await req.arrayBuffer();
  if (buffer.byteLength === 0)
    return NextResponse.json({ error: "Empty payload" }, { status: 400 });
  if (buffer.byteLength > MAX_SYNC_PAYLOAD) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let update: Uint8Array;
  try {
    update = new Uint8Array(buffer);
    const testDoc = new Y.Doc();
    Y.applyUpdate(testDoc, update);
    testDoc.destroy();
  } catch {
    return NextResponse.json({ error: "Invalid Yjs update" }, { status: 400 });
  }

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc)
    return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const mergedDoc = new Y.Doc();
  if (doc.content) {
    Y.applyUpdate(mergedDoc, new Uint8Array(doc.content));
  }
  Y.applyUpdate(mergedDoc, update);
  const newState = Buffer.from(Y.encodeStateAsUpdate(mergedDoc));
  mergedDoc.destroy();

  await prisma.document.update({
    where: { id },
    data: { content: newState, updatedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}

export async function GET(_: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!member)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc?.content) return new Response(null, { status: 204 });

  return new Response(doc.content, {
    status: 200,
    headers: { "Content-Type": "application/octet-stream" },
  });
}
