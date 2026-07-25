import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, Download, Map as MapIcon, Menu, Plus, RotateCcw, Save, Sparkles } from 'lucide-react'
import AddIdeaModal from './components/AddIdeaModal.jsx'
import ComparePanel from './components/ComparePanel.jsx'
import IdeaDetail from './components/IdeaDetail.jsx'
import IdeaPanel from './components/IdeaPanel.jsx'
import MapPanel from './components/MapPanel.jsx'
import Timeline from './components/Timeline.jsx'
import { scenarios, seedBookmarks, seedIdeas } from './data.js'

const STORAGE_KEY = 'drift-australia-2026-v1'
const DATA_VERSION = 3
const seedIdeaById = new Map(seedIdeas.map((idea) => [idea.id, idea]))

function dateFromInput(value) {
  return new Date(`${value}T12:00:00`)
}

function dateToInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function loadState() {
  const clean = { version: DATA_VERSION, ideas: seedIdeas, bookmarks: seedBookmarks, tripLength: 26, startDate: '2026-10-26' }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!saved?.ideas?.length) return clean
    const savedIds = new Set(saved.ideas.map((idea) => idea.id))
    const ideas = saved.ideas.map((savedIdea) => {
      const currentSeed = seedIdeaById.get(savedIdea.id)
      if (!currentSeed) return savedIdea
      const hadCustomGallery = Array.isArray(savedIdea.gallery)
      return {
        ...currentSeed,
        ...savedIdea,
        coordinates: currentSeed.coordinates,
        mapLabel: currentSeed.mapLabel,
        image: hadCustomGallery ? savedIdea.image : currentSeed.image,
        gallery: hadCustomGallery ? savedIdea.gallery : currentSeed.gallery,
      }
    })
    seedIdeas.filter((idea) => !savedIds.has(idea.id)).forEach((idea) => ideas.push(idea))
    return { ...clean, ...saved, version: DATA_VERSION, ideas, bookmarks: saved.bookmarks?.length ? saved.bookmarks : seedBookmarks }
  } catch {
    return clean
  }
}

