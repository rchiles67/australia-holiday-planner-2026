import { useState } from 'react'
import { ArrowRight, Check, Clock3, Gauge, Plus, Trash2, X } from 'lucide-react'

function choiceCounts(direction) {
  return Object.values(direction.plan || {}).reduce((counts, [status]) => {
    if (status in counts) counts[status] += 1
    return counts
  }, { included: 0, maybe: 0, excluded: 0 })
}

export default function ComparePanel({ directions, activeId, appliedId, onPreview, onApply, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const activeDirection = directions.find((direction) => direction.id === activeId) || directions[0]

  function submit(event) {
    event.preventDefault()
    if (!name.trim()) return
    onAdd(name)
    setName('')
    setAdding(false)
  }

  return (
    <section className="compare-panel">
      <div className="compare-heading">
        <div>
          <h2>Compare directions</h2>
          <p>Each direction keeps its own Include, Maybe, Exclude and day choices; the card order stays shared.</p>
        </div>
        <button type="button" className="add-direction-button" onClick={() => setAdding(true)}><Plus size={15} /> Add direction</button>
      </div>

      {adding && (
        <form className="direction-form" onSubmit={submit}>
          <label><span>New direction name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="For example: Tasmania + Sydney, slower" /></label>
          <div><button type="button" onClick={() => { setAdding(false); setName('') }}><X size={14} /> Cancel</button><button type="submit"><Plus size={14} /> Save current plan</button></div>
          <p>The new direction starts as a copy of the plan now showing, then changes independently.</p>
        </form>
      )}

      <div className="scenario-tabs" role="tablist" aria-label="Trip directions">
        {directions.map((direction) => {
          const counts = choiceCounts(direction)
          return (
            <button
              key={direction.id}
              type="button"
              role="tab"
              aria-selected={activeId === direction.id}
              className={activeId === direction.id ? 'active' : ''}
              onClick={() => onPreview(direction.id)}
            >
              <span>{direction.name}</span>
              <small>{direction.days}d · {counts.included} in{counts.maybe ? ` · ${counts.maybe} maybe` : ''}</small>
              {appliedId === direction.id && <em>Current plan</em>}
            </button>
          )
        })}
      </div>

      {activeDirection && (() => {
        const counts = choiceCounts(activeDirection)
        return (
          <div className="scenario-detail" key={activeDirection.id}>
            <img src={activeDirection.image} alt="" />
            <div className="scenario-copy">
              <span>{appliedId === activeDirection.id ? 'Current direction' : 'Possible direction'}</span>
              <h3>{activeDirection.name}</h3>
              <p>{activeDirection.summary}</p>
              <div className="scenario-stats">
                <span><Clock3 size={16} /><b>{activeDirection.days} days</b></span>
                <span><Gauge size={16} /><b>{activeDirection.pace}</b></span>
              </div>
              <div className="direction-counts" aria-label="Direction idea choices"><span>{counts.included} include</span><span>{counts.maybe} maybe</span><span>{counts.excluded} exclude</span></div>
            </div>
            <ul>
              {activeDirection.pros.map((pro) => <li key={pro}><Check size={15} />{pro}</li>)}
            </ul>
            <div className="scenario-action">
              <div><span>Transit shape</span><strong>{activeDirection.transit}</strong></div>
              <div className="scenario-buttons">
                <button type="button" className="remove-direction" onClick={() => onRemove(activeDirection.id)} disabled={directions.length === 1} title={directions.length === 1 ? 'Keep at least one direction' : 'Remove this direction'}><Trash2 size={15} /> Remove</button>
                <button type="button" onClick={() => onApply(activeDirection)} disabled={appliedId === activeDirection.id}>
                  {appliedId === activeDirection.id ? 'Direction in use' : 'Use this direction'} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </section>
  )
}
