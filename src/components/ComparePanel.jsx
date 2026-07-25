import { ArrowRight, Check, Clock3, Gauge } from 'lucide-react'

export default function ComparePanel({ scenarios, activeId, onPreview, onApply }) {
  return (
    <section className="compare-panel">
      <div className="compare-heading">
        <div>
          <h2>Compare directions</h2>
          <p>Apply one as a starting point. You can keep editing every detail afterwards.</p>
        </div>
      </div>

      <div className="scenario-tabs" role="tablist" aria-label="Trip scenarios">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            role="tab"
            aria-selected={activeId === scenario.id}
            className={activeId === scenario.id ? 'active' : ''}
            onClick={() => onPreview(scenario.id)}
          >
            <span>{scenario.name}</span>
            <small>{scenario.days} days</small>
          </button>
        ))}
      </div>

      {scenarios.filter((scenario) => scenario.id === activeId).map((scenario) => (
        <div className="scenario-detail" key={scenario.id}>
          <img src={scenario.image} alt="" />
          <div className="scenario-copy">
            <span>Possible direction</span>
            <h3>{scenario.name}</h3>
            <p>{scenario.summary}</p>
            <div className="scenario-stats">
              <span><Clock3 size={16} /><b>{scenario.days} days</b></span>
              <span><Gauge size={16} /><b>{scenario.pace}</b></span>
            </div>
          </div>
          <ul>
            {scenario.pros.map((pro) => <li key={pro}><Check size={15} />{pro}</li>)}
          </ul>
          <div className="scenario-action">
            <span>Transit shape</span>
            <strong>{scenario.transit}</strong>
            <button type="button" onClick={() => onApply(scenario)}>
              Use this scenario <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}
