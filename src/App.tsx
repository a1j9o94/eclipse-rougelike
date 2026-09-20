import { lazy, Suspense } from 'react';

const SecondDawnGame = lazy(() => import('./second-dawn-game/SecondDawnGame'));

export default function App() {
  return <Suspense fallback={<p role="status">Loading Second Dawn…</p>}><SecondDawnGame /></Suspense>;
}
