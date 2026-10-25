import type {ReactNode} from 'react';
import './activityPrimitives.css';

/** Reserves space for the current preview and commitment instead of covering choices. */
export default function CommitBar({children,summary,className=''}:{children:ReactNode;summary?:ReactNode;className?:string}){
 return <footer className={`dg-commit-bar ${className}`}>{summary&&<div className="dg-commit-summary">{summary}</div>}<div className="dg-commit-actions">{children}</div></footer>;
}
