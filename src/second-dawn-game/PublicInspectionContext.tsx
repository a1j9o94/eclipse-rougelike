/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { PublicInspectionRequest } from './publicInspection';
export interface PublicInspectionContextValue { active:PublicInspectionRequest|null; request:(request:PublicInspectionRequest)=>void; dismiss:()=>void }
const PublicInspectionContext=createContext<PublicInspectionContextValue|null>(null);
export function PublicInspectionProvider({children}:{children:ReactNode}){const [active,setActive]=useState<PublicInspectionRequest|null>(null);return <PublicInspectionContext.Provider value={{active,request:setActive,dismiss:()=>setActive(null)}}>{children}</PublicInspectionContext.Provider>;}
export function usePublicInspection(){return useContext(PublicInspectionContext);}
