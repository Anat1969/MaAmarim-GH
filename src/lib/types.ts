export type SourceId = 'culture' | 'mahut' | 'ishy';

/** One shape for every source: the view mag_articles. The body stays in `raw`, read only when an article opens. */
export interface Article {
  key: string;
  source: SourceId;
  title: string;
  kicker: string | null;
  lede: string | null;
  quote: string | null;
  image: string | null;
  image2: string | null;
  hint: string | null;
  created_at: string;
  topic_id: string | null;
}

export interface Topic { id: string; label: string; question: string; color: string; position: number }
export interface Issue { id: string; number: number; title: string; question: string; intro: string; status: 'draft' | 'published'; published_at: string | null }
export interface IssueItem { issue_id: string; article_key: string; role: 'lead' | 'support'; position: number; note: string }
export interface Thread { id: string; a_key: string; b_key: string; rule: string; insight: string; action: string; status: 'proposed' | 'approved' | 'rejected' }

export interface World { id: string; title: string; title_he: string | null; insight: string | null; url: string; source: string | null; image_url: string | null; published_at: string | null; topic_id: string }

export interface Data {
  articles: Article[];
  byKey: Map<string, Article>;
  topics: Topic[];
  issues: Issue[];
  items: IssueItem[];
  threads: Thread[];
}
