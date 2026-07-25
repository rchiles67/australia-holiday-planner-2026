import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, CircleHelp, GripVertical, Minus, Plus, X } from 'lucide-react'
import { statusLabels } from '../data.js'

const statusIcons = { included: Check, maybe: CircleHelp, excluded: X }

function StatusButton({ value, active, onClick }) {
  const Icon = statusIcons[value]
  return (
    <button type="button" className={`status-button status-${value} ${active ? 'active' : ''}`} onClick={onClick} aria-pressed={active}>
      <Icon size={14} strokeWidth={1.8} />{statusLabels[value]}
    </button>
  )
}

function SortableIdea({ idea, selected, onSelect, onStatus, onDays }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: idea.id })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 4 : undefined }
  return (
    <article ref={setNodeRef} style={style} className={`idea-row ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}>
      <button type="button" className="drag-hint" aria-label={`Reorder ${idea.name}`} {...attributes} {...listeners}>
        <GripVertical size={16} />
      </button>
      <button className="idea-main" type="button" onClick={() => onSelect(idea.id)}>
        {idea.image && <img src={idea.image} alt="" />}
        {!idea.image && <span className={`idea-swatch ${idea.color}`} />}
        <span><span className="idea-region">{idea.region}</span><strong>{idea.name}</strong><small>{idea.summary}</small></span>
      </button>
      <div className="status-row">
        {Object.keys(statusLabels).map((status) => <StatusButton key={status} value={status} active={idea.status === status} onClick={() => onStatus(idea.id, status)} />)}
      </div>
      <div className="days-control">
        <span>Days</span>
        <button type="button" onClick={() => onDays(idea.id, -1)} aria-label={`Remove a day from ${idea.name}`}><Minus size={13} /></button>
        <output>{idea.days}</output>
        <button type="button" onClick={() => onDays(idea.id, 1)} aria-label={`Add a day to ${idea.name}`}><Plus size={13} /></button>
      </div>
    </article>
  )
}

export default function IdeaPanel({ ideas, selectedId, onSelect, onStatus, onDays, onAdd, onReorder }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }))

  function dragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const oldIndex = ideas.findIndex((idea) => idea.id === active.id)
    const newIndex = ideas.findIndex((idea) => idea.id === over.id)
    if (oldIndex >= 0 && newIndex >= 0) onReorder(arrayMove(ideas, oldIndex, newIndex))
  }

  return (
    <aside className="idea-panel">
      <div className="panel-heading"><div><h2>Ideas</h2><p>Open, keep, park or rule out each piece.</p></div><span className="idea-count">{ideas.length}</span></div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={ideas.map((idea) => idea.id)} strategy={verticalListSortingStrategy}>
          <div className="idea-list">
            {ideas.map((idea) => <SortableIdea key={idea.id} idea={idea} selected={selectedId === idea.id} onSelect={onSelect} onStatus={onStatus} onDays={onDays} />)}
          </div>
        </SortableContext>
      </DndContext>
      <button className="add-idea-button" type="button" onClick={onAdd}><Plus size={16} />Add an idea</button>
    </aside>
  )
}
