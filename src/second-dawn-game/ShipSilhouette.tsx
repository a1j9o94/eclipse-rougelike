import type { BlueprintShipType } from '../../shared/eclipse/blueprints';
const HULLS: Record<BlueprintShipType, string> = {
  interceptor: 'M160 17 181 91 230 147 224 160 182 142 174 178 146 178 138 142 96 160 90 147 139 91Z',
  cruiser: 'M160 12 182 53 186 87 207 76 222 102 237 171 204 167 188 137 179 187 141 187 132 137 116 167 83 171 98 102 113 76 134 87 138 53Z',
  dreadnought: 'M160 9 185 51 190 76 215 53 235 79 254 178 221 184 207 149 197 184 179 191 141 191 123 184 113 149 99 184 66 178 85 79 105 53 130 76 135 51Z',
  starbase: 'M147 18 173 18 181 65 212 48 231 67 210 100 254 109 254 135 210 144 231 177 212 196 181 179 173 222 147 222 139 179 108 196 89 177 110 144 66 135 66 109 110 100 89 67 108 48 139 65Z',
};
/** Original vector silhouettes: decorative ship identity, not a physical slot map. */
export default function ShipSilhouette({ type }: { type: BlueprintShipType }) {
  const name = type[0].toUpperCase() + type.slice(1);
  return <svg className="dg-ship-silhouette" role="img" aria-label={`${name} blueprint silhouette`} viewBox="40 0 240 240">
    <circle cx="160" cy="120" r="105" className="dg-ship-radar" />
    <circle cx="160" cy="120" r="76" className="dg-ship-radar" />
    <path d="M40 120H280M160 0V240" className="dg-ship-axis" />
    <path d={HULLS[type]} className="dg-ship-hull" />
    <path d="M160 48 170 88 160 104 150 88Z" className="dg-ship-cockpit" />
    <path d="M147 161H173M147 168H173M147 175H173" className="dg-ship-engine" />
  </svg>;
}
