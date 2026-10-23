import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowRight, Bell, CheckCircle2, ChevronDown, CircleHelp, ClipboardList,
  Clock3, GraduationCap, LayoutDashboard, LogOut, Menu, Plus, ShieldCheck,
  Sparkles, Wrench, X, Zap, Droplets, Wifi, Building2, Search
} from 'lucide-react'

const categories = ['Maintenance', 'Cleanliness', 'Electricity', 'Water', 'Wi-Fi', 'Classroom', 'Other']
const statuses = ['Submitted', 'In Progress', 'Resolved', 'Rejected']

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
  return data
}

function statusClass(status) {
  return status.toLowerCase().replaceAll(' ', '-')
}
function dateText(date) {
  if (!date) return 'Just now'
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || 'S'
}

function App() {
  const [user, setUser] = useState(null)
  const [issues, setIssues] = useState([])
  const [page, setPage] = useState('overview')
  const [authMode, setAuthMode] = useState('login')
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [issueForm, setIssueForm] = useState({ title: '', category: 'Maintenance', location: '', description: '' })
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [statusEdits, setStatusEdits] = useState({})

  const isAdmin = user?.role === 'ADMIN'
  const visibleIssues = useMemo(() => issues.filter(i =>
    [i.title, i.category, i.location, i.status, i.studentName, String(i.id)]
      .join(' ').toLowerCase().includes(search.toLowerCase())
  ), [issues, search])
  const counts = useMemo(() => ({
    total: issues.length,
    submitted: issues.filter(i => i.status === 'Submitted').length,
    progress: issues.filter(i => i.status === 'In Progress').length,
    resolved: issues.filter(i => i.status === 'Resolved').length,
  }), [issues])

  async function refreshIssues() {
    const data = await api('/issues')
    setIssues(data.issues || [])
  }
  useEffect(() => {
    api('/auth/me').then(async data => {
      if (data.user) {
        setUser(data.user)
        const result = await api('/issues')
        setIssues(result.issues || [])
      }
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  function go(next) {
    setPage(next)
    setMobileMenu(false)
    setError('')
    setNotice('')
    if (next === 'new') setIssueForm({ title: '', category: 'Maintenance', location: '', description: '' })
  }

  async function submitAuth(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const route = authMode === 'login' ? '/auth/login' : '/auth/register'
      const data = await api(route, { method: 'POST', body: JSON.stringify(authForm) })
      setUser(data.user)
      setShowAuth(false)
      setPage('overview')
      setAuthForm({ name: '', email: '', password: '' })
      await refreshIssues()
      setNotice(authMode === 'login' ? 'Welcome back!' : 'Your account is ready. Welcome to FixMyCampus!')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function logout() {
    try { await api('/auth/logout', { method: 'POST', body: '{}' }) } catch {}
    setUser(null); setIssues([]); setPage('overview'); setNotice('You have signed out.')
  }

  async function submitIssue(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      await api('/issues', { method: 'POST', body: JSON.stringify(issueForm) })
      await refreshIssues()
      setNotice('Issue submitted successfully. You can track its status in My issues.')
      setPage('issues')
      setIssueForm({ title: '', category: 'Maintenance', location: '', description: '' })
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function updateIssue(issue) {
    const edit = statusEdits[issue.id] || { status: issue.status, adminNote: issue.adminNote || '' }
    setBusy(true); setError(''); setNotice('')
    try {
      await api(`/issues/${issue.id}/status`, { method: 'PATCH', body: JSON.stringify(edit) })
      await refreshIssues()
      setNotice(`Issue #${issue.id} updated.`)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  if (loading) return <div className="loading-screen"><div className="brand-mark"><GraduationCap size={27}/></div><span>Getting your campus ready…</span></div>

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><GraduationCap size={25}/></div>
          <div><strong>FixMyCampus</strong><span>Campus care, connected</span></div>
          <button className="icon-btn mobile-close" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={19}/></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav">
          <button className={page === 'overview' ? 'nav-item active' : 'nav-item'} onClick={() => go('overview')}><LayoutDashboard size={18}/> Overview</button>
          <button className={page === 'issues' ? 'nav-item active' : 'nav-item'} onClick={() => go('issues')}><ClipboardList size={18}/>{isAdmin ? 'All issues' : 'My issues'}<span className="nav-count">{issues.length}</span></button>
          <button className={page === 'new' ? 'nav-item active' : 'nav-item'} onClick={() => user ? go('new') : (setAuthMode('login'), setShowAuth(true))}><Plus size={18}/> Report an issue</button>
          {isAdmin && <div className="admin-label"><ShieldCheck size={15}/> ADMIN TOOLS</div>}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><CircleHelp size={18}/></div><strong>Need a hand?</strong><p>Every report helps make campus life better.</p><button onClick={() => { setNotice('Tip: choose Report an issue, describe the problem and add its location.'); setError('') }}>How it works <ArrowRight size={14}/></button></div>
          <div className="sidebar-footer"><span className="online-dot"/> Local development workspace <span className="version">v1.0</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-btn menu-trigger" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={21}/></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{page === 'overview' ? 'Overview' : page === 'issues' ? (isAdmin ? 'All issues' : 'My issues') : page === 'new' ? 'Report an issue' : 'Issue details'}</strong></div>
          <div className="top-actions">
            <div className="local-pill"><span className="online-dot"/> Local workspace</div>
            {user ? <>
              <button className="icon-btn notification-btn" title="Notifications" onClick={() => setNotice('You are all caught up.')}><Bell size={18}/></button>
              <div className="user-menu"><div className="avatar">{initials(user.name)}</div><div className="user-label"><strong>{user.name}</strong><span>{isAdmin ? 'Administrator' : 'Student'}</span></div><button className="icon-btn" onClick={logout} title="Sign out"><LogOut size={17}/></button></div>
            </> : <button className="btn btn-dark btn-small" onClick={() => { setAuthMode('login'); setShowAuth(true) }}>Sign in <ArrowRight size={15}/></button>}
          </div>
        </header>

        <div className="content-wrap">
          {error && <div className="alert alert-error"><X size={17}/><span>{error}</span><button onClick={() => setError('')}><X size={15}/></button></div>}
          {notice && <div className="alert alert-success"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={() => setNotice('')}><X size={15}/></button></div>}

          {page === 'overview' && <Overview user={user} issues={issues} counts={counts} isAdmin={isAdmin} onReport={() => user ? go('new') : (setAuthMode('login'), setShowAuth(true))} onIssues={() => go('issues')} onSelect={setSelectedIssue}/>}
          {page === 'issues' && <section className="page-section">
            <div className="page-heading"><div><div className="eyebrow">CAMPUS REQUESTS</div><h1>{isAdmin ? 'All issues' : 'My issues'}<span className="heading-count">{issues.length}</span></h1><p>{isAdmin ? 'Review reports from students and keep everyone updated.' : 'Follow every report from submission to resolution.'}</p></div>{!isAdmin && <button className="btn btn-dark" onClick={() => go('new')}><Plus size={17}/> New report</button>}</div>
            <div className="toolbar"><div className="searchbox"><Search size={17}/><input placeholder="Search by title, location, status…" value={search} onChange={e => setSearch(e.target.value)}/></div><span className="muted small">{visibleIssues.length} result{visibleIssues.length === 1 ? '' : 's'}</span></div>
            <IssueTable issues={visibleIssues} isAdmin={isAdmin} statusEdits={statusEdits} setStatusEdits={setStatusEdits} updateIssue={updateIssue} busy={busy} onSelect={setSelectedIssue}/>
            {!visibleIssues.length && <EmptyState isAdmin={isAdmin} onReport={() => go('new')}/>}
          </section>}
          {page === 'new' && <NewIssue form={issueForm} setForm={setIssueForm} onSubmit={submitIssue} busy={busy} onCancel={() => go('overview')} user={user} onSignIn={() => setShowAuth(true)}/>}
        </div>
        <footer className="main-footer"><span>© 2026 FixMyCampus</span><span>Built for a better campus <Sparkles size={13}/></span></footer>
      </main>

      {selectedIssue && <IssueModal issue={selectedIssue} isAdmin={isAdmin} onClose={() => setSelectedIssue(null)}/>}
      {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} onSubmit={submitAuth} onClose={() => setShowAuth(false)} busy={busy}/>}
    </div>
  )
}

function Overview({ user, issues, counts, isAdmin, onReport, onIssues, onSelect }) {
  const latest = issues.slice(0, 4)
  return <section className="page-section">
    <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot"/> YOUR CAMPUS, YOUR VOICE</div><h1>{user ? `Welcome${user.name ? `, ${user.name.split(' ')[0]}` : ''}` : 'A better campus starts here.'}<span className="wave">✳</span></h1><p>{user ? (isAdmin ? 'Here’s what’s happening across campus today.' : 'Your voice matters. Let’s make your campus better, together.') : 'Report a problem. Track the progress. Make a difference.'}</p></div><div className="welcome-art"><div className="art-circle art-circle-one"/><div className="art-circle art-circle-two"/><Building2 className="art-building" size={62}/><Sparkles className="art-spark" size={21}/></div></div>
    {!user && <div className="hero-guest"><div><div className="eyebrow light-eyebrow">CAMPUS CARE PLATFORM</div><h2>Small reports.<br/>Meaningful change.</h2><p>From a broken classroom fan to campus Wi-Fi, help the right people see what needs attention.</p><button className="btn btn-light" onClick={onReport}>Get started <ArrowRight size={16}/></button></div><div className="hero-visual"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-card"><div className="hero-card-top"><span className="mini-icon"><Wrench size={17}/></span><span className="status-badge in-progress">In Progress</span></div><strong>Classroom projector</strong><span className="hero-card-caption">Building B · Room 204</span><div className="progress-line"><span/></div><div className="hero-card-foot"><span>Issue #104</span><span>Updated today</span></div></div><div className="float-check"><CheckCircle2 size={19}/><span>Campus improving</span></div></div></div>}
    {user && <div className="stats-grid">
      <StatCard label={isAdmin ? 'Total reports' : 'Reports submitted'} value={counts.total} note={isAdmin ? 'Across campus' : 'Your reports'} icon={<ClipboardList size={19}/>} tone="green"/>
      <StatCard label="Submitted" value={counts.submitted} note="Awaiting review" icon={<Clock3 size={19}/>} tone="amber"/>
      <StatCard label="In progress" value={counts.progress} note="Being worked on" icon={<Wrench size={19}/>} tone="blue"/>
      <StatCard label="Resolved" value={counts.resolved} note="Marked complete" icon={<CheckCircle2 size={19}/>} tone="purple"/>
    </div>}
    <div className="section-title-row"><div><h2>{user ? 'Recent reports' : 'Everything your campus needs'}</h2><p>{user ? 'The latest updates from your issue list.' : 'One simple place to flag problems and follow progress.'}</p></div>{user && <button className="text-btn" onClick={onIssues}>View all <ArrowRight size={15}/></button>}</div>
    {user ? (latest.length ? <IssueTable issues={latest} isAdmin={isAdmin} compact onSelect={onSelect}/> : <EmptyState isAdmin={isAdmin} onReport={onReport}/>) : <div className="feature-grid">
      <Feature icon={<ClipboardList size={21}/>} number="01" title="Report clearly" text="Share what happened and where it needs attention."/>
      <Feature icon={<Clock3 size={21}/>} number="02" title="Track progress" text="See whether your report is submitted, in progress or resolved."/>
      <Feature icon={<ShieldCheck size={21}/>} number="03" title="Keep everyone in sync" text="Admins can review requests and post status updates."/>
    </div>}
    <div className="bottom-banner"><div className="banner-icon"><Zap size={20}/></div><div><strong>See something that needs fixing?</strong><p>Tell us what’s wrong so the right team can take a look.</p></div><button className="btn btn-dark" onClick={onReport}>Report an issue <ArrowRight size={15}/></button></div>
  </section>
}

function StatCard({ label, value, note, icon, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>
}
function Feature({ icon, number, title, text }) {
  return <div className="feature-card"><div className="feature-top"><div className="feature-icon">{icon}</div><span>{number}</span></div><h3>{title}</h3><p>{text}</p></div>
}
function EmptyState({ isAdmin, onReport }) {
  return <div className="empty-state"><div className="empty-icon"><ClipboardList size={24}/></div><h3>No reports yet</h3><p>{isAdmin ? 'When students submit an issue, it will appear here.' : 'Your submitted issues will show up here so you can track them.'}</p>{!isAdmin && <button className="btn btn-dark" onClick={onReport}><Plus size={16}/> Create your first report</button>}</div>
}
function IssueTable({ issues, isAdmin, compact = false, statusEdits = {}, setStatusEdits = () => {}, updateIssue = () => {}, busy = false, onSelect = () => {} }) {
  if (!issues.length) return null
  return <div className={`table-card ${compact ? 'table-compact' : ''}`}><div className="table-scroll"><table><thead><tr><th>ISSUE</th>{isAdmin && <th>REPORTED BY</th>}<th>LOCATION</th><th>STATUS</th><th>DATE</th>{isAdmin && !compact && <th>ACTION</th>}</tr></thead><tbody>{issues.map(issue => <tr key={issue.id}>
    <td><button className="issue-title-button" onClick={() => onSelect(issue)}><span className="issue-id">#{issue.id}</span><strong>{issue.title}</strong><span className="issue-category">{issue.category}</span></button></td>
    {isAdmin && <td><div className="student-cell"><div className="avatar avatar-small">{initials(issue.studentName)}</div><div><strong>{issue.studentName}</strong><span>{issue.studentEmail}</span></div></div></td>}
    <td><span className="location-cell">{issue.location}</span></td>
    <td><span className={`status-badge ${statusClass(issue.status)}`}><span className="status-dot"/>{issue.status}</span></td>
    <td><span className="date-cell">{dateText(issue.createdAt)}</span></td>
    {isAdmin && !compact && <td><div className="admin-actions"><select value={(statusEdits[issue.id]?.status || issue.status)} onChange={e => setStatusEdits(p => ({ ...p, [issue.id]: { status: e.target.value, adminNote: p[issue.id]?.adminNote ?? issue.adminNote ?? '' } }))}>{statuses.map(s => <option key={s}>{s}</option>)}</select><button className="btn btn-dark btn-xs" disabled={busy} onClick={() => updateIssue(issue)}>Save</button></div><input className="admin-note" placeholder="Optional note to student" value={statusEdits[issue.id]?.adminNote ?? issue.adminNote ?? ''} onChange={e => setStatusEdits(p => ({ ...p, [issue.id]: { status: p[issue.id]?.status || issue.status, adminNote: e.target.value } }))}/></td>}
  </tr>)}</tbody></table></div></div>
}
function NewIssue({ form, setForm, onSubmit, busy, onCancel, user, onSignIn }) {
  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  if (!user) return <div className="form-page"><div className="form-card auth-required"><div className="form-icon"><ShieldCheck size={25}/></div><h1>Sign in to report an issue</h1><p>Your reports are connected to your account, so you can track updates in one place.</p><button className="btn btn-dark" onClick={onSignIn}>Sign in to continue <ArrowRight size={16}/></button></div></div>
  return <div className="form-page"><div className="form-page-heading"><div className="eyebrow">CAMPUS CARE / NEW REPORT</div><h1>Report an issue</h1><p>Give us a few details so the campus team knows where to start.</p></div><form className="form-card issue-form" onSubmit={onSubmit}>
    <div className="form-section-head"><div className="form-icon"><Wrench size={21}/></div><div><h2>Issue details</h2><p>Fields marked with * are required.</p></div></div>
    <label>Issue title <span>*</span><input name="title" maxLength="160" required value={form.title} onChange={change} placeholder="e.g. Broken fan in classroom"/></label>
    <div className="form-two-col"><label>Category <span>*</span><select name="category" value={form.category} onChange={change}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Location <span>*</span><input name="location" maxLength="190" required value={form.location} onChange={change} placeholder="e.g. Block A, Room 203"/></label></div>
    <label>Description <span>*</span><textarea name="description" minLength="10" maxLength="5000" required rows="5" value={form.description} onChange={change} placeholder="Describe the problem and anything that could help the team resolve it…"/><small>At least 10 characters. Please avoid including private information.</small></label>
    <div className="form-actions"><button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button><button disabled={busy} className="btn btn-dark" type="submit">{busy ? 'Submitting…' : 'Submit report'} <ArrowRight size={16}/></button></div>
  </form></div>
}
function AuthModal({ mode, setMode, form, setForm, onSubmit, onClose, busy }) {
  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className="auth-modal"><button className="modal-close icon-btn" onClick={onClose} aria-label="Close"><X size={19}/></button><div className="auth-brand"><div className="brand-mark"><GraduationCap size={25}/></div><span>FixMyCampus</span></div><div className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'JOIN YOUR CAMPUS'}</div><h1>{mode === 'login' ? 'Good to see you.' : 'Let’s make things better.'}</h1><p className="auth-subtitle">{mode === 'login' ? 'Sign in to see your reports and campus updates.' : 'Create an account to report and track campus issues.'}</p><form onSubmit={onSubmit}>
    {mode === 'register' && <label>Full name<input name="name" required minLength="2" maxLength="100" value={form.name} onChange={change} placeholder="Your full name"/></label>}
    <label>Email address<input type="email" name="email" required value={form.email} onChange={change} placeholder="you@college.edu"/></label>
    <label>Password<input type="password" name="password" required minLength="8" value={form.password} onChange={change} placeholder="At least 8 characters"/><small>Use at least 8 characters.</small></label>
    <button className="btn btn-dark auth-submit" disabled={busy} type="submit">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16}/></button>
  </form><div className="auth-switch">{mode === 'login' ? 'New to FixMyCampus?' : 'Already have an account?'} <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create account' : 'Sign in'}</button></div><div className="auth-security"><ShieldCheck size={15}/> Passwords are stored as secure hashes.</div></div></div>
}
function IssueModal({ issue, isAdmin, onClose }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className="detail-modal"><button className="modal-close icon-btn" onClick={onClose} aria-label="Close"><X size={19}/></button><div className="eyebrow">ISSUE DETAILS / #{issue.id}</div><h2>{issue.title}</h2><div className="detail-badges"><span className={`status-badge ${statusClass(issue.status)}`}><span className="status-dot"/>{issue.status}</span><span className="category-chip">{issue.category}</span></div><div className="detail-grid"><div><span>LOCATION</span><strong>{issue.location}</strong></div><div><span>REPORTED ON</span><strong>{dateText(issue.createdAt)}</strong></div>{isAdmin && <div><span>REPORTED BY</span><strong>{issue.studentName} · {issue.studentEmail}</strong></div>}</div><div className="detail-description"><span>DESCRIPTION</span><p>{issue.description}</p></div>{issue.adminNote && <div className="admin-update"><strong>Campus team update</strong><p>{issue.adminNote}</p></div>}<div className="timeline"><div className="timeline-step done"><span><CheckCircle2 size={16}/></span><div><strong>Report submitted</strong><small>{dateText(issue.createdAt)}</small></div></div><div className={`timeline-step ${issue.status !== 'Submitted' ? 'done' : ''}`}><span><Wrench size={15}/></span><div><strong>Team review</strong><small>{issue.status === 'Submitted' ? 'Waiting for review' : 'Status: ' + issue.status}</small></div></div><div className={`timeline-step ${issue.status === 'Resolved' ? 'done' : ''}`}><span><CheckCircle2 size={15}/></span><div><strong>Resolved</strong><small>{issue.status === 'Resolved' ? dateText(issue.updatedAt) : 'Pending completion'}</small></div></div></div><button className="btn btn-outline full-width" onClick={onClose}>Close details</button></div></div>
}

export default App
