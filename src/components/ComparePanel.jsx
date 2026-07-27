import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock3, Gauge, Image as ImageIcon, Plus, Trash2, X } from 'lucide-react'

function choiceCounts(direction) {
  return Object.values(direction.plan || {}).reduce((counts, [status]) => {
    if (status in counts) counts[status] += 1
    return counts
  }, { included: 0, maybe: 0, excluded: 0 })
}

export default function ComparePanel({ directions, ideas, activeId, onSelect, onAdd, onRemove, onMove, onCoverChange }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [startMode, setStartMode] = useState('blank')
  const activeDirection = directions.find((direction) => direction.id === activeId) || directions[0]
  const activeIndex = directions.findIndex((direction) => direction.id === activeDirection?.id)
  const coverChoices = useMemo(() => {
    const seen = new Set()
    return (ideas || []).flatMap((idea) => {
      if (idea.status !== 'included') return []
      const images = idea.gallery?.length ? idea.gallery : idea.image ? [{ id: 'cover', src: idea.image, caption: 'Cover image' }] : []
      return images.flatMap((image) => {
        if (!image.src || seen.has(image.src)) return []
        seen.add(image.src)
        return [{ key: `${idea.id}:${image.id || image.src}`, src: image.src, label: `${idea.name} — ${image.caption || 'image'}` }]
      })
    })
  }, [ideas])
  const selectedCoverKey = coverChoices.find((choice) => choice.src === activeDirection?.image)?.key || ''

  function submit(event) {
    event.preventDefault()
    if (!name.trim()) return
    onAdd(name, startMode)
    setName('')
    setStartMode('blank')
    setAdding(false)
  }

  return (
    <section className="compare-panel">
      <div className="compare-heading">
        <div>
          <h2>Compare directions</h2>
          <p>Select a direction to make it the current plan across Compare, Route and Ideas.</p>
        </div>
        <div className="direction-toolbar">
          <button type="button" className="add-direction-button" onClick={() => setAdding(true)}><Plus size={14} /> Add direction</button>
          {activeDirection && <button type="button" className="direction-order-button" onClick={() => onMove(activeDirection.id, -1)} disabled={activeIndex <= 0} title="Move this direction left" aria-label={`Move ${activeDirection.name} left`}><ArrowLeft size={14} /></button>}
          {activeDirection && <button type="button" className="direction-order-button" onClick={() => onMove(activeDirection.id, 1)} disabled={activeIndex >= directions.length - 1} title="Move this direction right" aria-label={`Move ${activeDirection.name} right`}><ArrowRight size={14} /></button>}
          {activeDirection && <button type="button" className="remove-direction" onClick={() => onRemove(activeDirection.id)} disabled={directions.length === 1} title={directions.length === 1 ? 'Keep at least one direction' : 'Remove this direction'}><Trash2 size={13} /> Remove</button>}
        </div>
      </div>

      {adding && (
        <form className="direction-form" onSubmit={submit}>
          <label><span>New direction name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="For example: Tasmania + Sydney, slower" /></label>
          <fieldset>
            <legend>Starting point</legend>
            <label><input type="radio" name="start-mode" value="blank" checked={startMode === 'blank'} onChange={(event) => setStartMode(event.target.value)} /> Blank</label>
            <label><input type="radio" name="start-mode" value="duplicate" checked={startMode === 'duplicate'} onChange={(event) => setStartMode(event.target.value)} /> Duplicate current</label>
          </fieldset>
          <div><button type="button" onClick={() => { setAdding(false); setName('') }}><X size={14} /> Cancel</button><button type="submit"><Plus size={14} /> Add direction</button></div>
          <p>{startMode === 'blank' ? 'Every idea starts Excluded, ready for a fresh route.' : 'Copies the direction currently in use, then changes independently.'}</p>
        </form>
      )}

      <div className="scenario-tabs" role="tablist" aria-label="Trip directions">
        {directions.map((direction) => {
          const counts = choiceCounts(direction)
          return (
            <button key={direction.id} type="button" role="tab" aria-selected={activeId === direction.id} className={activeId === direction.id ? 'active' : ''} onClick={() => onSelect(direction.id)}>
              <span>{direction.name}</span>
              <small>{direction.days}d · {counts.included} in{counts.maybe ? ` · ${counts.maybe} maybe` : ''}</small>
              {activeId === direction.id && <em>Current plan</em>}
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
              <span>Current direction</span>
              <h3>{activeDirection.name}</h3>
              <p>{activeDirection.summary}</p>
              <div className="scenario-stats">
                <span><Clock3 size={16} /><b>{activeDirection.days} days</b></span>
                <span><Gauge size={16} /><b>{activeDirection.pace}</b></span>
              </div>
              <label className="direction-cover-control">
                <span><ImageIcon size={13} /> Cover image</span>
                <select value={selectedCoverKey} disabled={!coverChoices.length} onChange={(event) => {
                  const choice = coverChoices.find((item) => item.key === event.target.value)
                  if (choice) onCoverChange(activeDirection.id, choice.src)
                }}>
                  <option value="">{coverChoices.length ? 'Choose from included ideas' : 'Include an idea to choose its image'}</option>
                  {coverChoices.map((choice) => <option key={choice.key} value={choice.key}>{choice.label}</option>)}
                </select>
              </label>
            </div>
            <section className="direction-summary">
              <span>Summary</span>
              <ul>
                <li><Check size={15} /><strong>{counts.included} include · {counts.maybe} maybe · {counts.excluded} exclude</strong></li>
                <li><Check size={15} />{activeDirection.transit}</li>
                {activeDirection.pros.map((pro) => <li key={pro}><Check size={15} />{pro}</li>)}
              </ul>
            </section>
          </div>
        )
      })()}
    </section>
  )
}
