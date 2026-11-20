import './mapReturnButton.css';

export default function MapReturnButton({ onClick, label = 'Back to map' }: { onClick: () => void; label?: string }) {
  return <button type="button" className="dg-map-return" onClick={onClick}><span aria-hidden="true">←</span>{label}</button>;
}
