import SpriteRing from './SpriteRing'
import { SPRITE_CATEGORIES } from '../../utils/spriteCalc'

export default function SpriteRings({ scores = {} }) {
  return (
    <div className="sprite-rings-section">
      <h3 className="sprite-rings-label">SPRITE</h3>
      <div className="sprite-rings-row">
        {SPRITE_CATEGORIES.map(cat => (
          <SpriteRing
            key={cat.key}
            label={cat.label}
            shortLabel={cat.key}
            score={scores[cat.key] ?? 0}
            color={cat.color}
          />
        ))}
      </div>

      <style>{`
        .sprite-rings-section {
          margin-bottom: 28px;
        }

        .sprite-rings-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--accent-gold);
          letter-spacing: 3px;
          margin-bottom: 16px;
        }

        .sprite-rings-row {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  )
}
