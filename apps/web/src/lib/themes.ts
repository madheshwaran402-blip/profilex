export interface ThemePreset {
  name: string;
  background: string;
  card: string;
  accent: string;
  accentHover: string;
  text: string;
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  cyan: {
    name: "Cyan",
    background: "bg-slate-900",
    card: "bg-slate-800",
    accent: "text-cyan-400",
    accentHover: "bg-cyan-500 hover:bg-cyan-400",
    text: "text-white",
  },
  violet: {
    name: "Violet",
    background: "bg-slate-950",
    card: "bg-slate-900",
    accent: "text-violet-400",
    accentHover: "bg-violet-500 hover:bg-violet-400",
    text: "text-white",
  },
  emerald: {
    name: "Emerald",
    background: "bg-neutral-950",
    card: "bg-neutral-900",
    accent: "text-emerald-400",
    accentHover: "bg-emerald-500 hover:bg-emerald-400",
    text: "text-white",
  },
  amber: {
    name: "Amber",
    background: "bg-stone-950",
    card: "bg-stone-900",
    accent: "text-amber-400",
    accentHover: "bg-amber-500 hover:bg-amber-400",
    text: "text-white",
  },
};