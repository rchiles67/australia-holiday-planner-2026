import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Clipboard, ExternalLink, ImagePlus, Link, Pencil, Star, Trash2, Upload } from 'lucide-react'

function readAndResizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const image = new Image()
      image.onerror = reject
      image.onload = () => {
        const maximum = 1600
        const scale = Math.min(1, maximum / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function IdeaDetail({ idea, sources, onUpdateField, onAddImage, onRemoveImage, onMoveImage, onSetCover, onEdit, onDelete }) {
  const [activeImageId, setActiveImageId] = useState(idea.gallery?.[0]?.id || null)
  const [message, setMessage] = useState('')
  const fileInput = useRef(null)
  const gallery = idea.gallery || []

  useEffect(() => {
    setActiveImageId(idea.coverImageId || idea.gallery?.[0]?.id || null)
    setMessage('')
  }, [idea.id, idea.coverImageId, idea.gallery])

  const activeIndex = Math.max(0, gallery.findIndex((image) => image.id === activeImageId))
  const activeImage = gallery[activeIndex]
  const locationSources = useMemo(() => sources.filter((source) => source.ideaIds?.includes(idea.id)), [sources, idea.id])

  async function addFiles(files, origin = 'Uploaded from this device') {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    for (const file of imageFiles) {
      try {
        const src = await readAndResizeImage(file)
        const image = {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          src,
          caption: file.name.replace(/\.[^.]+$/, ''),
          credit: 'Personal image',
          license: origin,
          sourceUrl: '',
          local: true,
        }
        onAddImage(idea.id, image)
        setActiveImageId(image.id)
        setMessage('Added to this browser. Ask Codex to publish it when you want it shared.')
      } catch {
        setMessage('That image could not be added.')
      }
    }
  }

  useEffect(() => {
    function paste(event) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      const files = Array.from(event.clipboardData?.files || [])
      if (files.length) addFiles(files, 'Pasted from clipboard')
    }
    window.addEventListener('paste', paste)
    return () => window.removeEventListener('paste', paste)
  })

  async function pasteFromClipboard() {
    if (!navigator.clipboard?.read) {
      setMessage('Press Ctrl+V while this page is focused to paste an image.')
      return
    }
    try {
      const items = await navigator.clipboard.read()
      const files = []
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith('image/'))
        if (imageType) files.push(await item.getType(imageType))
      }
      if (!files.length) throw new Error('No image')
      await addFiles(files, 'Pasted from clipboard')
    } catch {
      setMessage('Clipboard access was unavailable. Press Ctrl+V here, or use Upload.')
    }
  }

  function addImageUrl() {
    const src = window.prompt('Direct image URL')?.trim()
    if (!src) return
    const caption = window.prompt('Caption for this image')?.trim() || 'Added image'
    const sourceUrl = window.prompt('Source / attribution page URL')?.trim() || ''
    const credit = window.prompt('Photographer or creator')?.trim() || 'Credit to be confirmed'
    const license = window.prompt('Licence (for example CC BY-SA 4.0)')?.trim() || 'Licence to be confirmed'
    const image = { id: `url-${Date.now()}`, src, caption, sourceUrl, credit, license }
    onAddImage(idea.id, image)
    setActiveImageId(image.id)
  }

  function stepImage(change) {
    if (!gallery.length) return
    const next = (activeIndex + change + gallery.length) % gallery.length
    setActiveImageId(gallery[next].id)
  }

  return (
    <section className="idea-detail-panel">
      <header className="idea-detail-heading">
        <div>
          <span>{idea.region}</span>
          <h2>{idea.name}</h2>
          <p>{idea.summary}</p>
        </div>
        <div className="idea-detail-actions">
          <div className={`detail-status status-${idea.status}`}>{idea.status}</div>
          <button type="button" onClick={() => onEdit(idea.id)}><Pencil size={13} /> Edit idea</button>
          <button type="button" className="danger" onClick={() => onDelete(idea.id)}><Trash2 size={13} /> Delete</button>
        </div>
      </header>

      <div className="gallery-shell">
        {activeImage ? (
          <>
            <div className="gallery-hero">
              <img src={activeImage.src} alt={activeImage.caption || idea.name} />
              {gallery.length > 1 && (
                <>
                  <button type="button" className="gallery-prev" onClick={() => stepImage(-1)} aria-label="Previous photo"><ArrowLeft size={18} /></button>
                  <button type="button" className="gallery-next" onClick={() => stepImage(1)} aria-label="Next photo"><ArrowRight size={18} /></button>
                </>
              )}
              <div className="gallery-credit">
                <strong>{activeImage.caption}</strong>
                <span>{activeImage.credit} · {activeImage.license}</span>
                {activeImage.sourceUrl && <a href={activeImage.sourceUrl} target="_blank" rel="noreferrer">Source <ExternalLink size={11} /></a>}
              </div>
            </div>
            <div className="gallery-thumbs">
              {gallery.map((image, index) => (
                <button key={image.id} type="button" className={image.id === activeImage.id ? 'active' : ''} onClick={() => setActiveImageId(image.id)}>
                  <img src={image.src} alt={image.caption || `Photo ${index + 1}`} />
                </button>
              ))}
            </div>
            <div className="gallery-actions">
              <button type="button" onClick={() => onMoveImage(idea.id, activeImage.id, -1)} disabled={activeIndex === 0}><ArrowLeft size={14} /> Move</button>
              <button type="button" onClick={() => onMoveImage(idea.id, activeImage.id, 1)} disabled={activeIndex === gallery.length - 1}>Move <ArrowRight size={14} /></button>
              <button type="button" onClick={() => onSetCover(idea.id, activeImage.id)}><Star size={14} /> Use as cover</button>
              <button type="button" className="danger" onClick={() => onRemoveImage(idea.id, activeImage.id)}><Trash2 size={14} /> Remove</button>
            </div>
          </>
        ) : (
          <div className="gallery-empty"><ImagePlus size={28} /><strong>No photographs yet</strong><span>Add a licensed web image or one of your own.</span></div>
        )}
        <div className="gallery-add">
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(event) => addFiles(event.target.files)} />
          <button type="button" onClick={() => fileInput.current?.click()}><Upload size={14} /> Upload</button>
          <button type="button" onClick={pasteFromClipboard}><Clipboard size={14} /> Paste</button>
          <button type="button" onClick={addImageUrl}><Link size={14} /> Add URL</button>
          <small>{message || 'Personal additions save in this browser until Codex publishes an update.'}</small>
        </div>
      </div>

      <div className="idea-detail-grid">
        <section>
          <span className="section-label">Why it earns a place</span>
          <ul className="highlight-list">{idea.highlights?.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
        </section>
        <section>
          <span className="section-label">Duration logic</span>
          <p>{idea.rationale || 'Duration assessment to add.'}</p>
        </section>
        <section>
          <span className="section-label">Trade-offs</span>
          <p>{idea.tradeoffs || 'Trade-offs to add.'}</p>
        </section>
        <section>
          <span className="section-label">Late Oct / November</span>
          <p>{idea.season || 'Seasonal notes to add.'}</p>
        </section>
      </div>

      <section className="commentary-editor">
        <label htmlFor={`commentary-${idea.id}`}>Planner commentary</label>
        <textarea id={`commentary-${idea.id}`} value={idea.note || ''} onChange={(event) => onUpdateField(idea.id, 'note', event.target.value)} />
        <small>Planner judgement, based on route shape and the research listed below — editable by you.</small>
      </section>

      <section className="location-sources">
        <div>
          <span className="section-label">Sources for this idea</span>
          <p>Replicated from the master Sources & live checks list.</p>
        </div>
        {locationSources.length ? locationSources.map((source) => (
          <a key={source.id} href={source.href} target="_blank" rel="noreferrer">
            <span><strong>{source.label}</strong><small>{source.category} · {source.scope}</small></span>
            <ExternalLink size={14} />
          </a>
        )) : <p className="empty-copy">No location-specific sources yet.</p>}
      </section>
    </section>
  )
}
