import { lazy, Suspense } from 'react';
import {useSoundscape} from './second-dawn-game/sound/useSoundscape';

const SecondDawnGame = lazy(() => import('./second-dawn-game/SecondDawnGame'));

export default function App() {
  useSoundscape();
  return <Suspense fallback={<p role="status">Loading Second Dawn…</p>}><SecondDawnGame /></Suspense>;
}
