import type { ReactNode } from 'react';
import {
  boardWorkspaceMode,
  type BoardWorkspaceKind,
  type BoardWorkspaceState,
} from './boardWorkspaceMode';
interface BoardWorkspaceProps extends BoardWorkspaceState {
  workspaces: Record<BoardWorkspaceKind, () => ReactNode>;
}
/** Invoke only the selected workspace; planners retain their original tree, keys and lifecycle. */
export default function BoardWorkspace({ workspaces, ...state }: BoardWorkspaceProps) {
  return workspaces[boardWorkspaceMode(state)]();
}
