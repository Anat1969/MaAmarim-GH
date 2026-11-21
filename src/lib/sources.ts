import type { SourceId } from './types';

/** The apps the articles were written in. The magazine links back to each of them. */
export const SOURCES: Record<SourceId, { label: string; kind: string; url: string; about: string }> = {
  culture: { label: 'תרבות וגילוי', kind: 'מושג', url: 'https://tarbutgilui-gh.vercel.app', about: 'מושג מתרבות אחרת, והחדר שהוא בונה.' },
  mahut: { label: 'מהות', kind: 'מסה', url: 'https://magazin-gh.vercel.app', about: 'מסות אישיות על רוח, עיר ומכונה.' },
  ishy: { label: 'מהמרחב הפנימי', kind: 'מקרה', url: 'https://magazinishy.vercel.app', about: 'מקרה אישי, נקרא בשלוש עדשות.' },
  chok: { label: 'חוקי התנהגות', kind: 'חוק', url: 'https://chok-tarbut.vercel.app', about: 'חוק אחד, והתופעות שהוא מסביר בעולמות רחוקים.' },
};
export const SOURCE_IDS = Object.keys(SOURCES) as SourceId[];
export const RADAR = { label: 'רדאר אקטואליה', url: 'https://radar-aktualya.vercel.app' };
