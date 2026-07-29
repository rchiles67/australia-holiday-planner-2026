import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, Download, Lightbulb, Menu, RotateCcw, Route as RouteIcon, Sparkles, X } from 'lucide-react'
import AddIdeaModal from './components/AddIdeaModal.jsx'
import ComparePanel from './components/ComparePanel.jsx'
import IdeaDetail from './components/IdeaDetail.jsx'
import IdeaPanel from './components/IdeaPanel.jsx'
import MapPanel from './components/MapPanel.jsx'
import PlanTransferModal from './components/PlanTransferModal.jsx'
import { scenarios as seedDirections, seedBookmarks, seedIdeas } from './data.js'
import { buildSchedule } from './schedule.js'

const STORAGE_KEY = 'drift-australia-2026-v1'
const DATA_VERSION = 14
const seedIdeaById = new Map(seedIdeas.map((idea) => [idea.id, idea]))
const seedGalleryIds = new Set(seedIdeas.flatMap((idea) => (idea.gallery || []).map((image) => image.id)))
const seedBookmarkById = new Map(seedBookmarks.map((bookmark) => [bookmark.id, bookmark]))
const seedDirectionById = new Map(seedDirections.map((direction) => [direction.id, direction]))
const seedImageSrcByFileName = new Map(seedIdeas.flatMap((idea) => [idea.image, ...(idea.gallery || []).map((image) => image.src)])
  .filter(Boolean)
  .map((src) => [src.split(/[?#]/)[0].split('/').pop(), src]))
const V4_GALLERY_ADDITIONS = new Map([['tas-hobart', ['url-1784973561723']]])
const V4_BOOKMARK_ADDITIONS = ['photo-hobart-panorama']
const V5_REMOVED_IDEA_IDS = new Set(['adelaide-ki'])
const V5_SEED_REFRESH_FIELDS = ['name', 'region', 'summary', 'color', 'coordinates', 'mapLabel', 'highlights', 'timestamps', 'note', 'tradeoffs', 'season', 'rationale']
const V13_UPDATED_DIRECTION_IDS = new Set(['wa-tas-sydney'])
const V14_UPDATED_DIRECTION_IDS = new Set(['wa-south-kimberley'])
const V14_KIMBERLEY_ID_PREFIXES = ['kimberley-', 'wa-kimberley-']
const VALID_STATUSES = new Set(['included', 'maybe', 'excluded'])

function currentSeedAssetSrc(src) {
  if (typeof src !== 'string' || /^(?:data:|blob:|https?:)/i.test(src)) return src
  const fileName = src.split(/[?#]/)[0].split('/').pop()
  return seedImageSrcByFileName.get(fileName) || src
}

function rebindSeedIdeaImages(idea, currentSeed) {
  if (!currentSeed) return idea
  const currentGalleryById = new Map((currentSeed.gallery || []).map((image) => [image.id, image]))
  const gallery = (idea.gallery || []).map((image) => {
    const currentImage = currentGalleryById.has(image.id) ? { ...image, ...currentGalleryById.get(image.id) } : image
    return { ...currentImage, src: currentSeedAssetSrc(currentImage.src) }
  })
  const coverImage = gallery.find((image) => image.id === idea.coverImageId)
  return {
    ...idea,
    gallery,
    image: coverImage?.src || currentSeedAssetSrc(idea.image) || currentSeed.image,
  }
}

function normaliseDirection(direction, ideas) {
  const knownIds = new Set(ideas.map((idea) => idea.id))
  const order = [...(direction.order || []).filter((id) => knownIds.has(id))]
  ideas.forEach((idea) => {
    if (!order.includes(idea.id)) order.push(idea.id)
  })
  const plan = Object.fromEntries(ideas.map((idea) => [idea.id, direction.plan?.[idea.id] || ['excluded', idea.days]]))
  return { ...direction, order, plan }
}

function ideasForDirection(ideas, direction) {
  if (!direction) return ideas
  const order = new Map((direction.order || []).map((id, index) => [id, index]))
  return ideas
    .map((idea) => {
      const setting = direction.plan?.[idea.id] || ['excluded', idea.days]
      return { ...idea, status: setting[0], days: setting[1] }
    })
    .sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER))
}

function clampWholeNumber(value, minimum, maximum, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, Math.round(number))) : fallback
}

function parseImportedPlan(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('The selected file does not contain a plan.')
  if (!Array.isArray(payload.ideas) || !payload.ideas.length) throw new Error('The plan has no idea cards.')
  if (!Array.isArray(payload.directions) || !payload.directions.length) throw new Error('The plan has no directions.')

  const ideaIds = new Set()
  let importedIdeas = payload.ideas.map((idea, index) => {
    if (!idea || typeof idea !== 'object' || typeof idea.id !== 'string' || typeof idea.name !== 'string') {
      throw new Error(`Idea ${index + 1} is missing an id or name.`)
    }
    if (ideaIds.has(idea.id)) throw new Error(`The idea id “${idea.id}” appears more than once.`)
    ideaIds.add(idea.id)
    const importedIdea = {
      ...idea,
      days: clampWholeNumber(idea.days, 1, 14, 1),
      status: VALID_STATUSES.has(idea.status) ? idea.status : 'excluded',
      gallery: Array.isArray(idea.gallery) ? idea.gallery : [],
    }
    const currentSeed = seedIdeaById.get(idea.id)
    if (Number(payload.version || 0) < 10 && currentSeed) {
      const customImages = importedIdea.gallery.filter((image) => image?.id && !seedGalleryIds.has(image.id))
      importedIdea.gallery = [...(currentSeed.gallery || []), ...customImages]
      if (!importedIdea.gallery.some((image) => image.url === importedIdea.cover)) {
        importedIdea.cover = currentSeed.cover || importedIdea.gallery[0]?.url || importedIdea.cover
      }
    }
    return rebindSeedIdeaImages(importedIdea, currentSeed)
  })
  if (Number(payload.version || 0) < 13) {
    importedIdeas = importedIdeas.map((idea) => {
      const currentSeed = seedIdeaById.get(idea.id)
      if (!currentSeed) return idea
      const refreshed = { ...idea, area: currentSeed.area }
      V5_SEED_REFRESH_FIELDS.forEach((field) => {
        if (field in currentSeed) refreshed[field] = currentSeed[field]
        else delete refreshed[field]
      })
      return rebindSeedIdeaImages(refreshed, currentSeed)
    })
    const importedIdeaIds = new Set(importedIdeas.map((idea) => idea.id))
    seedIdeas.filter((idea) => !importedIdeaIds.has(idea.id)).forEach((idea) => importedIdeas.push(idea))
  }
  if (Number(payload.version || 0) < 14) {
    importedIdeas = importedIdeas.map((idea) => {
      if (!V14_KIMBERLEY_ID_PREFIXES.some((prefix) => idea.id.startsWith(prefix))) return idea
      const currentSeed = seedIdeaById.get(idea.id)
      return currentSeed ? { ...idea, area: currentSeed.area, mapGroup: currentSeed.mapGroup } : idea
    })
    const importedIdeaIds = new Set(importedIdeas.map((idea) => idea.id))
    seedIdeas.filter((idea) => !importedIdeaIds.has(idea.id)).forEach((idea) => importedIdeas.push(idea))
  }

  const directionIds = new Set()
  let importedDirections = payload.directions.map((direction, index) => {
    if (!direction || typeof direction !== 'object' || typeof direction.id !== 'string' || typeof direction.name !== 'string') {
      throw new Error(`Direction ${index + 1} is missing an id or name.`)
    }
    if (directionIds.has(direction.id)) throw new Error(`The direction id “${direction.id}” appears more than once.`)
    directionIds.add(direction.id)
    const plan = Object.fromEntries(importedIdeas.map((idea) => {
      const setting = direction.plan?.[idea.id]
      const status = VALID_STATUSES.has(setting?.[0]) ? setting[0] : 'excluded'
      const days = clampWholeNumber(setting?.[1], 1, 14, idea.days)
      return [idea.id, [status, days]]
    }))
    if (Number(payload.version || 0) < 13 && V13_UPDATED_DIRECTION_IDS.has(direction.id)) {
      return normaliseDirection(seedDirectionById.get(direction.id), importedIdeas)
    }
    if (Number(payload.version || 0) < 14 && V14_UPDATED_DIRECTION_IDS.has(direction.id)) {
      return normaliseDirection(seedDirectionById.get(direction.id), importedIdeas)
    }
    return normaliseDirection({
      ...direction,
      image: currentSeedAssetSrc(direction.image),
      days: clampWholeNumber(direction.days, 1, 60, 28),
      plan,
      order: Array.isArray(direction.order) ? direction.order : [],
      pros: Array.isArray(direction.pros) ? direction.pros : [],
    }, importedIdeas)
  })
  if (Number(payload.version || 0) < 13) {
    const importedDirectionIds = new Set(importedDirections.map((direction) => direction.id))
    seedDirections
      .filter((direction) => !importedDirectionIds.has(direction.id))
      .forEach((direction) => importedDirections.push(normaliseDirection(direction, importedIdeas)))
  }
  if (Number(payload.version || 0) < 14) {
    const importedDirectionIds = new Set(importedDirections.map((direction) => direction.id))
    seedDirections.filter((direction) => !importedDirectionIds.has(direction.id)).forEach((direction) => importedDirections.push(normaliseDirection(direction, importedIdeas)))
  }

  const appliedDirectionId = importedDirections.some((direction) => direction.id === payload.appliedDirectionId)
    ? payload.appliedDirectionId
    : importedDirections[0].id
  const appliedDirection = importedDirections.find((direction) => direction.id === appliedDirectionId)
  const startDate = typeof payload.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payload.startDate)
    ? payload.startDate
    : '2026-10-26'

  const importedBookmarks = Array.isArray(payload.bookmarks) ? [...payload.bookmarks] : []
  if (Number(payload.version || 0) < 13) {
    const importedBookmarkIds = new Set(importedBookmarks.map((bookmark) => bookmark.id))
    seedBookmarks.filter((bookmark) => !importedBookmarkIds.has(bookmark.id)).forEach((bookmark) => importedBookmarks.push(bookmark))
  }
  return {
    ideas: ideasForDirection(importedIdeas, appliedDirection),
    bookmarks: importedBookmarks,
    directions: importedDirections,
    appliedDirectionId,
    tripLength: clampWholeNumber(payload.tripLength, 1, 60, appliedDirection.days),
    startDate,
  }
}

function exportFileName(value) {
  const cleaned = String(value || '2026-Australia-plan.json')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .trim()
  const named = cleaned || '2026-Australia-plan.json'
  return named.toLowerCase().endsWith('.json') ? named : `${named}.json`
}

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
  const clean = { version: DATA_VERSION, ideas: seedIdeas, bookmarks: seedBookmarks, directions: seedDirections.map((direction) => normaliseDirection(direction, seedIdeas)), appliedDirectionId: 'wa-tas-sydney', tripLength: 28, startDate: '2026-10-26' }
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
      if ((saved.version || 0) < 10) {
        const customGallery = gallery.filter((image) => !seedGalleryIds.has(image.id))
        mergedIdea.gallery = [...(currentSeed.gallery || []), ...customGallery]
        const savedCustomCover = customGallery.find((image) => image.id === savedIdea.coverImageId)
        mergedIdea.coverImageId = savedCustomCover?.id || currentSeed.coverImageId || mergedIdea.gallery[0]?.id
        mergedIdea.image = savedCustomCover?.src
          || mergedIdea.gallery.find((image) => image.id === mergedIdea.coverImageId)?.src
          || currentSeed.image
      }
      if ((saved.version || 0) < 9) mergedIdea.area = currentSeed.area
      if ((saved.version || 0) < 13) {
        V5_SEED_REFRESH_FIELDS.forEach((field) => {
          if (field in currentSeed) mergedIdea[field] = currentSeed[field]
          else delete mergedIdea[field]
        })
        mergedIdea.area = currentSeed.area
      }
      if ((saved.version || 0) < 14 && V14_KIMBERLEY_ID_PREFIXES.some((prefix) => savedIdea.id.startsWith(prefix))) {
        mergedIdea.area = currentSeed.area
        mergedIdea.mapGroup = currentSeed.mapGroup
      }
      return rebindSeedIdeaImages(mergedIdea, currentSeed)
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
    if ((saved.version || 0) < 14) {
      const savedBookmarkIds = new Set(bookmarks.map((bookmark) => bookmark.id))
      seedBookmarks.filter((bookmark) => !savedBookmarkIds.has(bookmark.id)).forEach((bookmark) => bookmarks.push(bookmark))
    }
    let directions = ((saved.version || 0) >= 5 && Array.isArray(saved.directions) && saved.directions.length
      ? saved.directions.map((direction) => {
        const currentSeed = seedDirectionById.get(direction.id)
        if (!currentSeed) return direction
        if ((saved.version || 0) < 13 && V13_UPDATED_DIRECTION_IDS.has(direction.id)) return currentSeed
        if ((saved.version || 0) < 14 && V14_UPDATED_DIRECTION_IDS.has(direction.id)) return currentSeed
        return {
          ...direction,
          name: currentSeed.name,
          days: (saved.version || 0) < 7 ? currentSeed.days : direction.days,
          pace: currentSeed.pace,
          transit: currentSeed.transit,
          image: currentSeedAssetSrc(direction.image || currentSeed.image),
          summary: currentSeed.summary,
          pros: currentSeed.pros,
        }
      })
      : seedDirections).map((direction) => normaliseDirection(direction, ideas))
    if ((saved.version || 0) < 14) {
      const savedDirectionIds = new Set(directions.map((direction) => direction.id))
      seedDirections
        .filter((direction) => !savedDirectionIds.has(direction.id))
        .forEach((direction) => directions.push(normaliseDirection(direction, ideas)))
    }
    const migratedTripLength = (saved.version || 0) < 7 && saved.appliedDirectionId
      ? directions.find((direction) => direction.id === saved.appliedDirectionId)?.days || saved.tripLength
      : saved.tripLength || clean.tripLength
    const appliedDirectionId = (saved.version || 0) >= 5 ? (saved.appliedDirectionId || '') : ''
    const appliedDirection = directions.find((direction) => direction.id === appliedDirectionId)
    return {
      ...clean,
      ...saved,
      version: DATA_VERSION,
      ideas: (saved.version || 0) < 13 && appliedDirection ? ideasForDirection(ideas, appliedDirection) : ideas,
      bookmarks,
      directions,
      appliedDirectionId,
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
  const [activeView, setActiveView] = useState('compare')
  const [ideaDetailOpen, setIdeaDetailOpen] = useState(false)
  const [detailOrigin, setDetailOrigin] = useState({ view: 'ideas' })
  const [directionId, setDirectionId] = useState(initial.appliedDirectionId || initial.directions[0]?.id || '')
  const [editingDirectionId, setEditingDirectionId] = useState(initial.appliedDirectionId || initial.directions[0]?.id || '')
  const [appliedDirectionId, setAppliedDirectionId] = useState(initial.appliedDirectionId)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [initialAddArea, setInitialAddArea] = useState('')
  const [savePulse, setSavePulse] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  const editingDirection = directions.find((direction) => direction.id === editingDirectionId) || directions[0]
  const appliedDirection = directions.find((direction) => direction.id === appliedDirectionId)
  const previewDirection = directions.find((direction) => direction.id === directionId) || directions[0]
  const editingIdeas = useMemo(() => ideasForDirection(ideas, editingDirection), [ideas, editingDirection])
  const previewIdeas = useMemo(() => ideasForDirection(ideas, previewDirection), [ideas, previewDirection])
  const editingSchedule = useMemo(() => buildSchedule(editingIdeas, startDate, editingDirection?.days || tripLength), [editingIdeas, startDate, editingDirection?.days, tripLength])
  const previewSchedule = useMemo(() => buildSchedule(previewIdeas, startDate, previewDirection?.days || tripLength), [previewIdeas, startDate, previewDirection?.days, tripLength])
  const appliedSchedule = useMemo(() => buildSchedule(ideas, startDate, tripLength), [ideas, startDate, tripLength])
  const displayedIdeas = activeView === 'ideas' ? editingIdeas : activeView === 'compare' ? previewIdeas : ideas
  const selectedIdea = displayedIdeas.find((idea) => idea.id === selectedId) || displayedIdeas[0]
  const areaOptions = useMemo(() => Array.from(new Set(ideas.map((idea) => idea.area || idea.region || 'Other ideas'))), [ideas])
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

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [activeView, ideaDetailOpen])

  function updateDirectionPlan(targetDirectionId, id, setting) {
    setDirections((current) => current.map((direction) => direction.id === targetDirectionId
      ? { ...direction, plan: { ...direction.plan, [id]: setting } }
      : direction))
    if (targetDirectionId === appliedDirectionId) {
      setIdeas((current) => current.map((idea) => idea.id === id ? { ...idea, status: setting[0], days: setting[1] } : idea))
    }
  }

  function selectIdea(id, openDetails = false) {
    setSelectedId(id)
    if (openDetails) {
      setDetailOrigin({ view: activeView })
      if (activeView === 'compare') setEditingDirectionId(directionId)
      if (activeView === 'route') setEditingDirectionId(appliedDirectionId)
      setActiveView('ideas')
      setIdeaDetailOpen(true)
    }
  }

  function closeIdeaDetail() {
    setIdeaDetailOpen(false)
    setActiveView(detailOrigin.view || 'ideas')
  }

  function updateStatus(id, status) {
    const idea = editingIdeas.find((item) => item.id === id)
    if (idea && editingDirection) updateDirectionPlan(editingDirection.id, id, [status, idea.days])
  }

  function setEditingDays(id, days) {
    const safeDays = Math.max(1, Math.min(14, days))
    const idea = editingIdeas.find((item) => item.id === id)
    if (idea && editingDirection) updateDirectionPlan(editingDirection.id, id, [idea.status, safeDays])
  }

  function updateDays(id, change) {
    const idea = editingIdeas.find((item) => item.id === id)
    if (idea) setEditingDays(id, idea.days + change)
  }

  function reorderDirection(targetDirectionId, sourceId, targetId, targetArea) {
    setDirections((current) => current.map((direction) => {
      if (direction.id !== targetDirectionId) return direction
      const order = [...direction.order]
      const sourceIndex = order.indexOf(sourceId)
      const targetIndex = order.indexOf(targetId)
      if (sourceIndex < 0 || targetIndex < 0) return direction
      const [source] = order.splice(sourceIndex, 1)
      order.splice(targetIndex, 0, source)
      return { ...direction, order }
    }))
    if (targetArea) setIdeas((current) => current.map((idea) => idea.id === sourceId ? { ...idea, area: targetArea } : idea))
    if (targetDirectionId === appliedDirectionId) {
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
  }

  function setDirectionLength(targetDirectionId, days) {
    const safeDays = Math.max(1, Math.min(60, days || 1))
    setDirections((current) => current.map((direction) => direction.id === targetDirectionId ? { ...direction, days: safeDays } : direction))
    if (targetDirectionId === appliedDirectionId) setTripLength(safeDays)
  }

  function setDirectionCover(targetDirectionId, image) {
    setDirections((current) => current.map((direction) => direction.id === targetDirectionId ? { ...direction, image } : direction))
  }

  function createIdea(form) {
    const status = editingDirectionId === appliedDirectionId ? 'maybe' : 'excluded'
    const idea = {
      id: `custom-${Date.now()}`, name: form.name.trim(), region: form.region.trim() || 'Other idea',
      area: form.area.trim() || form.region.trim() || 'Other ideas',
      mapGroup: form.mapGroup.trim() || form.region.trim() || form.area.trim() || 'Other',
      coordinates: validCoordinates(form),
      wikipediaUrl: form.wikipediaUrl || '',
      summary: form.summary.trim() || 'New possibility to explore.', note: form.note.trim() || 'No route notes yet.',
      days: form.days, status, color: 'blue', highlights: [], gallery: [],
      rationale: 'Duration assessment to add.', tradeoffs: 'Trade-offs to add.', season: 'Seasonal notes to add.',
    }
    setIdeas((current) => [...current, idea])
    setDirections((current) => current.map((direction) => ({
      ...direction,
      order: [...direction.order, idea.id],
      plan: { ...direction.plan, [idea.id]: [direction.id === editingDirectionId ? 'maybe' : 'excluded', idea.days] },
    })))
    updateWikipediaSource(idea.id, idea.name, idea.wikipediaUrl)
    setSelectedId(idea.id)
    setDetailOrigin({ view: 'ideas' })
    setActiveView('ideas')
    setIdeaDetailOpen(true)
    setModalOpen(false)
    setEditingId(null)
  }

  function openAddIdea(area = '') {
    setEditingId(null)
    setInitialAddArea(area)
    setModalOpen(true)
  }

  function openEditIdea(id) {
    if (!ideaDetailOpen) setDetailOrigin({ view: 'ideas' })
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
    const currentIdea = editingIdeas.find((idea) => idea.id === editingId)
    const safeDays = Math.max(1, Math.min(14, form.days))
    if (currentIdea && editingDirection) updateDirectionPlan(editingDirection.id, editingId, [currentIdea.status, safeDays])
    setIdeas((current) => current.map((idea) => idea.id === editingId ? {
      ...idea,
      name: form.name.trim(),
      region: form.region.trim() || 'Other idea',
      area: form.area.trim() || form.region.trim() || 'Other ideas',
      mapGroup: form.mapGroup.trim() || form.region.trim() || form.area.trim() || 'Other',
      coordinates: validCoordinates(form) || idea.coordinates,
      wikipediaUrl: form.wikipediaUrl || '',
      days: editingDirectionId === appliedDirectionId ? safeDays : idea.days,
      summary: form.summary.trim() || 'Possibility to explore.',
      note: form.note.trim(),
    } : idea))
    updateWikipediaSource(editingId, form.name.trim(), form.wikipediaUrl || '')
    setModalOpen(false)
    setEditingId(null)
  }

  function validCoordinates(form) {
    if (form.latitude === '' || form.longitude === '' || form.latitude == null || form.longitude == null) return null
    const latitude = Number(form.latitude)
    const longitude = Number(form.longitude)
    return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
      ? [longitude, latitude]
      : null
  }

  function updateWikipediaSource(ideaId, ideaName, href) {
    setBookmarks((current) => {
      const existingIndex = current.findIndex((source) => source.kind === 'wikipedia' && source.ideaIds?.includes(ideaId))
      if (!href) return existingIndex >= 0 ? current.filter((_, index) => index !== existingIndex) : current
      const source = {
        id: existingIndex >= 0 ? current[existingIndex].id : `source-wikipedia-${Date.now()}`,
        kind: 'wikipedia',
        label: `${ideaName} — Wikipedia`,
        href,
        category: 'Research',
        scope: ideaName,
        ideaIds: [ideaId],
        note: 'Coordinate source and starting point for location research.',
        pinned: false,
        lastChecked: '',
      }
      if (existingIndex < 0) return [...current, source]
      return current.map((item, index) => index === existingIndex ? { ...item, ...source } : item)
    })
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
      return { ...direction, plan, order: direction.order.filter((ideaId) => ideaId !== id) }
    }))
    if (selectedId === id) {
      setSelectedId(remaining[Math.min(index, remaining.length - 1)].id)
      setIdeaDetailOpen(false)
    }
    setModalOpen(false)
    setEditingId(null)
  }

  function selectDirection(id) {
    const direction = directions.find((item) => item.id === id)
    if (!direction) return
    setIdeas((current) => ideasForDirection(current, direction))
    setTripLength(direction.days)
    setDirectionId(direction.id)
    setEditingDirectionId(direction.id)
    setAppliedDirectionId(direction.id)
    setIdeaDetailOpen(false)
  }

  function addDirection(name, startMode = 'blank') {
    const duplicate = startMode === 'duplicate'
    const direction = {
      id: `direction-${Date.now()}`,
      name: name.trim(),
      days: tripLength,
      pace: duplicate ? 'Copied direction' : 'Fresh direction',
      transit: duplicate ? 'Updates from the copied scheduled route' : 'No transfers until ideas are included',
      image: ideas.find((idea) => idea.status !== 'excluded' && idea.image)?.image || seedIdeas[0].image,
      summary: duplicate ? 'A saved direction copied from the route currently in use.' : 'A blank direction ready to build from the scenery ideas.',
      pros: ['Independent choices from the other directions', 'Days, statuses and order update independently', 'Can be removed without deleting any idea cards'],
      plan: Object.fromEntries(ideas.map((idea) => [idea.id, duplicate ? [idea.status, idea.days] : ['excluded', idea.days]])),
      order: ideas.map((idea) => idea.id),
      custom: true,
    }
    setDirections((current) => [...current, direction])
    setIdeas((current) => ideasForDirection(current, direction))
    setDirectionId(direction.id)
    setEditingDirectionId(direction.id)
    setAppliedDirectionId(direction.id)
    setActiveView('ideas')
    setIdeaDetailOpen(false)
  }

  function removeDirection(id) {
    const direction = directions.find((item) => item.id === id)
    if (!direction || directions.length === 1) return
    if (!window.confirm(`Remove the direction “${direction.name}”? Your idea cards will not be deleted.`)) return
    const remaining = directions.filter((item) => item.id !== id)
    setDirections(remaining)
    if (directionId === id) setDirectionId(remaining[0].id)
    if (editingDirectionId === id) setEditingDirectionId(remaining[0].id)
    if (appliedDirectionId === id) {
      const replacement = remaining[0]
      setAppliedDirectionId(replacement.id)
      setTripLength(replacement.days)
      setIdeas((current) => ideasForDirection(current, replacement))
    }
  }

  function moveDirection(id, change) {
    setDirections((current) => {
      const index = current.findIndex((direction) => direction.id === id)
      const nextIndex = index + change
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const reordered = [...current]
      const [direction] = reordered.splice(index, 1)
      reordered.splice(nextIndex, 0, direction)
      return reordered
    })
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
    const resetDirections = seedDirections.map((direction) => normaliseDirection(direction, seedIdeas))
    setIdeas(seedIdeas); setBookmarks(seedBookmarks); setDirections(resetDirections); setDirectionId(resetDirections[0].id); setEditingDirectionId(resetDirections[0].id); setAppliedDirectionId(resetDirections[0].id); setTripLength(28); setStartDate('2026-10-26'); setSelectedId(seedIdeas[0].id); setActiveView('compare'); setIdeaDetailOpen(false)
  }

  function exportPlan(fileName) {
    const payload = currentPlanSnapshot()
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = exportFileName(fileName); anchor.click(); URL.revokeObjectURL(url)
  }

  function currentPlanSnapshot() {
    return { version: DATA_VERSION, title: 'Australia holiday 2026', exportedAt: new Date().toISOString(), startDate, endDate, tripLength, ideas, bookmarks, directions, appliedDirectionId }
  }

  async function importPlan(file) {
    try {
      return importPlanPayload(JSON.parse(await file.text()), file.name)
    } catch (error) {
      return { message: error instanceof Error ? error.message : 'The plan could not be imported.' }
    }
  }

  function importPlanPayload(payload, sourceName) {
    try {
      const imported = parseImportedPlan(payload)
      if (!window.confirm(`Replace the plan saved in this browser with “${sourceName}”?`)) return { message: 'Import cancelled.' }
      setIdeas(imported.ideas)
      setBookmarks(imported.bookmarks)
      setDirections(imported.directions)
      setAppliedDirectionId(imported.appliedDirectionId)
      setDirectionId(imported.appliedDirectionId)
      setEditingDirectionId(imported.appliedDirectionId)
      setTripLength(imported.tripLength)
      setStartDate(imported.startDate)
      setSelectedId(imported.ideas.find((idea) => idea.status === 'included')?.id || imported.ideas[0].id)
      setActiveView('compare')
      setIdeaDetailOpen(false)
      return { message: `Opened “${sourceName}”. This browser now contains that plan.` }
    } catch (error) {
      return { message: error instanceof Error ? error.message : 'The plan could not be imported.' }
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="icon-button menu-button" aria-label="Open menu"><Menu size={21} /></button>
        <div className="brand">Drift <span>— Australia 2026</span></div>
        <nav className="primary-nav" aria-label="Planner sections">
          <button type="button" className={activeView === 'compare' ? 'active' : ''} onClick={() => { setActiveView('compare'); setIdeaDetailOpen(false); setMobileSettingsOpen(false) }}><Sparkles size={15} /> Compare</button>
          <button type="button" className={activeView === 'route' ? 'active' : ''} onClick={() => { setActiveView('route'); setIdeaDetailOpen(false); setMobileSettingsOpen(false) }}><RouteIcon size={15} /> Route</button>
          <button type="button" className={activeView === 'ideas' ? 'active' : ''} onClick={() => { setActiveView('ideas'); setIdeaDetailOpen(false); setMobileSettingsOpen(false) }}><Lightbulb className="ideas-nav-icon" size={15} /> Ideas</button>
        </nav>
        <button type="button" className="mobile-export-button" aria-label="Import or export plan" title="Import or export a plan" onClick={() => setTransferOpen(true)}><Download size={17} /></button>
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
        <button type="button" className="export-button" onClick={() => setTransferOpen(true)}><Download size={16} /> Export / Import</button>
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
              <button type="button" className="primary" onClick={() => { setTransferOpen(true); setMobileSettingsOpen(false) }}><Download size={14} /> Export / Import</button>
            </div>
          </section>
        )}
      </header>

      <main className={`workspace view-${activeView} ${ideaDetailOpen ? 'idea-detail-open' : ''}`}>
        <IdeaPanel ideas={editingIdeas} selectedId={selectedId} scheduleById={editingSchedule.byId} onSelect={(id) => selectIdea(id, true)} onStatus={updateStatus} onDays={updateDays} onAdd={openAddIdea} onReorder={(sourceId, targetId, area) => reorderDirection(editingDirection.id, sourceId, targetId, area)} onEdit={openEditIdea} onDelete={deleteIdea} directions={directions} editingDirection={editingDirection} onDirectionChange={(id) => { setEditingDirectionId(id); setIdeaDetailOpen(false) }} onDirectionDaysChange={(days) => setDirectionLength(editingDirection.id, days)} />
        <div className="planning-column">
          {activeView === 'ideas' && ideaDetailOpen && <IdeaDetail idea={selectedIdea} scheduleEntry={editingSchedule.byId.get(selectedIdea.id)} sources={bookmarks} direction={editingDirection} directions={directions} onDirectionChange={(id) => { setEditingDirectionId(id); setIdeaDetailOpen(false) }} onDirectionDaysChange={(days) => setDirectionLength(editingDirection.id, days)} onBack={closeIdeaDetail} onStatus={updateStatus} onUpdateField={updateIdeaField} onAddImage={addImage} onRemoveImage={removeImage} onMoveImage={moveImage} onSetCover={setCover} onEdit={openEditIdea} onDelete={deleteIdea} />}
          {activeView === 'compare' && <ComparePanel directions={directions} ideas={previewIdeas} activeId={directionId} onSelect={selectDirection} onAdd={addDirection} onRemove={removeDirection} onMove={moveDirection} onCoverChange={setDirectionCover} />}
        </div>
        <MapPanel ideas={activeView === 'compare' ? previewIdeas : ideas} selectedIdea={selectedIdea} onSelect={(id) => selectIdea(id, true)} routeMode={activeView === 'route'} schedule={activeView === 'compare' ? previewSchedule : appliedSchedule} sources={bookmarks} onAddSource={addSource} onDeleteSource={(id) => setBookmarks((current) => current.filter((source) => source.id !== id))} onMoveSource={moveSource} onCheckedSource={(id) => setBookmarks((current) => current.map((source) => source.id === id ? { ...source, lastChecked: dateToInput(new Date()) } : source))} onTogglePin={(id) => setBookmarks((current) => current.map((source) => source.id === id ? { ...source, pinned: !source.pinned } : source))} />
      </main>
      {modalOpen && <AddIdeaModal idea={ideas.find((idea) => idea.id === editingId)} areas={areaOptions} initialArea={initialAddArea} onClose={() => { setModalOpen(false); setEditingId(null); setInitialAddArea('') }} onSave={saveIdea} />}
      {transferOpen && <PlanTransferModal onClose={() => setTransferOpen(false)} onExport={exportPlan} onImport={importPlan} onImportPayload={importPlanPayload} plan={currentPlanSnapshot()} />}
    </div>
  )
}
