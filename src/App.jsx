import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, Download, Map as MapIcon, Menu, Plus, RotateCcw, Save, Sparkles, X } from 'lucide-react'
import AddIdeaModal from './components/AddIdeaModal.jsx'
import ComparePanel from './components/ComparePanel.jsx'
import IdeaDetail from './components/IdeaDetail.jsx'
import IdeaPanel from './components/IdeaPanel.jsx'
import MapPanel from './components/MapPanel.jsx'
import Timeline from './components/Timeline.jsx'
import { scenarios as seedDirections, seedBookmarks, seedIdeas } from './data.js'

const STORAGE_KEY = 'drift-australia-2026-v1'
const DATA_VERSION = 7
const seedIdeaById = new Map(seedIdeas.map((idea) => [idea.id, idea]))
const seedBookmarkById = new Map(seedBookmarks.map((bookmark) => [bookmark.id, bookmark]))
const seedDirectionById = new Map(seedDirections.map((direction) => [direction.id, direction]))
const V4_GALLERY_ADDITIONS = new Map([['tas-hobart', ['url-1784973561723']]])
const V4_BOOKMARK_ADDITIONS = ['photo-hobart-panorama']
const V5_REMOVED_IDEA_IDS = new Set(['adelaide-ki'])
const V5_SEED_REFRESH_FIELDS = ['name', 'region', 'summary', 'color', 'coordinates', 'mapLabel', 'highlights', 'timestamps', 'note', 'tradeoffs', 'season', 'rationale']

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
  const clean = { version: DATA_VERSION, ideas: seedIdeas, bookmarks: seedBookmarks, directions: seedDirections, appliedDirectionId: 'wa-tas-sydney', tripLength: 28, startDate: '2026-10-26' }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!saved?.ideas?.length) return clean
    const retainedSavedIdeas = saved.ideas.filter((idea) => !V5_REMOVED_IDEA_IDS.has(idea.id))
    const savedIds = new Set(retainedSavedIdeas.map((idea) => idea.id))
    let ideas = retainedSavedIdeas.map((savedIdea) => {
      const currentSeed = seedIdeaById.get(savedIdea.id)
      if (!currentSeed) return savedIdea
      const currentGalleryById = new Map((currentSeed.gallery || []).map((image) => [image.id, image]))
      const hadSavedGallery = Array.isArray(savedIdea.gallery)
      const gallery = (hadSavedGallery ? savedIdea.gallery : currentSeed.gallery || []).map((image) => (
        currentGalleryById.has(image.id) ? { ...image, ...currentGalleryById.get(image.id) } : image
      ))
      if ((saved.version || 0) < 4) {
        const savedGalleryIds = new Set(gallery.map((image) => image.id))
        ;(V4_GALLERY_ADDITIONS.get(savedIdea.id) || [])
          .filter((id) => !savedGalleryIds.has(id) && currentGalleryById.has(id))
          .forEach((id) => gallery.push(currentGalleryById.get(id)))
      }
      const coverImageId = savedIdea.coverImageId || currentSeed.coverImageId
      const coverImage = gallery.find((image) => image.id === coverImageId)
      const mergedIdea = {
        ...currentSeed,
        ...savedIdea,
        coordinates: currentSeed.coordinates,
        mapLabel: currentSeed.mapLabel,
        gallery,
        coverImageId,
        image: coverImage?.src || currentSeed.image,
      }
      if ((saved.version || 0) < 6) {
        V5_SEED_REFRESH_FIELDS.forEach((field) => {
          if (field in currentSeed) mergedIdea[field] = currentSeed[field]
          else delete mergedIdea[field]
        })
        if (!hadSavedGallery) mergedIdea.gallery = currentSeed.gallery || []
        if (!mergedIdea.coverImageId || !mergedIdea.gallery.some((image) => image.id === mergedIdea.coverImageId)) {
          mergedIdea.coverImageId = currentSeed.coverImageId || mergedIdea.gallery[0]?.id
          mergedIdea.image = mergedIdea.gallery.find((image) => image.id === mergedIdea.coverImageId)?.src || currentSeed.image
        }
      }
      return mergedIdea
    })
    seedIdeas.filter((idea) => !savedIds.has(idea.id)).forEach((idea) => ideas.push(idea))
    if ((saved.version || 0) < 6) {
      const migratedById = new Map(ideas.map((idea) => [idea.id, idea]))
      const seededOrder = seedIdeas.map((idea) => migratedById.get(idea.id)).filter(Boolean)
      const customIdeas = ideas.filter((idea) => !seedIdeaById.has(idea.id))
      ideas = [...seededOrder, ...customIdeas]
    }
    const hadSavedBookmarks = Array.isArray(saved.bookmarks)
    const bookmarks = (hadSavedBookmarks ? saved.bookmarks : seedBookmarks)
      .filter((bookmark) => !(bookmark.ideaIds || []).some((id) => V5_REMOVED_IDEA_IDS.has(id)))
      .map((bookmark) => (
      seedBookmarkById.has(bookmark.id) ? { ...bookmark, ...seedBookmarkById.get(bookmark.id) } : bookmark
    ))
    if ((saved.version || 0) < 4) {
      const savedBookmarkIds = new Set(bookmarks.map((bookmark) => bookmark.id))
      V4_BOOKMARK_ADDITIONS
        .filter((id) => !savedBookmarkIds.has(id) && seedBookmarkById.has(id))
        .forEach((id) => bookmarks.push(seedBookmarkById.get(id)))
    }
    if ((saved.version || 0) < 5) {
      const savedBookmarkIds = new Set(bookmarks.map((bookmark) => bookmark.id))
      seedBookmarks.filter((bookmark) => !savedBookmarkIds.has(bookmark.id)).forEach((bookmark) => bookmarks.push(bookmark))
    }
    const directions = (saved.version || 0) >= 5 && Array.isArray(saved.directions) && saved.directions.length
      ? saved.directions.map((direction) => {
        const currentSeed = seedDirectionById.get(direction.id)
        if (!currentSeed) return direction
        return {
          ...direction,
          name: currentSeed.name,
          days: (saved.version || 0) < 7 ? currentSeed.days : direction.days,
          pace: currentSeed.pace,
          transit: currentSeed.transit,
          image: currentSeed.image,
          summary: currentSeed.summary,
          pros: currentSeed.pros,
        }
      })
      : seedDirections
    const migratedTripLength = (saved.version || 0) < 7 && saved.appliedDirectionId
      ? directions.find((direction) => direction.id === saved.appliedDirectionId)?.days || saved.tripLength
      : saved.tripLength || clean.tripLength
    return {
      ...clean,
      ...saved,
      version: DATA_VERSION,
      ideas,
      bookmarks,
      directions,
      appliedDirectionId: (saved.version || 0) >= 5 ? (saved.appliedDirectionId || '') : '',
      tripLength: migratedTripLength,
    }
  } catch {
    return clean
  }
}

