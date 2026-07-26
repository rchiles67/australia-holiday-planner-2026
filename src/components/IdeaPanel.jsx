import { useEffect, useMemo, useState } from 'react'
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowRight, Check, ChevronDown, CircleHelp, GripVertical, Minus, Pencil, Plus, Trash2, X } from 'lucide-react'
import { statusLabels } from '../data.js'
import DirectionStrip from './DirectionStrip.jsx'
import { scheduleLabel } from '../schedule.js'

const statusIcons = { included: Check, maybe: CircleHelp, excluded: X }

function StatusButton({ value, active, onClick }) {
  const Icon = statusIcons[value]
  return (
    <button type="button" className={`status-button status-${value} ${active ? 'active' : ''}`} onClick={onClick} aria-pressed={active}>
      <Icon size={14} strokeWidth={1.8} />{statusLabels[value]}
    </button>
  )
}

function SortableIdea({ idea, selected, scheduleEntry, onSelect, onStatus, onDays, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: idea.id })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 4 : undefined }
  return (
    <article ref={setNodeRef} style={style} className={`idea-row ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}>
      <button type="button" className="drag-hint" aria-label={`Reorder ${idea.name}`} {...attributes} {...listeners}>
        <GripVertical size={16} />
      </button>
      <div className="idea-main">
        {idea.image && <img src={idea.image} alt="" />}
        {!idea.image && <span className={`idea-swatch ${idea.color}`} />}
        <span className="idea-copy"><span className="idea-region">{idea.region}</span><strong>{idea.name}</strong><small>{idea.summary}</small><time>{scheduleLabel(scheduleEntry)}</time></span>
        <button className="detail-cta" type="button" onClick={() => onSelect(idea.id)} aria-label={`View details for ${idea.name}`}>Detail <ArrowRight size={11} /></button>
      </div>
      <div className="status-row">
        {Object.keys(statusLabels).map((status) => <StatusButton key={status} value={status} active={idea.status === status} onClick={() => onStatus(idea.id, status)} />)}
      </div>
      <div className="idea-tools-row">
        <div className="days-control">
          <span>Days</span>
          <button type="button" onClick={() => onDays(idea.id, -1)} aria-label={`Remove a day from ${idea.name}`}><Minus size={13} /></button>
          <output>{idea.days}</output>
          <button type="button" onClick={() => onDays(idea.id, 1)} aria-label={`Add a day to ${idea.name}`}><Plus size={13} /></button>
        </div>
        <div className="idea-card-actions">
          <button type="button" onClick={() => onEdit(idea.id)}><Pencil size={12} /> Edit</button>
          <button type="button" className="danger" onClick={() => onDelete(idea.id)}><Trash2 size={12} /> Delete</button>
        </div>
      </div>
    </article>
  )
}

export default function IdeaPanel({ ideas, selectedId, scheduleById, onSelect, onStatus, onDays, onAdd, onReorder, onEdit, onDelete, directions, editingDirection, onDirectionChange, onDirectionDaysChange }) {
  const areas = useMemo(() => Array.from(new Set(ideas.map((idea) => idea.area || idea.region || 'Other ideas'))), [ideas])
  const [openArea, setOpenArea] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }))

  useEffect(() => {
    setOpenArea((current) => current && areas.includes(current) ? current : null)
  }, [areas])

  function toggleArea(area) {
    setOpenArea((current) => current === area ? null : area)
  }

  function dragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const target = ideas.find((idea) => idea.id === over.id)
    if (target) onReorder(active.id, over.id, target.area || target.region || 'Other ideas')
  }

  return (
    <aside className="idea-panel">
      <DirectionStrip direction={editingDirection} directions={directions} editable onChange={onDirectionChange} onDaysChange={onDirectionDaysChange} />
      <div className="panel-heading"><div><h2>Ideas</h2><p>Open an area, then keep, park or rule out each piece.</p></div><span className="idea-count">{ideas.length}</span></div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <div className="area-groups">
          {areas.map((area) => {
            const areaIdeas = ideas.filter((idea) => (idea.area || idea.region || 'Other ideas') === area)
            const planned = areaIdeas.filter((idea) => idea.status !== 'excluded')
            const excluded = areaIdeas.filter((idea) => idea.status === 'excluded')
            const open = openArea === area
            return (
              <section className={`area-group ${open ? 'open' : ''}`} key={area}>
                <button type="button" className="area-heading" onClick={() => toggleArea(area)} aria-expanded={open}>
                  <span><ChevronDown size={15} /><strong>{area}</strong></span>
                  <span>{planned.length} planned{excluded.length ? ` · ${excluded.length} excluded` : ''}</span>
                </button>
                {open && (
                  <div className="area-content">
                    <SortableContext items={areaIdeas.map((idea) => idea.id)} strategy={verticalListSortingStrategy}>
                      <div className="idea-list">
                        {planned.map((idea) => <SortableIdea key={idea.id} idea={idea} scheduleEntry={scheduleById?.get(idea.id)} selected={selectedId === idea.id} onSelect={onSelect} onStatus={onStatus} onDays={onDays} onEdit={onEdit} onDelete={onDelete} />)}
                        {excluded.length > 0 && <div className="area-excluded-label"><span>Excluded</span><b>{excluded.length}</b></div>}
                        {excluded.map((idea) => <SortableIdea key={idea.id} idea={idea} scheduleEntry={scheduleById?.get(idea.id)} selected={selectedId === idea.id} onSelect={onSelect} onStatus={onStatus} onDays={onDays} onEdit={onEdit} onDelete={onDelete} />)}
                      </div>
                    </SortableContext>
                    <button className="add-idea-button compact" type="button" onClick={() => onAdd(area)}><Plus size={14} />Add to {area}</button>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </DndContext>
    </aside>
  )
}
