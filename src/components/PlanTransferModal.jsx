import { ExternalLink, Download, Upload, X } from 'lucide-react'
import { useState } from 'react'

const SHARED_DRIVE_URL = 'https://drive.google.com/drive/folders/1Pb9k399mOkWK0h4z58DwKvBZANy9Wdoi'

export default function PlanTransferModal({ onClose, onExport, onImport }) {
  const [fileName, setFileName] = useState('2026-Australia-plan.json')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function importFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    const result = await onImport(file)
    setMessage(result.message)
    setBusy(false)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="idea-modal transfer-modal" role="dialog" aria-modal="true" aria-labelledby="transfer-plan-title">
        <div className="modal-heading">
          <div><span>Plan file</span><h2 id="transfer-plan-title">Export or import</h2></div>
          <button type="button" onClick={onClose} aria-label="Close plan transfer"><X size={18} /></button>
        </div>

        <div className="transfer-section">
          <div><strong>Export this plan</strong><p>Choose a useful name for the complete JSON snapshot.</p></div>
          <label>
            File name
            <input type="text" value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="2026-Australia-Richards plan.json" />
          </label>
          <button type="button" className="transfer-primary" onClick={() => { onExport(fileName); setMessage('Plan downloaded. Upload it to the shared Drive folder when you want to pass it on.') }}>
            <Download size={15} /> Download JSON
          </button>
        </div>

        <div className="transfer-section">
          <div><strong>Import a different plan</strong><p>This replaces the plan saved in this browser after validation and confirmation.</p></div>
          <label className="transfer-file-button">
            <Upload size={15} /> {busy ? 'Reading plan…' : 'Choose JSON to import'}
            <input type="file" accept="application/json,.json" onChange={importFile} disabled={busy} />
          </label>
        </div>

        <div className="transfer-drive-note">
          <p>GitHub Pages cannot upload directly into a private Drive account. Download the named file, then add it to <strong>Drift-shared</strong>.</p>
          <a href={SHARED_DRIVE_URL} target="_blank" rel="noreferrer">Open shared Google Drive <ExternalLink size={13} /></a>
        </div>

        {message && <p className="transfer-message" role="status">{message}</p>}
      </section>
    </div>
  )
}
