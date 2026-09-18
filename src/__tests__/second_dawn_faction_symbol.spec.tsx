import {render} from '@testing-library/react';
import {expect,it} from 'vitest';
import {BASE_FACTIONS} from '../../shared/eclipse/catalog';
import FactionSymbol from '../second-dawn-game/FactionSymbol';
it('gives each civilization a distinct emblem shared by its alien and Terran faces',()=>{
 const paths=new Set<string>();
 for(const alien of BASE_FACTIONS.filter(f=>!f.id.startsWith('terran-'))){
  const human=BASE_FACTIONS.find(f=>f.id.startsWith('terran-')&&f.color===alien.color)!;
  const{container,unmount}=render(<><FactionSymbol faction={alien.id}/><FactionSymbol faction={human.id}/></>);
  const symbols=container.querySelectorAll('svg');
  expect(symbols[0]).toHaveAttribute('aria-label',`${alien.name} emblem`);
  expect(symbols[0].innerHTML).toBe(symbols[1].innerHTML);
  paths.add(symbols[0].innerHTML);unmount();
 }
 expect(paths.size).toBe(6);
});
