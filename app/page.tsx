import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = { user: null };
  if (session?.user) redirect("/dashboard");
  else redirect("/login");
}
