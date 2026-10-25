import type {GameCommand} from '../../shared/eclipse/types';

const paths:Partial<Record<GameCommand['type'],string>>={
 explore:'M12 2 21 7v10l-9 5-9-5V7Z M12 7v10M7 12h10',
 influence:'M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M4 20c0-5 16-5 16 0',
 research:'M8 2h8M10 2v7L4 19q-1 3 2 3h12q3 0 2-3L14 9V2M7 16h10',
 upgrade:'M4 20 15 9M14 3a5 5 0 0 0 7 7l-4-1-2-2-1-4Z M3 17l4 4',
 build:'M3 8 12 3l9 5v10l-9 5-9-5Z M3 8l9 5 9-5M12 13v10',
 move:'M3 12h17M14 5l7 7-7 7',
 colonize:'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M12 8v8M8 12h8',
 trade:'M3 7h18M16 2l5 5-5 5M21 17H3M8 12l-5 5 5 5',
 'offer-diplomacy':'M2 8l5-4 5 4 5-4 5 4-10 12Z',
};
export default function ActionIcon({kind}:{kind:GameCommand['type']}) {
 return <svg className="dg-action-icon" viewBox="0 0 24 26" aria-hidden="true" focusable="false"><path d={paths[kind]??'M5 12l5 5L20 5'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
