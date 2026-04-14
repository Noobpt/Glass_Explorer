export type OpenMode = "newTab" | "newWindow";

export type GhostMode = "off" | "normal" | "invert";

export interface FavoriteFolder {
  id: string;
  name: string;
  path: string;
}

export interface GlassSettings {
  blur: number;
  opacity: number;
  refraction: number;
}
