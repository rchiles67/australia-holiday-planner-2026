import { Compass } from 'lucide-react'

export default function DirectionStrip({ direction, directions = [], editable = false, onChange, onDaysChange }) {
  return (
    <div className="direction-strip">
      <span><Compass size={13} /> Direction</span>
      {editable ? (
        <select value={direction?.id || ''} onChange={(event) => onChange(event.target.value)} aria-label="Direction to edit">
          {directions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      ) : <strong>{direction?.name || 'Custom current plan'}</strong>}
      {editable && direction && <label className="direction-duration"><input type="number" min="1" max="60" value={direction.days} onChange={(event) => onDaysChange(Number(event.target.value))} aria-label="Direction length in days" /><span>days</span></label>}
      {editable && <small>Edits below belong to this direction</small>}
    </div>
  )
}
