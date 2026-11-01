/** Riduce una foto del telefono a max 1600px e la converte in JPEG base64. */
export async function riduciFoto(file: File, lato = 1600, qualita = 0.8): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = ko;
      i.src = url;
    });
    const scala = Math.min(1, lato / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scala);
    c.height = Math.round(img.height * scala);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", qualita);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Estrae alcuni fotogrammi da un video (es. girato con gli occhiali smart)
 * e li restituisce come JPEG base64, distribuiti lungo tutta la durata.
 */
export async function fotogrammiDaVideo(file: File, quanti = 4, lato = 1280, qualita = 0.8): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  const aspetta = (evento: string, ms = 15000) =>
    new Promise<void>((ok, ko) => {
      const t = setTimeout(() => ko(new Error("tempo scaduto")), ms);
      v.addEventListener(evento, () => { clearTimeout(t); ok(); }, { once: true });
      v.addEventListener("error", () => { clearTimeout(t); ko(new Error("video non leggibile")); }, { once: true });
    });
  try {
    await aspetta("loadeddata");
    const durata = isFinite(v.duration) && v.duration > 0 ? v.duration : 1;
    const n = Math.max(1, quanti);
    const scala = Math.min(1, lato / Math.max(v.videoWidth || lato, v.videoHeight || lato));
    const c = document.createElement("canvas");
    c.width = Math.round((v.videoWidth || lato) * scala);
    c.height = Math.round((v.videoHeight || lato) * scala);
    const ctx = c.getContext("2d")!;
    const risultati: string[] = [];
    for (let i = 0; i < n; i++) {
      // punti a metà di ogni tratto: evita il primo fotogramma (spesso nero) e l'ultimo
      const tempo = Math.min(durata - 0.05, (durata * (i + 0.5)) / n);
      if (Math.abs(v.currentTime - tempo) > 0.01) {
        const s = aspetta("seeked");
        v.currentTime = Math.max(0, tempo);
        await s;
      }
      ctx.drawImage(v, 0, 0, c.width, c.height);
      risultati.push(c.toDataURL("image/jpeg", qualita));
    }
    return risultati;
  } finally {
    v.removeAttribute("src");
    v.load();
    URL.revokeObjectURL(url);
  }
}