export default function App() {
  const initial = useMemo(loadState, [])
  const startDateInput = useRef(null)
  const [ideas, setIdeas] = useState(initial.ideas)
  const [bookmarks, setBookmarks] = useState(initial.bookmarks)
  const [tripLength, setTripLength] = useState(initial.tripLength)
  const [startDate, setStartDate] = useState(initial.startDate)
  const [selectedId, setSelectedId] = useState(initial.ideas.find((idea) => idea.status === 'included')?.id || initial.ideas[0].id)
  const [activeView, setActiveView] = useState('route')
  const [scenarioId, setScenarioId] = useState('wa-tas')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [savePulse, setSavePulse] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const selectedIdea = ideas.find((idea) => idea.id === selectedId) || ideas[0]
  const includedCount = ideas.filter((idea) => idea.status === 'included').length
  const endDate = useMemo(() => {
    const date = dateFromInput(startDate)
    date.setDate(date.getDate() + tripLength - 1)
    return dateToInput(date)
  }, [startDate, tripLength])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: DATA_VERSION, ideas, bookmarks, tripLength, startDate }))
      setSaveError(false)
      setSavePulse(true)
      const timeout = window.setTimeout(() => setSavePulse(false), 700)
      return () => window.clearTimeout(timeout)
    } catch {
      setSaveError(true)
    }
  }, [ideas, bookmarks, tripLength, startDate])

  function selectIdea(id, openDetails = false) {
    setSelectedId(id)
    if (openDetails) setActiveView('ideas')
  }

  function updateStatus(id, status) {
    setIdeas((current) => current.map((idea) => idea.id === id ? { ...idea, status } : idea))
  }

  function setDays(id, days) {
    setIdeas((current) => current.map((idea) => idea.id === id ? { ...idea, days: Math.max(1, Math.min(14, days)) } : idea))
  }

  function updateDays(id, change) {
    const idea = ideas.find((item) => item.id === id)
    if (idea) setDays(id, idea.days + change)
  }

  function reorder(sourceId, targetId) {
    setIdeas((current) => {
      const next = [...current]
      const sourceIndex = next.findIndex((idea) => idea.id === sourceId)
      const targetIndex = next.findIndex((idea) => idea.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0) return current
      const [source] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, source)
      return next
    })
  }

  function createIdea(form) {
    const idea = {
      id: `custom-${Date.now()}`, name: form.name.trim(), region: form.region.trim() || 'Other idea',
      summary: form.summary.trim() || 'New possibility to explore.', note: form.note.trim() || 'No route notes yet.',
      days: form.days, status: 'maybe', color: 'blue', highlights: [], gallery: [],
      rationale: 'Duration assessment to add.', tradeoffs: 'Trade-offs to add.', season: 'Seasonal notes to add.',
    }
    setIdeas((current) => [...current, idea])
    setSelectedId(idea.id)
    setActiveView('ideas')
    setModalOpen(false)
    setEditingId(null)
  }

  function openAddIdea() {
    setEditingId(null)
    setModalOpen(true)
  }

  function openEditIdea(id) {
    setEditingId(id)
    setSelectedId(id)
    setActiveView('ideas')
    setModalOpen(true)
  }

  function saveIdea(form) {
    if (!editingId) {
      createIdea(form)
      return
    }
    setIdeas((current) => current.map((idea) => idea.id === editingId ? {
      ...idea,
      name: form.name.trim(),
      region: form.region.trim() || 'Other idea',
      days: Math.max(1, Math.min(14, form.days)),
      summary: form.summary.trim() || 'Possibility to explore.',
      note: form.note.trim(),
    } : idea))
    setModalOpen(false)
    setEditingId(null)
  }

  function deleteIdea(id) {
    const idea = ideas.find((item) => item.id === id)
    if (!idea) return
    if (ideas.length === 1) {
      window.alert('Keep at least one idea in the planner.')
      return
    }
    if (!window.confirm(`Permanently delete “${idea.name}”? This is different from Exclude.`)) return
    const index = ideas.findIndex((item) => item.id === id)
    const remaining = ideas.filter((item) => item.id !== id)
    setIdeas(remaining)
    setBookmarks((current) => current.map((source) => ({ ...source, ideaIds: (source.ideaIds || []).filter((ideaId) => ideaId !== id) })))
    if (selectedId === id) setSelectedId(remaining[Math.min(index, remaining.length - 1)].id)
    setModalOpen(false)
    setEditingId(null)
  }

  function applyScenario(scenario) {
    setIdeas((current) => current.map((idea) => {
      const setting = scenario.plan[idea.id]
      return setting ? { ...idea, status: setting[0], days: setting[1] } : idea
    }))
    setTripLength(scenario.days)
    setActiveView('route')
  }

  function updateIdeaField(id, field, value) {
    setIdeas((current) => current.map((idea) => idea.id === id ? { ...idea, [field]: value } : idea))
  }

  function addImage(id, image) {
    setIdeas((current) => current.map((idea) => idea.id === id ? { ...idea, gallery: [...(idea.gallery || []), image], image: idea.image || image.src } : idea))
  }

  function removeImage(id, imageId) {
    setIdeas((current) => current.map((idea) => {
      if (idea.id !== id) return idea
      const gallery = (idea.gallery || []).filter((image) => image.id !== imageId)
      const removedCover = idea.coverImageId === imageId || idea.image === idea.gallery?.find((image) => image.id === imageId)?.src
      return { ...idea, gallery, coverImageId: removedCover ? gallery[0]?.id : idea.coverImageId, image: removedCover ? gallery[0]?.src : idea.image }
    }))
  }

  function moveImage(id, imageId, change) {
    setIdeas((current) => current.map((idea) => {
      if (idea.id !== id) return idea
      const gallery = [...(idea.gallery || [])]
      const index = gallery.findIndex((image) => image.id === imageId)
      const nextIndex = Math.max(0, Math.min(gallery.length - 1, index + change))
      if (index < 0 || index === nextIndex) return idea
      const [image] = gallery.splice(index, 1)
      gallery.splice(nextIndex, 0, image)
      return { ...idea, gallery }
    }))
  }

  function setCover(id, imageId) {
    setIdeas((current) => current.map((idea) => {
      if (idea.id !== id) return idea
      const image = idea.gallery?.find((item) => item.id === imageId)
      return image ? { ...idea, coverImageId: imageId, image: image.src } : idea
    }))
  }

  function addSource(source) {
    setBookmarks((current) => [...current, { ...source, id: `source-${Date.now()}`, pinned: false, lastChecked: '' }])
  }

  function moveSource(id, change) {
    setBookmarks((current) => {
      const next = [...current]
      const index = next.findIndex((source) => source.id === id)
      const nextIndex = Math.max(0, Math.min(next.length - 1, index + change))
      if (index < 0 || index === nextIndex) return current
      const [source] = next.splice(index, 1)
      next.splice(nextIndex, 0, source)
      return next
    })
  }

  function changeEndDate(value) {
    const difference = Math.round((dateFromInput(value) - dateFromInput(startDate)) / 86400000) + 1
    if (difference >= 1 && difference <= 60) setTripLength(difference)
  }

  function resetPlanner() {
    if (!window.confirm('Reset all local changes to the published starting plan?')) return
    setIdeas(seedIdeas); setBookmarks(seedBookmarks); setTripLength(26); setStartDate('2026-10-26'); setSelectedId(seedIdeas[0].id); setActiveView('route')
  }

  function exportPlan() {
    const payload = { title: 'Australia holiday 2026', exportedAt: new Date().toISOString(), startDate, endDate, tripLength, ideas, bookmarks }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'australia-holiday-plan.json'; anchor.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="icon-button menu-button" aria-label="Open menu"><Menu size={21} /></button>
        <div className="brand">Drift <span>— Australia 2026</span></div>
        <nav className="primary-nav" aria-label="Planner sections">
          <button type="button" className={activeView === 'ideas' ? 'active' : ''} onClick={() => setActiveView('ideas')}><Plus size={15} /> Ideas</button>
          <button type="button" className={activeView === 'route' ? 'active' : ''} onClick={() => setActiveView('route')}><MapIcon size={15} /> Route</button>
          <button type="button" className={activeView === 'compare' ? 'active' : ''} onClick={() => setActiveView('compare')}><Sparkles size={15} /> Compare</button>
        </nav>
        <div className="date-controls">
          <button type="button" className="date-picker-button" onClick={() => startDateInput.current?.showPicker?.()} aria-label="Open trip start date picker"><CalendarDays size={16} /></button>
          <label><span>Start</span><input ref={startDateInput} type="date" value={startDate} onInput={(event) => setStartDate(event.currentTarget.value)} aria-label="Trip start date" /></label>
          <i>→</i>
          <label><span>End</span><input type="date" value={endDate} min={startDate} onInput={(event) => changeEndDate(event.currentTarget.value)} aria-label="Trip end date" /></label>
          <b>{tripLength}d</b>
        </div>
        <div className={`save-state ${savePulse ? 'pulse' : ''} ${saveError ? 'error' : ''}`}><Check size={14} /> {saveError ? 'Browser storage full' : 'Saved on this device'}</div>
        <button type="button" className="icon-button" onClick={resetPlanner} title="Reset planner"><RotateCcw size={17} /></button>
        <button type="button" className="export-button" onClick={exportPlan}><Download size={16} /> Export</button>
      </header>

      <main className={`workspace view-${activeView}`}>
        <IdeaPanel ideas={ideas} selectedId={selectedId} onSelect={(id) => selectIdea(id, true)} onStatus={updateStatus} onDays={updateDays} onAdd={openAddIdea} onReorder={setIdeas} onEdit={openEditIdea} onDelete={deleteIdea} />
        <div className="planning-column">
          {activeView === 'ideas' && <IdeaDetail idea={selectedIdea} sources={bookmarks} onUpdateField={updateIdeaField} onAddImage={addImage} onRemoveImage={removeImage} onMoveImage={moveImage} onSetCover={setCover} onEdit={openEditIdea} onDelete={deleteIdea} />}
          {activeView === 'route' && <Timeline ideas={ideas} tripLength={tripLength} startDate={dateFromInput(startDate)} onReorder={reorder} onSelect={(id) => selectIdea(id, false)} onAdd={openAddIdea} onSetDays={setDays} />}
          {activeView === 'compare' && <ComparePanel scenarios={scenarios} activeId={scenarioId} onPreview={setScenarioId} onApply={applyScenario} />}
        </div>
        <MapPanel ideas={ideas} selectedIdea={selectedIdea} onSelect={(id) => selectIdea(id, true)} sources={bookmarks} onAddSource={addSource} onDeleteSource={(id) => setBookmarks((current) => current.filter((source) => source.id !== id))} onMoveSource={moveSource} onCheckedSource={(id) => setBookmarks((current) => current.map((source) => source.id === id ? { ...source, lastChecked: dateToInput(new Date()) } : source))} onTogglePin={(id) => setBookmarks((current) => current.map((source) => source.id === id ? { ...source, pinned: !source.pinned } : source))} />
      </main>
      <div className="mobile-status"><span><Save size={14} /> {includedCount} included · {tripLength} days</span><button type="button" onClick={openAddIdea}><Plus size={15} /> Add idea</button></div>
      {modalOpen && <AddIdeaModal idea={ideas.find((idea) => idea.id === editingId)} onClose={() => { setModalOpen(false); setEditingId(null) }} onSave={saveIdea} />}
    </div>
  )
}
