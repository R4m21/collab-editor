import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string; versionId: string }>;

export async function GET(_: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, versionId } = await params;

  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!member)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const version = await prisma.version.findFirst({
    where: { id: versionId, documentId: id },
  });
  if (!version)
    return NextResponse.json({ error: "Version not found" }, { status: 404 });

  return new Response(version.snapshot, {
    headers: { "Content-Type": "application/octet-stream" },
  });
}

export async function POST(_: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, versionId } = await params;

  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!member || member.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const version = await prisma.version.findFirst({
    where: { id: versionId, documentId: id },
  });
  if (!version)
    return NextResponse.json({ error: "Version not found" }, { status: 404 });

  await prisma.document.update({
    where: { id },
    data: { content: version.snapshot, updatedAt: new Date() },
  });

  return NextResponse.json({
    success: true,
    message: "Document restored to this version",
  });
}
