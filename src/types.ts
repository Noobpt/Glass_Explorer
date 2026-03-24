export type OpenMode = "newTab" | "newWindow";

export interface FavoriteFolder {
  id: string;
  name: string;
  path: string;
}

export interface GlassSettings {
  blur: number;
  opacity: number;
  refraction: number;
  depth: number;
}
