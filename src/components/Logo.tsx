/** Logo piccolo: il simbolo (esagono con trattore, chiave e ingranaggio) su un tondo bianco. */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo/simbolo.png" width={size} height={size} alt="" aria-hidden="true" className="shrink-0 rounded-full ring-1 ring-bordo" />
  );
}

/** Logo completo con le scritte, su una scheda bianca (schermata di accesso). */
export function LogoCompleto({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-3xl border border-bordo bg-white p-5 shadow-sm ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/logo-completo.png" width={544} height={670} alt="Logo: trattore con chiave e ingranaggio" className="mx-auto h-auto w-full max-w-[240px]" />
    </div>
  );
}
