import Link from "next/link";
import { richiediAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Logo } from "@/components/Scena";

export const dynamic = "force-dynamic";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  await richiediAdmin();
  const { count } = await supabaseAdmin()
    .from("conversazioni")
    .select("id", { count: "exact", head: true })
    .eq("stato", "al_tecnico");
  const voci = [
    { href: "/admin", label: "Casi", badge: count || 0 },
    { href: "/admin/clienti", label: "Clienti" },
    { href: "/admin/manuali", label: "Manuali" },
    { href: "/admin/esperienza", label: "La mia esperienza" },
    { href: "/admin/istruzioni", label: "Istruzioni" },
  ];
  return (
    <div className="mx-auto min-h-dvh max-w-4xl">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-spazio/95 px-4 pt-[max(.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-3 pb-2">
          <Logo size={30} />
          <div className="flex-1 font-semibold">AgriHelp · Pannello tecnico</div>
          <Link href="/chat" className="text-sm text-white/60 underline">Prova la chat</Link>
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto pb-2">
          {voci.map((v) => (
            <Link key={v.href} href={v.href} className="shrink-0 rounded-full bg-white/5 px-4 py-1.5 text-sm hover:bg-white/10">
              {v.label}
              {v.badge ? <span className="ml-2 rounded-full bg-sole px-2 text-xs font-bold text-spazio">{v.badge}</span> : null}
            </Link>
          ))}
        </nav>
      </header>
      <div className="px-4 py-5">{children}</div>
    </div>
  );
}
