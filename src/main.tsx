import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Chrome autofill offers text typed in one field inside another: off for every field, also ones added later.
const quiet = (root: ParentNode) => root.querySelectorAll('input,textarea').forEach((el) => el.setAttribute('autocomplete', 'off'));
new MutationObserver(() => quiet(document)).observe(document.documentElement, { childList: true, subtree: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
