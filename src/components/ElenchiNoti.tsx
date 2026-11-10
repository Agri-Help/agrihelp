import { MARCHE_NOTE, MODELLI_NOTI, idElencoModelli } from "@/lib/categorie";

/** Suggerimenti per i campi Marca e Modello (usati con list="marche-note" / list="modelli-…"). */
export default function ElenchiNoti() {
  return (
    <>
      <datalist id="marche-note">
        {MARCHE_NOTE.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <datalist id="modelli-noti">
        {MARCHE_NOTE.flatMap((m) => MODELLI_NOTI[m].map((x) => <option key={`${m}-${x}`} value={x} label={m} />))}
      </datalist>
      {MARCHE_NOTE.map((m) => (
        <datalist key={m} id={idElencoModelli(m)}>
          {MODELLI_NOTI[m].map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
      ))}
    </>
  );
}
