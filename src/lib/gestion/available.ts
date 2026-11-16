import "server-only";
import { TEXTURES, textureImage } from "../defaults";
import { analyze } from "./compute";
import { loadGestion } from "./store";

export interface AvailableWig {
  id: string;
  label: string;
  price: number;
  /** Own photo, or a texture picture when none was added */
  image: string;
  ownPhoto: boolean;
}

/** Picture for an article without photo: its texture, else a straight wig. */
function fallbackImage(label: string): string {
  const lower = label.toLowerCase();
  const texture = TEXTURES.find((t) => lower.includes(t.toLowerCase()));
  return (texture && textureImage(texture)) || "/media/perruque-lisse.jpg";
}

/** Wigs in stock that can be bought right away: online and with a price. */
export async function availableWigs(): Promise<AvailableWig[]> {
  const data = await loadGestion();
  const a = analyze(data);
  return [...a.itemInfo.values()]
    .filter((i) => i.state === "stock" && i.item.online !== false && (i.item.price ?? 0) > 0)
    .map((i) => ({
      id: i.item.id,
      label: i.item.label,
      price: i.item.price!,
      image: i.item.photos?.[0] ?? fallbackImage(i.item.label),
      ownPhoto: Boolean(i.item.photos?.length),
    }))
    .sort((x, y) => x.price - y.price);
}
