import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteMemberSchema } from "@/lib/validations";

type Params = Promise<{ id: string }>;

export async function POST(req: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const caller = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!caller || caller.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only owners can invite members" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );

  const { email, role } = parsed.data;

  const invitee = await prisma.user.findUnique({ where: { email } });
  if (!invitee)
    return NextResponse.json(
      { error: "User not found — they must register first" },
      { status: 404 },
    );

  const existing = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: invitee.id } },
  });
  if (existing)
    return NextResponse.json(
      { error: "User already has access" },
      { status: 409 },
    );

  const member = await prisma.documentMember.create({
    data: { documentId: id, userId: invitee.id, role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(member, { status: 201 });
}

export async function GET(_: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const caller = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!caller)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const members = await prisma.documentMember.findMany({
    where: { documentId: id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json(members);
}
