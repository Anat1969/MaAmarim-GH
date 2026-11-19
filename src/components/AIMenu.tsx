import { useEffect, useRef } from 'react';

export const DEV_SESSION_URL = 'https://claude.ai/code/session_018qeN17gPXWvP6dY3kyg13v';

export interface MenuItem { label: string; hint?: string; pressed?: boolean; disabled?: boolean; onSelect: () => unknown }
interface MenuElement extends HTMLElement { items: MenuItem[]; status: string }

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'ai-menu': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { chat?: string; research?: string };
    }
  }
}

/** The A&I logo button (served by the portfolio). Every editing and development action lives inside it. */
export default function AIMenu({ items, status }: { items: MenuItem[]; status: string }) {
  const ref = useRef<MenuElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => { el.items = items; el.status = status; };
    apply();
    // The script comes from another site and may arrive after the first render.
    customElements.whenDefined('ai-menu').then(apply);
  }, [items, status]);
  return <ai-menu ref={ref} chat={DEV_SESSION_URL} />;
}
