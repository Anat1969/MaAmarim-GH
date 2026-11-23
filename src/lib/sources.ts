import type { Article, SourceId } from './types';

/** The apps the articles were written in. The magazine links back to each of them. */
export const SOURCES: Record<SourceId, { label: string; kind: string; url: string; about: string }> = {
  culture: { label: 'מושגי תרבות', kind: 'מושג', url: 'https://anat1969.github.io/cultura-GH/', about: 'מושג מתרבות אחרת, והחדר שהוא בונה.' },
  mahut: { label: 'מהות', kind: 'מסה', url: 'https://magazin-gh.vercel.app', about: 'מסות אישיות על רוח, עיר ומכונה.' },
  ishy: { label: 'מהמרחב הפנימי', kind: 'מקרה', url: 'https://magazinishy.vercel.app', about: 'מקרה אישי, נקרא בשלוש עדשות.' },
  chok: { label: 'חוקי התנהגות', kind: 'חוק', url: 'https://chok-tarbut.vercel.app', about: 'חוק אחד, והתופעות שהוא מסביר בעולמות רחוקים.' },
  amirot: { label: 'אמירות', kind: 'גילוי', url: 'https://amirot-gh.vercel.app', about: 'גילוי שעלה מהצלבת פתגמים מתרבויות רחוקות.' },
  pras: { label: 'גמד על כתפי ענקים', kind: 'כתבה', url: 'https://prasnovel-gh.vercel.app', about: 'רעיונות של זוכי נובל, פריצקר וטיורינג, והגילוי הבא.' },
  refua: { label: 'רפואה', kind: 'כתבה', url: 'https://refua-gh.vercel.app', about: 'גוף, מחלה ובריאות: מה הגוף מלמד.' },
  olam: { label: 'עולם נעלם', kind: 'כתבה', url: 'https://olam-gh.vercel.app', about: 'גילויים, קשרים ודמויות לאורך הזמן.' },
  maslul: { label: 'מסלול', kind: 'קולקציה', url: 'https://meatsevetofna-gh.vercel.app', about: 'קולקציית אופנה מתוך השראה: תובנה אחת בשלוש חלופות.' },
  tzuna: { label: 'מזון, גוף ונפש', kind: 'כתבה', url: 'https://tzuna-gh.vercel.app', about: 'מזון וצומח בשלוש שכבות: ידוע, נאמר, מאמינים.' },
  zikuk: { label: 'זיקוק DNA', kind: 'סיפור זיקוק', url: 'https://zikuk-dna.vercel.app', about: 'רעיון שזוקק לשישה גנים, והסיפור שלו מתובנה לתובנה.' },
};

/**
 * Sources that are not a table. Two kinds of open file, both written by the app from its own data; the magazine keeps no copy.
 * - `articles`: articles.json (id, title, sub, image, body, url). To add one: its app writes the same file.
 * - `creations`: the creations.json every app publishes by the shared standard (AppOfApp-GH/docs/creations-standard.md).
 *   Each topic there is one A4 article ("כל נושא הוא כתבה"), so an app with creations needs no change to join: one line here.
 *   `page` is the hash of its creations page; `?ar-open=<topic>` before it opens the article.
 */
export const FILE_SOURCES: Partial<Record<SourceId, { url: string; kind: 'articles' | 'creations'; page?: string }>> = {
  amirot: { url: 'https://amirot-gh.vercel.app/articles.json', kind: 'articles' },
  tzuna: { url: 'https://tzuna-gh.vercel.app/articles.json', kind: 'articles' },
  pras: { url: 'https://prasnovel-gh.vercel.app/articles.json', kind: 'articles' },
  refua: { url: 'https://refua-gh.vercel.app/creations.json', kind: 'creations', page: '#v=creations' },
  olam: { url: 'https://olam-gh.vercel.app/creations.json', kind: 'creations', page: '#/creations' },
  // Live from the database (edge function mo-articles), so a new collection arrives with no build and no deploy.
  maslul: { url: 'https://ktqmwpbzcnzkhjskqisy.supabase.co/functions/v1/mo-articles', kind: 'articles' },
};
/** The address of each file article inside its own app, as the file gives it. */
export const fileOrigin = new Map<string, string>();
export const SOURCE_IDS = Object.keys(SOURCES) as SourceId[];
export const RADAR = { label: 'רדאר אקטואליה', url: 'https://radar-aktualya.vercel.app' };

/** The address of this one article inside the app that wrote it. Each app has its own shape of address. */
export function originUrl(article: Pick<Article, 'key' | 'source'>): string {
  const own = fileOrigin.get(article.key);
  if (own) return own;
  const id = encodeURIComponent(article.key.slice(article.key.indexOf(':') + 1));
  const base = SOURCES[article.source].url.replace(/\/$/, '');
  if (article.source === 'culture') return `${base}/#/article/${id}`;
  if (article.source === 'chok') return `${base}/articles?law=${id}`;
  if (article.source === 'amirot') return `${base}/#/article?a=${id}`;
  if (article.source === 'tzuna') return `${base}/#/articles?a=${id}`;
  if (article.source === 'zikuk') return `${base}/articles/${id}`;
  return `${base}/#/a/${id}`;
}
