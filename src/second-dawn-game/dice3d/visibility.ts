import {createContext} from 'react';

/** Hidden decision workspaces retain drafts, but must not continue dice presentation. */
export const DicePresentationVisibilityContext=createContext(true);
