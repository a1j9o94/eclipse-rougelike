import { lazy, Suspense, useSyncExternalStore } from 'react';

const SecondDawnReview = lazy(() => import('./second-dawn-game/SecondDawnReview'));
const SecondDawnGame = lazy(() => import('./second-dawn-game/SecondDawnGame'));
function subscribeToRoute(notify: () => void) {
  window.addEventListener('hashchange', notify);
  return () => window.removeEventListener('hashchange', notify);
}

export default function App() {
  const route = useSyncExternalStore(
    subscribeToRoute,
    () => window.location.hash,
    () => '',
  );
  if (route === '#second-dawn-review' || route === '#second-dawn-preview') return <Suspense fallback={<p role="status">Loading engine review…</p>}><SecondDawnReview /></Suspense>;
  return <Suspense fallback={<p role="status">Loading Second Dawn…</p>}><SecondDawnGame /></Suspense>;
}
