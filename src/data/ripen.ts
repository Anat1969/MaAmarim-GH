import type { SourceId } from '../lib/types';

/**
 * How a question that is not ripe gets completed (Anat, 2026-11-22: "תיתן לי את הפתרון... איזה אפליקציה לבנות, איזה מאמר
 * לכתוב"). Three levers, cheapest first: give a topic to an article that is already in the collection, write one article
 * in an app that already writes, build an app. Everything here is a PROPOSAL by Claude for the editor, never a fact.
 */

/** An article worth writing in an existing app, for a question. `key` of the topic or of a new question. */
export const WRITE_IDEAS: Record<string, { app: SourceId; title: string; why: string }[]> = {
  machine: [
    { app: 'chok', title: 'חוק הסחף: מה המסך עושה לקשב', why: 'החוק כבר קיים באפליקציה, ועוד לא נכתבה עליו כתבה.' },
    { app: 'culture', title: 'טכנה: המילה היוונית לאומנות שהיא גם ידע', why: 'מושג מתרבות אחרת על היחס בין יד לכלי.' },
    { app: 'amirot', title: 'מה הפתגמים אומרים על כלי ועל מי שמחזיק בו', why: 'מחלוקת חדשה באטלס: הכלי משרת, או הכלי מעצב.' },
  ],
  city: [
    { app: 'chok', title: 'הגדר של צ\'סטרטון: מה הורסים כשמפנים שכונה', why: 'החוק כבר קיים, עם דוגמה עירונית, ועוד בלי כתבה.' },
    { app: 'culture', title: 'פיאצה: החדר שאין לו תקרה', why: 'מושג מתרבות אחרת שהוא כבר מרחב עירוני.' },
    { app: 'ishy', title: 'מקרה מהעבודה, בעדשה של העיר', why: 'מקרה אישי של אדריכלית עיר, נקרא בשלוש עדשות.' },
  ],
  nature: [
    { app: 'chok', title: 'חוק קלייבר: למה גוף גדול חי לאט', why: 'החוק כבר קיים, מקשר בין בעל חיים לעיר, ועוד בלי כתבה.' },
    { app: 'mahut', title: 'מה העץ יודע על צל', why: 'מסה אישית על טבע ותכנון.' },
  ],
  body: [
    { app: 'chok', title: 'חוק חולד העיוור: חסינות שבאה מצפיפות', why: 'החוק כבר קיים, ועוסק בגוף ובקהילה.' },
    { app: 'culture', title: 'איקיגאי: סיבה לקום בבוקר', why: 'מושג שמחבר בריאות ומשמעות.' },
    { app: 'mahut', title: 'הגוף זוכר לפני הראש', why: 'מסה אישית על גוף וידיעה.' },
  ],
  knowledge: [
    { app: 'chok', title: 'חוק ההוראה: מה נזכר ממה שלימדו אותנו', why: 'החוק כבר קיים, ועוד בלי כתבה.' },
    { app: 'culture', title: 'שושלת: איך אומנות עוברת ממורה לתלמיד', why: 'מושג מתרבות אחרת על מסירה.' },
    { app: 'mahut', title: 'מה קיבלתי ממורה אחד', why: 'מסה אישית על ירושה של רעיון.' },
  ],
};

/** An app worth building when the collection has nobody to write on the question. */
export const BUILD_IDEAS: Record<string, { name: string; what: string }> = {
  machine: { name: 'יומן בינה', what: 'אפליקציה שמתעדת כל כלי שנבנה עם בינה: מה ביקשתי, מה יצא, ומה למדתי. כל רשומה היא כתבה קצרה.' },
  city: { name: 'מקרי עיר', what: 'אפליקציה של מקרים מהתכנון העירוני: בעיה, החלטה, ומה קרה ברחוב. כל מקרה הוא כתבה.' },
  nature: { name: 'מה הטבע כבר פתר', what: 'אפליקציה של פתרונות מהטבע לבעיות של עיר: צל, מים, רוח, צפיפות. כל פתרון הוא כתבה.' },
  body: { name: 'גוף בעיר', what: 'אפליקציה על מה שהעיר עושה לגוף: הליכה, רעש, אור, חום. כל נושא הוא כתבה עם מקור.' },
  knowledge: { name: 'מורים ותלמידים', what: 'אפליקציה שעוקבת אחרי רעיון אחד לאורך שלושה דורות, בכל תחום. כל שרשרת היא כתבה.' },
};

/**
 * The questions after the first seven. Each one names articles that are already in the collection and would answer it;
 * opening it makes it a topic and moves those articles to it (on the desk, one button).
 */
export const NEW_QUESTIONS: { id: string; label: string; question: string; color: string; why: string; keys: string[] }[] = [
  {
    id: 'body', label: 'גוף ובריאות', question: 'מה הגוף יודע לפני שאנחנו יודעים?', color: '#8A5A44',
    why: 'שלוש אפליקציות כבר כותבות על הגוף, כל אחת מזווית אחרת: רפואה, מזון, והגילוי הבא.',
    keys: ['refua:harvey', 'refua:vesalius', 'refua:pressure', 'refua:immune', 'tzuna:plant-body', 'tzuna:combo', 'pras:next-medicine'],
  },
  {
    id: 'knowledge', label: 'ידע ודורות', question: 'איך רעיון עובר מדור לדור?', color: '#4F6D7A',
    why: 'חוטי האבולוציה, המהפכה המדעית והמסירה בעל פה שואלים את אותה שאלה בלי לדעת זה על זה.',
    keys: ['amirot:oral', 'olam:revolution', 'olam:kepler-newton', 'olam:paradigm', 'tzuna:how-we-know', 'refua:layers', 'pras:turing-theory'],
  },
];
