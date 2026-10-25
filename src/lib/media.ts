// Files live in public/media/. Each video has a poster with the same name (.jpg).
// Captions are in the dictionaries (dict.media[id]).

export interface MediaItem {
  id: string;
  w: number;
  h: number;
}

export const VIDEOS: MediaItem[] = [
  { id: "virgin-18-closure-2x6", w: 540, h: 954 },
  { id: "bordeaux-lisse", w: 540, h: 960 },
  { id: "deep-curly-long", w: 540, h: 960 },
  { id: "bob-ombre", w: 540, h: 960 },
  { id: "double-ton-marron", w: 540, h: 720 },
  { id: "ombre-cuivre", w: 540, h: 720 },
  { id: "perruque-lisse", w: 540, h: 720 },
  { id: "curly-couleurs", w: 540, h: 960 },
  { id: "perruque-cuivre", w: 540, h: 960 },
  { id: "meches-blond-noir", w: 540, h: 960 },
  { id: "bordeaux-mannequin", w: 540, h: 960 },
  { id: "meches-balayage", w: 540, h: 960 },
  { id: "noir-lisse", w: 540, h: 968 },
  { id: "colis-pret", w: 540, h: 720 },
  { id: "commande-emballee", w: 540, h: 720 },
];

export const PHOTOS: MediaItem[] = [
  { id: "meches-bordeaux-curly", w: 1080, h: 1080 },
  { id: "deep-wave-bordeaux", w: 499, h: 610 },
  { id: "perruques-bordeaux-noir", w: 1080, h: 810 },
  { id: "commandes-verifiees", w: 1200, h: 1600 },
  { id: "carton-expedition", w: 607, h: 1080 },
];

export const mediaSrc = (id: string, ext: "mp4" | "jpg") => `/media/${id}.${ext}`;
