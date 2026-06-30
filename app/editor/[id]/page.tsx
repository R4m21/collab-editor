import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import EditorClient from "./EditorClient";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  console.log(session, id);
  return <EditorClient documentId={id} user={session.user} />;
}