export default function App() {
  const initial = useMemo(loadState, [])
  const startDateInput = useRef(null)
  const [ideas, setIdeas] = useState(initial.ideas)
  const [bookmarks, setBookmarks] = useState(initial.bookmarks)
  const [directions, setDirections] = useState(initial.directions)
  const [tripLength, setTripLength] = useState(initial.tripLength)
  const [startDate, setStartDate] = useState(initial.startDate)
  const [selectedId, setSelectedId] = useState(initial.ideas.find((idea) => idea.status === 'included')?.id || initial.ideas[0].id)
  const [activeView, setActiveView] = useState('route')
  const [ideaDetailOpen, setIdeaDetailOpen] = useState(false)
  const [directionId, setDirectionId] = useState(initial.appliedDirectionId || initial.directions[0]?.id || '')
  const [appliedDirectionId, setAppliedDirectionId] = useState(initial.appliedDirectionId)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [savePulse, setSavePulse] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false)

  const selectedIdea = ideas.find((idea) => idea.id === selectedId) || ideas[0]
  const includedCount = ideas.filter((idea) => idea.status === 'included').length
  const maybeCount = ideas.filter((idea) => idea.status === 'maybe').length
  const endDate = useMemo(() => {
    const date = dateFromInput(startDate)
    date.setDate(date.getDate() + tripLength - 1)
    return dateToInput(date)
  }, [startDate, tripLength])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: DATA_VERSION, ideas, bookmarks, directions, appliedDirectionId, tripLength, startDate }))
      setSaveError(false)
      setSavePulse(true)
      const timeout = window.setTimeout(() => setSavePulse(false), 700)
      return () => window.clearTimeout(timeout)
    } catch {
      setSaveError(true)
    }
  }, [ideas, bookmarks, directions, appliedDirectionId, tripLength, startDate])

  function updateAppliedDirection(id, setting) {
    if (!appliedDirectionId) return
    setDirections((current) => current.map((direction) => direction.id === appliedDirectionId
      ? { ...direction, plan: { ...direction.plan, [id]: setting } }
      : direction))
  }

  function selectIdea(id, openDetails = false) {
    setSelectedId(id)
    if (openDetails) {
      setActiveView('ideas')
      setIdeaDetailOpen(true)
    }
  }

  function updateStatus(id, status) {
    const idea = ideas.find((item) => item.id === id)
    if (idea) updateAppliedDirection(id, [status, idea.days])
    setIdeas((current) => current.map((item) => item.id === id ? { ...item, status } : item))
  }

  function setDays(id, days) {
    const safeDays = Math.max(1, Math.min(14, days))
    const idea = ideas.find((item) => item.id === id)
    if (idea) updateAppliedDirection(id, [idea.status, safeDays])
    setIdeas((current) => current.map((item) => item.id === id ? { ...item, days: safeDays } : item))
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
    setDirections((current) => current.map((direction) => ({ ...direction, plan: { ...direction.plan, [idea.id]: ['excluded', idea.days] } })))
    setSelectedId(idea.id)
    setActiveView('ideas')
    setIdeaDetailOpen(true)
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
    setIdeaDetailOpen(true)
    setModalOpen(true)
  }

  function saveIdea(form) {
    if (!editingId) {
      createIdea(form)
      return
    }
    const currentIdea = ideas.find((idea) => idea.id === editingId)
    const safeDays = Math.max(1, Math.min(14, form.days))
    if (currentIdea) updateAppliedDirection(editingId, [currentIdea.status, safeDays])
    setIdeas((current) => current.map((idea) => idea.id === editingId ? {
      ...idea,
      name: form.name.trim(),
      region: form.region.trim() || 'Other idea',
      days: safeDays,
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
    setDirections((current) => current.map((direction) => {
      const plan = { ...direction.plan }
      delete plan[id]
      return { ...direction, plan }
    }))
    if (selectedId === id) {
      setSelectedId(remaining[Math.min(index, remaining.length - 1)].id)
      setIdeaDetailOpen(false)
    }
    setModalOpen(false)
    setEditingId(null)
  }

  function applyDirection(direction) {
    setIdeas((current) => current.map((idea) => {
      const setting = direction.plan[idea.id] || ['excluded', idea.days]
      return { ...idea, status: setting[0], days: setting[1] }
    }))
    setTripLength(direction.days)
    setDirectionId(direction.id)
    setAppliedDirectionId(direction.id)
    setActiveView('route')
    setIdeaDetailOpen(false)
  }

  function addDirection(name) {
    const direction = {
      id: `direction-${Date.now()}`,
      name: name.trim(),
      days: tripLength,
      pace: 'Custom direction',
      transit: 'Updates from the scheduled route',
      image: ideas.find((idea) => idea.status !== 'excluded' && idea.image)?.image || seedIdeas[0].image,
      summary: 'A saved direction copied from the current Include, Maybe and Exclude choices.',
      pros: ['Independent choices from the other directions', 'Days and statuses update as this direction is edited', 'Can be removed without deleting any idea cards'],
      plan: Object.fromEntries(ideas.map((idea) => [idea.id, [idea.status, idea.days]])),
      custom: true,
    }
    setDirections((current) => [...current, direction])
    setDirectionId(direction.id)
    setAppliedDirectionId(direction.id)
  }

  function removeDirection(id) {
    const direction = directions.find((item) => item.id === id)
    if (!direction || directions.length === 1) return
    if (!window.confirm(`Remove the direction “${direction.name}”? Your idea cards will not be deleted.`)) return
    const remaining = directions.filter((item) => item.id !== id)
    setDirections(remaining)
    if (directionId === id) setDirectionId(remaining[0].id)
    if (appliedDirectionId === id) setAppliedDirectionId('')
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
    if (difference >= 1 && difference <= 60) {
      setTripLength(difference)
      if (appliedDirectionId) {
        setDirections((current) => current.map((direction) => direction.id === appliedDirectionId ? { ...direction, days: difference } : direction))
      }
    }
  }

  function resetPlanner() {
    if (!window.confirm('Reset all local changes to the published starting plan?')) return
    setIdeas(seedIdeas); setBookmarks(seedBookmarks); setDirections(seedDirections); setDirectionId(seedDirections[0].id); setAppliedDirectionId(seedDirections[0].id); setTripLength(28); setStartDate('2026-10-26'); setSelectedId(seedIdeas[0].id); setActiveView('route'); setIdeaDetailOpen(false)
  }

  function exportPlan() {
    const payload = { title: 'Australia holiday 2026', exportedAt: new Date().toISOString(), startDate, endDate, tripLength, ideas, bookmarks, directions, appliedDirectionId }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'australia-holiday-plan.json'; anchor.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="icon-button menu-button" aria-label="Open menu"><Menu size={21} /></button>
        <div className="brand">Drift <span>— Australia 2026</span></div>
        <nav className="primary-nav" aria-label="Planner sections">
          <button type="button" className={activeView === 'ideas' ? 'active' : ''} onClick={() => { setActiveView('ideas'); setIdeaDetailOpen(false); setMobileSettingsOpen(false) }}><Plus size={15} /> Ideas</button>
          <button type="button" className={activeView === 'route' ? 'active' : ''} onClick={() => { setActiveView('route'); setIdeaDetailOpen(false); setMobileSettingsOpen(false) }}><MapIcon size={15} /> Route</button>
          <button type="button" className={activeView === 'compare' ? 'active' : ''} onClick={() => { setActiveView('compare'); setIdeaDetailOpen(false); setMobileSettingsOpen(false) }}><Sparkles size={15} /> Compare</button>
        </nav>
        <button type="button" className="icon-button mobile-settings-toggle" aria-label="Trip settings" aria-expanded={mobileSettingsOpen} aria-controls="mobile-trip-settings" onClick={() => setMobileSettingsOpen((open) => !open)}><CalendarDays size={18} /></button>
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
        {mobileSettingsOpen && (
          <section id="mobile-trip-settings" className="mobile-settings-panel" aria-label="Trip settings">
            <div className="mobile-settings-heading"><div><CalendarDays size={16} /><strong>Trip settings</strong></div><button type="button" aria-label="Close trip settings" onClick={() => setMobileSettingsOpen(false)}><X size={16} /></button></div>
            <div className="mobile-date-grid">
              <label><span>Start date</span><input type="date" value={startDate} onInput={(event) => setStartDate(event.currentTarget.value)} aria-label="Mobile trip start date" /></label>
              <label><span>End date</span><input type="date" value={endDate} min={startDate} onInput={(event) => changeEndDate(event.currentTarget.value)} aria-label="Mobile trip end date" /></label>
            </div>
            <div className="mobile-settings-summary"><span>{tripLength} days</span><span>{saveError ? 'Could not save locally' : 'Saved on this device'}</span></div>
            <div className="mobile-settings-actions">
              <button type="button" onClick={() => { resetPlanner(); setMobileSettingsOpen(false) }}><RotateCcw size={14} /> Reset</button>
              <button type="button" className="primary" onClick={() => { exportPlan(); setMobileSettingsOpen(false) }}><Download size={14} /> Export JSON</button>
            </div>
          </section>
        )}
      </header>

      <main className={`workspace view-${activeView} ${ideaDetailOpen ? 'idea-detail-open' : ''}`}>
        <IdeaPanel ideas={ideas} selectedId={selectedId} onSelect={(id) => selectIdea(id, true)} onStatus={updateStatus} onDays={updateDays} onAdd={openAddIdea} onReorder={setIdeas} onEdit={openEditIdea} onDelete={deleteIdea} />
        <div className="planning-column">
          {activeView === 'ideas' && ideaDetailOpen && <IdeaDetail idea={selectedIdea} sources={bookmarks} onBack={() => setIdeaDetailOpen(false)} onUpdateField={updateIdeaField} onAddImage={addImage} onRemoveImage={removeImage} onMoveImage={moveImage} onSetCover={setCover} onEdit={openEditIdea} onDelete={deleteIdea} />}
          {activeView === 'route' && <Timeline ideas={ideas} tripLength={tripLength} startDate={dateFromInput(startDate)} onReorder={reorder} onSelect={(id) => selectIdea(id, false)} onAdd={openAddIdea} onSetDays={setDays} />}
          {activeView === 'compare' && <ComparePanel directions={directions} activeId={directionId} appliedId={appliedDirectionId} onPreview={setDirectionId} onApply={applyDirection} onAdd={addDirection} onRemove={removeDirection} />}
        </div>
        <MapPanel ideas={ideas} selectedIdea={selectedIdea} onSelect={(id) => selectIdea(id, true)} sources={bookmarks} onAddSource={addSource} onDeleteSource={(id) => setBookmarks((current) => current.filter((source) => source.id !== id))} onMoveSource={moveSource} onCheckedSource={(id) => setBookmarks((current) => current.map((source) => source.id === id ? { ...source, lastChecked: dateToInput(new Date()) } : source))} onTogglePin={(id) => setBookmarks((current) => current.map((source) => source.id === id ? { ...source, pinned: !source.pinned } : source))} />
      </main>
      <div className="mobile-status"><span><Save size={14} /> {includedCount} firm + {maybeCount} maybe · {tripLength} days</span><button type="button" onClick={openAddIdea}><Plus size={15} /> Add idea</button></div>
      {modalOpen && <AddIdeaModal idea={ideas.find((idea) => idea.id === editingId)} onClose={() => { setModalOpen(false); setEditingId(null) }} onSave={saveIdea} />}
    </div>
  )
}
