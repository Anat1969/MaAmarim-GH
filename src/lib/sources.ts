import type { Article, SourceId } from './types';

/** The apps the articles were written in. The magazine links back to each of them. */
export const SOURCES: Record<SourceId, { label: string; kind: string; url: string; about: string }> = {
  culture: { label: 'מושגי תרבות', kind: 'מושג', url: 'https://anat1969.github.io/cultura-GH/', about: 'מושג מתרבות אחרת, והחדר שהוא בונה.' },
  mahut: { label: 'מהות', kind: 'מסה', url: 'https://magazin-gh.vercel.app', about: 'מסות אישיות על רוח, עיר ומכונה.' },
  ishy: { label: 'מהמרחב הפנימי', kind: 'מקרה', url: 'https://magazinishy.vercel.app', about: 'מקרה אישי, נקרא בשלוש עדשות.' },
  chok: { label: 'חוקי התנהגות', kind: 'חוק', url: 'https://chok-tarbut.vercel.app', about: 'חוק אחד, והתופעות שהוא מסביר בעולמות רחוקים.' },
  amirot: { label: 'אמירות', kind: 'גילוי', url: 'https://amirot-gh.vercel.app', about: 'גילוי שעלה מהצלבת פתגמים מתרבויות רחוקות.' },
  tzuna: { label: 'מזון, גוף ונפש', kind: 'כתבה', url: 'https://tzuna-gh.vercel.app', about: 'מזון וצומח בשלוש שכבות: ידוע, נאמר, מאמינים.' },
};

/**
 * Sources that are not a table: the app publishes its articles as an open file (articles.json), written on every
 * build from its own data. The magazine reads the file and keeps no copy. To add one: its app writes the same file.
 */
export const FILE_SOURCES: Partial<Record<SourceId, string>> = {
  amirot: 'https://amirot-gh.vercel.app/articles.json',
  tzuna: 'https://tzuna-gh.vercel.app/articles.json',
};
export const SOURCE_IDS = Object.keys(SOURCES) as SourceId[];
export const RADAR = { label: 'רדאר אקטואליה', url: 'https://radar-aktualya.vercel.app' };

/** The address of this one article inside the app that wrote it. Each app has its own shape of address. */
export function originUrl(article: Pick<Article, 'key' | 'source'>): string {
  const id = encodeURIComponent(article.key.slice(article.key.indexOf(':') + 1));
  const base = SOURCES[article.source].url.replace(/\/$/, '');
  if (article.source === 'culture') return `${base}/#/article/${id}`;
  if (article.source === 'chok') return `${base}/articles?law=${id}`;
  if (article.source === 'amirot') return `${base}/#/article?a=${id}`;
  if (article.source === 'tzuna') return `${base}/#/articles?a=${id}`;
  return `${base}/#/a/${id}`;
}
