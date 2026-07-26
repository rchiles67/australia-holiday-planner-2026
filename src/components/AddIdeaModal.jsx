import { X } from 'lucide-react'
import { useState } from 'react'

export default function AddIdeaModal({ idea, areas = [], initialArea = '', onClose, onSave }) {
  const editing = Boolean(idea)
  const [form, setForm] = useState({
    name: idea?.name || '',
    region: idea?.region || '',
    area: idea?.area || initialArea || areas[0] || 'Other ideas',
    days: idea?.days || 3,
    summary: idea?.summary || '',
    note: idea?.note || '',
  })

  function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="idea-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <h2>{editing ? 'Edit idea' : 'Add an idea'}</h2>
            <p>{editing ? 'Correct the card’s name, region and planning notes.' : 'Capture it now; decide whether it fits later.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <label>
          Place or route
          <input autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Bruny Island" required />
        </label>
        <div className="form-row">
          <label>
            Region
            <input value={form.region} onChange={(event) => update('region', event.target.value)} placeholder="e.g. Tasmania" />
          </label>
          <label>
            Days
            <input type="number" min="1" max="14" value={form.days} onChange={(event) => update('days', Number(event.target.value))} />
          </label>
        </div>
        <label>
          Idea group
          <input list="idea-area-options" value={form.area} onChange={(event) => update('area', event.target.value)} placeholder="e.g. East Tasmania" required />
          <datalist id="idea-area-options">{areas.map((area) => <option key={area} value={area} />)}</datalist>
          <small>Change this to move the card to another expandable area.</small>
        </label>
        <label>
          Short description
          <input value={form.summary} onChange={(event) => update('summary', event.target.value)} placeholder="Why it might earn a place" />
        </label>
        <label>
          Notes
          <textarea value={form.note} onChange={(event) => update('note', event.target.value)} placeholder="Route constraints, walks, food, links…" />
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">{editing ? 'Save changes' : 'Add as Maybe'}</button>
        </div>
      </form>
    </div>
  )
}
