import { lazy, Suspense, useSyncExternalStore } from 'react';
import GameRoot from './GameRoot';

const SecondDawnReview = lazy(() => import('./second-dawn-game/SecondDawnReview'));
const SecondDawnGame = lazy(() => import('./second-dawn-game/SecondDawnGame'));
const SecondDawnPrototype = lazy(
  () => import('./second-dawn/SecondDawnPrototype'),
);
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
  if (route === '#second-dawn-design-archive') {
    return (
      <Suspense fallback={<p role="status">Loading Second Dawn preview…</p>}>
        <SecondDawnPrototype />
      </Suspense>
    );
  }
  if (route === '#legacy') return <GameRoot />;
  return <Suspense fallback={<p role="status">Loading Second Dawn…</p>}><SecondDawnGame /></Suspense>;
}
