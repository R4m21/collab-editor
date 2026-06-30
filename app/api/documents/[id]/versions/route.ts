import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVersionSchema } from "@/lib/validations";

type Params = Promise<{ id: string }>;

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

  const versions = await prisma.version.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdBy: true, createdAt: true },
  });

  return NextResponse.json(versions);
}

export async function POST(req: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!member || member.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createVersionSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc?.content)
    return NextResponse.json(
      { error: "No document content to snapshot" },
      { status: 400 },
    );

  const version = await prisma.version.create({
    data: {
      documentId: id,
      snapshot: doc.content,
      label: parsed.data.label,
      createdBy: session.user.name ?? session.user.email ?? "Unknown",
    },
  });

  return NextResponse.json({
    id: version.id,
    label: version.label,
    createdAt: version.createdAt,
  });
}
