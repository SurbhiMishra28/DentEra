import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import ToothChart from '../components/ToothChart.jsx'
import { AlertTriangle, MessageCircle, FileText, Pill, Droplet, Plus, Check, XMark } from '../components/Icons.jsx'
import { printRx } from '../utils/printRx.js'
import '../dashboard.css'
import '../dashboard-v13.css'

export default function PatientDetail({ me, id, onChat }) {
  const [chart, setChart] = useState(null)
  const [plans, setPlans] = useState([])
  const [planDetail, setPlanDetail] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [treatments, setTreatments] = useState([])
  const [msg, setMsg] = useState('')
  // v1.3 clinical records
  const [tab, setTab] = useState('perio')
  const [perio, setPerio] = useState(null)
  const [perioTooth, setPerioTooth] = useState('16')
  const [sites, setSites] = useState({})
  const [docs, setDocs] = useState([])
  const [docForm, setDocForm] = useState({ file: null, kind: 'xray', tooth_fdi: '' })
  const [rxs, setRxs] = useState([])
  const [rxForm, setRxForm] = useState({ diagnosis: '', advice: '', items: [{ medicine: '', dose: '', frequency: '', days: '' }] })
  const [busy, setBusy] = useState(false)

  async function load() {
    const [c, pl, inv, tr] = await Promise.all([
      api.get(`/api/chart/${id}`), api.get(`/api/plans?patient_id=${id}`),
      api.get('/api/invoices'), api.get('/api/treatments')])
    setChart(c.data.data || null)
    setPlans(pl.data.data || [])
    setInvoices((inv.data.data || []).filter(i => i.patient_id === id))
    setTreatments(tr.data.data || [])
  }

  async function loadV13() {
    const [p, d, r] = await Promise.all([
      api.get(`/api/chart/${id}/perio`), api.get(`/api/patients/${id}/documents`), api.get(`/api/patients/${id}/prescriptions`)])
    setPerio(p.data.data || null)
    setDocs(d.data.data || [])
    setRxs(r.data.data || [])
  }

  useEffect(() => { load(); loadV13() /* eslint-disable-line */ }, [id])

  useEffect(() => { // preload the panel with the last recorded values for the chosen tooth
    const t = perio?.byTooth?.[perioTooth]
    if (!t) { setSites({}); return }
    const next = {}
    for (const [site, m] of Object.entries(t.sites || {}))
      next[site] = { pocket_depth: m.pocket_depth, bleeding: !!m.bleeding, recession: m.recession }
    setSites(next)
  }, [perio, perioTooth])

  async function openPlan(planId) {
    const { data } = await api.get(`/api/plans/${planId}`)
    setPlanDetail(data.data || null)
  }
  async function doItem(planId, itemId, status) {
    const { status: code, data } = await api.patch(`/api/plans/${planId}/items/${itemId}`, { status })
    setMsg(code === 200 ? `Item marked ${data.data.status}.` : (data.message || 'Failed.'))
    await load(); if (planDetail) openPlan(planId)
  }
  async function pay(invId, full) {
    const inv = invoices.find(i => i.id === invId)
    const total = inv.amount - inv.discount
    const amount = full ? total : (inv.paid_amount || 0) + Math.round((total - (inv.paid_amount || 0)) / 2)
    const { data } = await api.patch(`/api/invoices/${invId}`, { paid_amount: amount })
    setMsg(data.data ? `Invoice #${invId} is now ${data.data.status}.` : (data.message || 'Failed.'))
    await load()
  }

  // ---------- perio ----------
  async function savePerio(e) {
    e.preventDefault(); setMsg('')
    const rows = Object.entries(sites).map(([site, v]) => ({ site: +site, ...v }))
      .filter(r => Number.isFinite(+r.pocket_depth))
    if (!rows.length) { setMsg('Enter at least one pocket depth.'); return }
    const { status, data } = await api.post(`/api/chart/${id}/perio`, { tooth_fdi: perioTooth, sites: rows })
    if (status === 201) { setMsg(`Tooth ${perioTooth} measured — ${rows.length} site(s) saved.`); loadV13() }
    else setMsg(data.message || 'Could not save the periodontal chart.')
  }

  // ---------- documents ----------
  async function uploadDoc(e) {
    e.preventDefault(); setMsg('')
    const file = docForm.file
    if (!file) { setMsg('Choose a file first (JPG, PNG, WEBP, GIF or PDF, up to 6 MB).'); return }
    if (file.size > 6 * 1024 * 1024) { setMsg('That file is larger than 6 MB.'); return }
    setBusy(true)
    const b64 = await new Promise(res => {
      const fr = new FileReader(); fr.onload = () => res(String(fr.result || '')); fr.readAsDataURL(file)
    })
    const { status, data } = await api.post('/api/documents', {
      patient_id: id, kind: docForm.kind, tooth_fdi: docForm.tooth_fdi || undefined,
      filename: file.name, mime: file.type, data: b64 })
    setBusy(false)
    if (status === 201) { setMsg(`Uploaded ${file.name}.`); setDocForm({ file: null, kind: 'xray', tooth_fdi: '' }); loadV13() }
    else setMsg(data.message || 'Upload failed.')
  }

  async function deleteDoc(docId) {
    const { status } = await api.del(`/api/documents/${docId}`)
    setMsg(status === 200 ? 'File deleted.' : 'Could not delete the file.')
    if (status === 200) loadV13()
  }

  // ---------- prescriptions ----------
  async function saveRx(e) {
    e.preventDefault(); setMsg('')
    const items = rxForm.items.filter(it => it.medicine.trim())
    if (!items.length) { setMsg('Add at least one medicine.'); return }
    const { status, data } = await api.post('/api/prescriptions', { patient_id: id, diagnosis: rxForm.diagnosis, advice: rxForm.advice, items })
    if (status === 201) {
      setMsg('Prescription saved.')
      setRxForm({ diagnosis: '', advice: '', items: [{ medicine: '', dose: '', frequency: '', days: '' }] })
      loadV13()
    } else setMsg(data.message || 'Could not save the prescription.')
  }

  async function printOne(rxId) {
    const { data } = await api.get(`/api/prescriptions/${rxId}`)
    if (data && data.data) printRx(data.data)
    else setMsg('Could not load the prescription.')
  }

  if (!chart) return <div className="view center">Loading…</div>
  const p = chart.patient
  const isDentist = me.role === 'dentist'
  const perioTeeth = Object.keys(perio?.byTooth || {}).sort()
  const currentTooth = perio?.byTooth?.[perioTooth]
  const pickSite = s => sites[s] || { pocket_depth: '', bleeding: false, recession: 0 }
  const setSite = (s, patch) => setSites(prev => ({ ...prev, [s]: { ...pickSite(s), ...patch } }))

  return (
    <div className="view">
      <div className="topbar">
        <a className="mini linkbtn" href="#/dashboard">← Dashboard</a>
        <span className="who">{p.name} {p.dob ? `· b. ${p.dob}` : ''}</span>
        {p.medical_notes && <span className="pill warnpill"><AlertTriangle size={12} /> {p.medical_notes}</span>}
        <span className="spacer" />
        {isDentist && <button className="mini primary ask-era" onClick={onChat}><MessageCircle size={13} /> Ask Era</button>}
      </div>

      <div className="panel">
        <h3>Dental chart (FDI)</h3>
        <ToothChart patientId={id} chart={{ ...chart, treatments }} onUpdated={() => { load(); loadV13() }} />
      </div>

      {isDentist && (
        <div className="panel">
          <div className="tabs" role="tablist" aria-label="Clinical records">
            {[['perio', 'Periodontal', Droplet], ['files', 'Files', FileText], ['rx', 'Prescriptions', Pill]].map(([tid, label, Icon]) => (
              <button key={tid} type="button" role="tab" aria-selected={tab === tid}
                className={tab === tid ? 'is-active' : ''} onClick={() => setTab(tid)}>
                <span aria-hidden="true"><Icon size={15} /></span> {label}
              </button>
            ))}
          </div>

          {tab === 'perio' && (
            <div className="tabpanel">
              <div className="panelhead">
                <div><span className="panel-eyebrow">PERIO</span><h3>Periodontal charting</h3></div>
                <label className="perio-pick">Tooth
                  <input value={perioTooth} onChange={e => setPerioTooth(e.target.value)} placeholder="16" maxLength={2} />
                </label>
              </div>
              {perioTeeth.length > 0 && (
                <p className="muted">Already measured: {perioTeeth.map(t =>
                  <button key={t} className={'mini' + (t === perioTooth ? ' is-on' : '')} onClick={() => setPerioTooth(t)} style={{ marginRight: 4 }}>{t}</button>)}</p>
              )}
              <form className="perioform" onSubmit={savePerio}>
                <div className="periogrid">
                  {[1, 2, 3, 4, 5, 6].map(s => (
                    <label key={s} className="periocell">
                      <span>Site {s}</span>
                      <input type="number" min="0" max="15" placeholder="pd mm"
                        value={pickSite(s).pocket_depth}
                        onChange={e => setSite(s, { pocket_depth: e.target.value })} />
                      <label className="periocheck">
                        <input type="checkbox" checked={!!pickSite(s).bleeding}
                          onChange={e => setSite(s, { bleeding: e.target.checked })} /> bleeding
                      </label>
                    </label>
                  ))}
                </div>
                <div className="rowgap">
                  <button type="submit" className="btn"><Check size={15} /> Save measurements</button>
                  <span className="muted">Pocket depth 4 mm+ = moderate, 5 mm+ = severe — recorded per tooth visit.</span>
                </div>
              </form>
              {currentTooth && (
                <p className="muted">Tooth {perioTooth}: max pocket <b>{currentTooth.max_pd} mm</b> ({currentTooth.health}) ·
                  average <b>{currentTooth.avg_pd} mm</b> · bleeding on <b>{currentTooth.bleeding}</b> site(s) · measured {currentTooth.visit_date}</p>
              )}
            </div>
          )}

          {tab === 'files' && (
            <div className="tabpanel">
              <h3>Files</h3>
              <form className="rowForm dash-form" onSubmit={uploadDoc} aria-label="Upload a file">
                <div className="grid3">
                  <label>Kind
                    <select value={docForm.kind} onChange={e => setDocForm({ ...docForm, kind: e.target.value })}>
                      <option value="xray">X-ray</option><option value="photo">Photo</option>
                      <option value="report">Report</option><option value="consent">Consent</option><option value="other">Other</option>
                    </select>
                  </label>
                  <label>Tooth (optional) <input value={docForm.tooth_fdi} onChange={e => setDocForm({ ...docForm, tooth_fdi: e.target.value })} placeholder="e.g. 36" maxLength={2} /></label>
                  <label>File <input type="file" accept="image/*,.pdf" onChange={e => setDocForm({ ...docForm, file: e.target.files?.[0] || null })} required /></label>
                </div>
                <button type="submit" className="dash-cta-btn" disabled={busy}><Plus size={15} /> {busy ? 'Uploading…' : 'Upload'}</button>
              </form>
              <ul className="list">
                {docs.map(d => (
                  <li key={d.id} className="invrow">
                    <span>
                      <FileText size={14} /> <b>{d.filename}</b>
                      <span className="muted"> · {d.kind}{d.tooth_fdi ? ` · tooth ${d.tooth_fdi}` : ''} · {(d.bytes / 1024).toFixed(0)} KB · {(d.created_at || '').replace('T', ' ').slice(0, 16)}</span>
                    </span>
                    <span className="rowgap">
                      <a className="mini" href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer">open</a>
                      <button className="mini mini--danger" onClick={() => deleteDoc(d.id)}><XMark size={13} /></button>
                    </span>
                  </li>
                ))}
                {docs.length === 0 && <p className="empty"><FileText size={20} /> No files yet — X-rays and reports show up here.</p>}
              </ul>
            </div>
          )}

          {tab === 'rx' && (
            <div className="tabpanel">
              <h3>Prescriptions</h3>
              <form className="rowForm dash-form" onSubmit={saveRx} aria-label="Write a prescription">
                <div className="grid3">
                  <label>Diagnosis <input value={rxForm.diagnosis} onChange={e => setRxForm({ ...rxForm, diagnosis: e.target.value })} placeholder="e.g. Acute pulpitis 36" /></label>
                  <label className="wide">Advice <input value={rxForm.advice} onChange={e => setRxForm({ ...rxForm, advice: e.target.value })} placeholder="e.g. Warm salt water rinses" /></label>
                </div>
                {rxForm.items.map((it, i) => (
                  <div key={i} className="grid3">
                    <label>Medicine <input value={it.medicine} onChange={e => setRxForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, medicine: e.target.value } : x) }))} placeholder="Amoxycillin 500" /></label>
                    <label>Dose <input value={it.dose} onChange={e => setRxForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, dose: e.target.value } : x) }))} placeholder="1 cap" /></label>
                    <label>Frequency <input value={it.frequency} onChange={e => setRxForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, frequency: e.target.value } : x) }))} placeholder="3x/day" /></label>
                    <label>Days <input type="number" min="1" value={it.days} onChange={e => setRxForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, days: e.target.value } : x) }))} placeholder="5" /></label>
                  </div>
                ))}
                <div className="rowgap">
                  <button type="submit" className="dash-cta-btn"><Check size={15} /> Save prescription</button>
                  <button type="button" className="mini" onClick={() => setRxForm(f => ({ ...f, items: [...f.items, { medicine: '', dose: '', frequency: '', days: '' }] }))}><Plus size={14} /> Add another</button>
                </div>
              </form>
              <ul className="list">
                {rxs.map(r => (
                  <li key={r.id} className="invrow">
                    <span>
                      <b>#{r.id}</b> {r.diagnosis || 'Prescription'}
                      <span className="muted"> · {(r.created_at || '').replace('T', ' ').slice(0, 16)}{r.dentist_name ? ` · ${r.dentist_name}` : ''}</span>
                    </span>
                    <button className="mini" onClick={() => printOne(r.id)}>Print</button>
                  </li>
                ))}
                {rxs.length === 0 && <p className="empty"><Pill size={20} /> No prescriptions yet — write one and print it for the patient.</p>}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid2">
        <section className="panel">
          <h3>Treatment plans</h3>
          {plans.length === 0 && <p className="empty">No plans yet.</p>}
          <ul className="list">
            {plans.map(pl => (
              <li key={pl.id}>
                <a href="#" onClick={e => { e.preventDefault(); openPlan(pl.id) }}><b>#{pl.id} {pl.title}</b></a>
                <span className="muted"> · {pl.status} · est ₹{pl.total_estimate}</span>
              </li>
            ))}
          </ul>
          {planDetail && (
            <div className="toothpanel">
              <h4>#{planDetail.plan.id} {planDetail.plan.title}</h4>
              <ul className="list">
                {planDetail.items.map(it => (
                  <li key={it.id}>
                    Visit {it.visit_no}: {it.treatment_name || 'Item'}{it.tooth_fdi ? ` (tooth ${it.tooth_fdi})` : ''} · ₹{it.cost} · <b>{it.status}</b>
                    {isDentist && it.status === 'planned' && (
                      <span className="rowgap"> <button className="mini" onClick={() => doItem(planDetail.plan.id, it.id, 'done')}>mark done</button>
                      <button className="mini" onClick={() => doItem(planDetail.plan.id, it.id, 'cancelled')}>cancel</button></span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="panel">
          <h3>Invoices</h3>
          {invoices.length === 0 && <p className="empty">No invoices.</p>}
          <ul className="list">
            {invoices.map(i => (
              <li key={i.id}>
                <b>#{i.id}</b> ₹{i.amount}{i.discount ? ` − ₹${i.discount}` : ''} · paid ₹{i.paid_amount} · <b>{i.status}</b>
                {i.status !== 'paid' && me.role !== 'reception' && (
                  <span className="rowgap"> <button className="mini" onClick={() => pay(i.id, true)}>mark fully paid</button>
                  {i.status === 'unpaid' && <button className="mini" onClick={() => pay(i.id, false)}>half payment</button>}</span>
                )}
              </li>
            ))}
          </ul>
          {msg && <p className="authmsg ok">{msg}</p>}
        </section>
      </div>
    </div>
  )
}
