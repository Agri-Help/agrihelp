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
