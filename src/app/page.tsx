import { redirect } from "next/navigation";
import { utenteCorrente } from "@/lib/auth";

export default async function Home() {
  const u = await utenteCorrente();
  if (!u) redirect("/accedi");
  if (!u.profilo || !u.profilo.attivo) redirect("/accedi?errore=non-autorizzato");
  redirect(u.profilo.ruolo === "admin" ? "/admin" : "/chat");
}
