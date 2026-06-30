import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateDocumentSchema } from "@/lib/validations";

type Params = Promise<{ id: string }>;

async function getDocumentAccess(docId: string, userId: string) {
  return prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: docId, userId } },
    include: { document: true },
  });
}

export async function GET(_: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await getDocumentAccess(id, session.user.id);
  if (!access)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });

  return NextResponse.json({ ...doc, myRole: access.role });
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await getDocumentAccess(id, session.user.id);
  if (!access)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (access.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateDocumentSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );

  const updated = await prisma.document.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await getDocumentAccess(id, session.user.id);
  if (!access || access.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
