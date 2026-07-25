import { X } from 'lucide-react'
import { useState } from 'react'

export default function AddIdeaModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', region: '', days: 3, summary: '', note: '' })

  function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) return
    onCreate(form)
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="idea-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <h2>Add an idea</h2>
            <p>Capture it now; decide whether it fits later.</p>
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
          Short description
          <input value={form.summary} onChange={(event) => update('summary', event.target.value)} placeholder="Why it might earn a place" />
        </label>
        <label>
          Notes
          <textarea value={form.note} onChange={(event) => update('note', event.target.value)} placeholder="Route constraints, walks, food, links…" />
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Add as Maybe</button>
        </div>
      </form>
    </div>
  )
}
