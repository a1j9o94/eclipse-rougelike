import './factoryBadge.css';

/** A loaded Materials population cube, attached to an ordinary interceptor. */
export default function FactoryBadge() {
 return <svg className="dg-factory-badge" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" data-attachment="materials-factory">
  <path className="dg-factory-cube-left" d="M3 7 12 12v10L3 17Z"/>
  <path className="dg-factory-cube-right" d="m12 12 9-5v10l-9 5Z"/>
  <path className="dg-factory-cube-top" d="m3 7 9-5 9 5-9 5Z"/>
  <path className="dg-factory-cube-edge" d="M3 7v10l9 5 9-5V7l-9-5Z M3 7l9 5 9-5 M12 12v10"/>
 </svg>;
}
