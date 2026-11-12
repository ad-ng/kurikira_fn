import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, MessageCircle, RefreshCw, Save, Search, UserRound, X } from 'lucide-react';
import { QualificationResults } from './QualificationResults';
import { api, type Campaign, type Lead, type LeadDetail, type LeadPage, type LeadStage } from './api';

const stageLabels: Record<LeadStage, string> = { NEW: 'New', CONTACTED: 'Contacted', CUSTOMER: 'Customer', LOST: 'Lost' };
const date = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kigali', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
const leadName = (lead: Lead) => lead.name || (lead.username ? `@${lead.username}` : 'Instagram contact');
const toDraft = (lead: Lead) => ({ name: lead.name || '', email: lead.email || '', phone: lead.phone || '', notes: lead.notes, stage: lead.stage });

function LeadEditor({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [draft, setDraft] = useState<ReturnType<typeof toDraft> | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);
  const savedLead = useRef<LeadDetail | null>(null);
  const applyLatest = useCallback((item: LeadDetail, preserveDraft = false) => {
    const previous = savedLead.current;
    savedLead.current = item;
    setLead(item);
    setDraft((current) => {
      if (!preserveDraft || !current || !previous) return toDraft(item);
      const baseline = toDraft(previous), incoming = toDraft(item);
      return {
        name: current.name === baseline.name ? incoming.name : current.name,
        email: current.email === baseline.email ? incoming.email : current.email,
        phone: current.phone === baseline.phone ? incoming.phone : current.phone,
        notes: current.notes === baseline.notes ? incoming.notes : current.notes,
        stage: current.stage === baseline.stage ? incoming.stage : current.stage
      };
    });
  }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialogRef.current?.showModal(); document.body.style.overflow = 'hidden';
    const stopEscape = (event: KeyboardEvent) => { if (locked.current && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); } };
    document.addEventListener('keydown', stopEscape, true);
    return () => { dialogRef.current?.close(); document.body.style.overflow = overflow; document.removeEventListener('keydown', stopEscape, true); if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => {
    let cancelled = false; setError('');
    api.lead(id).then((item) => { if (!cancelled) { applyLatest(item); } }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load lead.'); });
    return () => { cancelled = true; };
  }, [id, retry, applyLatest]);
  const questionnaireActive = Boolean(lead?.qualificationSessions?.some((session) => session.state === 'WAITING'));
  useEffect(() => {
    if (!questionnaireActive) return;
    let cancelled = false, refreshing = false;
    const timer = setInterval(() => {
      if (refreshing || locked.current) return;
      refreshing = true;
      api.lead(id).then((item) => { if (!cancelled) applyLatest(item, true); }).catch(() => {}).finally(() => { refreshing = false; });
    }, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [id, questionnaireActive, applyLatest]);
  const dirty = Boolean(lead && draft && JSON.stringify(draft) !== JSON.stringify(toDraft(lead)));
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || locked.current) return;
    locked.current = true; setSaving(true); setError(''); setNotice('');
    try {
      const updated = await api.updateLead(id, { ...draft, name: draft.name.trim() || null, email: draft.email.trim() || null, phone: draft.phone.trim() || null });
      applyLatest(updated); setNotice('Lead updated.'); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save lead.'); }
    finally { locked.current = false; setSaving(false); }
  }
  return <dialog className="users-dialog lead-dialog" ref={dialogRef} aria-labelledby="lead-dialog-title" onCancel={(event) => { event.preventDefault(); if (!locked.current) onClose(); }} onClick={(event) => { if (event.target === event.currentTarget && !locked.current) onClose(); }}><div className="users-editor">
    <button type="button" className="campaign-confirm-close" aria-label="Close lead" disabled={saving} onClick={onClose}><X size={19} /></button><div className="users-editor-icon"><UserRound size={24} /></div><p className="section-kicker">LEAD DETAILS</p><h2 id="lead-dialog-title">{lead ? leadName(lead) : 'Your lead'}</h2>
    {error && <div className="form-error" role="alert"><CircleAlert size={16} />{error}{!lead && <button className="subtle-button" onClick={() => setRetry((value) => value + 1)}>Try again</button>}</div>}
    {!lead && !error && <div className="users-loading"><RefreshCw size={20} className="spin" />Loading lead…</div>}
    {lead && draft && <><div className="lead-identity"><span>{lead.username ? `@${lead.username}` : `Instagram ID ${lead.authorId}`}</span><span>Account: {lead.account.username ? `@${lead.account.username}` : lead.account.id}</span><span>First campaign: {lead.firstCampaignKeyword || 'Unavailable'} · {lead._count.comments} matching comments</span></div>
      <form onSubmit={save}><fieldset disabled={saving} className="lead-fields"><div className="form-grid"><div className="field"><label htmlFor="lead-name">Contact name</label><input id="lead-name" maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Add a name" /></div><div className="field"><label htmlFor="lead-stage">Stage</label><select id="lead-stage" value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value as LeadStage })}>{Object.entries(stageLabels).map(([stage, label]) => <option value={stage} key={stage}>{label}</option>)}</select></div><div className="field"><label htmlFor="lead-email">Email address</label><input id="lead-email" type="email" maxLength={254} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="Optional" /></div><div className="field"><label htmlFor="lead-phone">Phone number</label><input id="lead-phone" type="tel" maxLength={40} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="Optional" /></div><div className="field full"><label htmlFor="lead-notes">Notes</label><textarea id="lead-notes" rows={4} maxLength={5000} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="What are they interested in? What should happen next?" /><small>Only users in your workspace can access these notes.</small></div></div></fieldset>{notice && <div className="form-success" role="status"><CircleCheck size={16} />{notice}</div>}<div className="form-actions"><span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span><button type="submit" className="primary-button" disabled={!dirty || saving}>{saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}Save lead</button></div></form>
      <QualificationResults sessions={lead.qualificationSessions || []} leadId={id} onStopped={async () => { applyLatest(await api.lead(id), true); onSaved(); }} /><section className="lead-history"><p className="section-kicker">RECENT MATCHING COMMENTS</p><h3>Where the conversation started</h3>{lead.comments.map((comment) => <div key={comment.id} className="lead-history-item"><div><span className="campaign-chip">{comment.campaignKeyword || 'Campaign unavailable'}</span><small>{date(comment.createdAt)}</small></div><p>{comment.text}</p><span>{comment.status === 'ACCEPTED' ? 'DM accepted by Meta' : `DM: ${comment.status.toLowerCase()}`}{comment.publicReplyStatus ? ` · Public reply: ${comment.publicReplyStatus.toLowerCase()}` : ''}</span></div>)}{!lead.comments.length && <p className="growth-note">No comment history is available.</p>}<p className="growth-note">Email, phone number, and customer stage are entered by your team; they are not supplied or verified by Instagram.</p></section>
    </>}
  </div></dialog>;
}

export function LeadManagement({ campaigns, campaignId, leadId, refreshKey, onCampaignChange, onOpen, onClose }: { campaigns: Campaign[]; campaignId?: string; leadId?: string; refreshKey: number; onCampaignChange: (id: string) => void; onOpen: (id: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<LeadPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => { setPage(1); }, [campaignId]);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError('');
    const timer = setTimeout(() => { api.leads(search, stage, page, campaignId).then((data) => { if (!cancelled) setResult(data); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load leads.'); }).finally(() => { if (!cancelled) setLoading(false); }); }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, stage, page, campaignId, refreshKey, reload]);
  const allCount = Object.values(result?.stages || {}).reduce((sum, count) => sum + count, 0);
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR CUSTOMER PIPELINE</div><h1>Interest into customers<span className="heading-dot">.</span></h1><p>Keep track of who commented, what they need, and what comes next.</p></div><div className="heading-badge"><UserRound size={17} />{result?.total || 0} {stage || search || campaignId ? 'matching ' : ''}leads</div></div>
    <div className="lead-capture-note"><MessageCircle size={20} /><p><strong>New leads are captured automatically from matching comments.</strong><span>One contact per Instagram account and commenter. Add your own notes and contact details as the conversation develops.</span></p></div>
    <div className="lead-stage-tabs" role="group" aria-label="Filter leads by stage">{[{ value: '', label: 'All leads' }, ...Object.entries(stageLabels).map(([value, label]) => ({ value, label }))].map((item) => <button key={item.value} className={stage === item.value ? 'selected' : ''} onClick={() => { setStage(item.value); setPage(1); }}><span>{item.label}</span><strong>{item.value ? result?.stages[item.value as LeadStage] || 0 : allCount}</strong></button>)}</div>
    {error && <div className="global-error" role="alert"><CircleAlert size={16} />{error}<button onClick={() => setReload((value) => value + 1)}>Try again</button></div>}
    <section className="panel leads-panel" aria-label="Lead management" aria-busy={loading}><div className="lead-toolbar"><div className="search-wrap"><Search size={17} /><input aria-label="Search leads" placeholder="Search name, handle, email, or phone…" value={search} maxLength={100} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div><div className="field"><label className="sr-only" htmlFor="leads-campaign">Filter leads by campaign</label><select id="leads-campaign" value={campaignId || ''} onChange={(event) => { setPage(1); onCampaignChange(event.target.value); }}><option value="">All campaigns</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.keyword} · {campaign.mediaId}</option>)}</select></div></div>
      {loading ? <div className="users-loading" role="status"><RefreshCw size={22} className="spin" />Loading leads…</div> : result?.leads.length ? <><div className="leads-list-heading" aria-hidden="true"><span>CONTACT</span><span>FIRST CAMPAIGN</span><span>STAGE</span><span>LAST COMMENT</span><span /></div><ul className="leads-list">{result.leads.map((lead) => <li key={lead.id}><button className="lead-list-item" onClick={() => onOpen(lead.id)} aria-label={`Open lead ${leadName(lead)}`}><div className="lead-list-contact"><div className="managed-user-avatar">{lead.name?.[0]?.toUpperCase() || lead.username?.[0]?.toUpperCase() || <UserRound size={20} />}</div><div><strong>{leadName(lead)}</strong><small>{lead.name && lead.username ? `@${lead.username}` : `ID ${lead.authorId}`}</small><span>{lead.account.username ? `via @${lead.account.username}` : 'Instagram'} · {lead._count.comments} comments</span></div></div><div className="lead-source"><strong>{lead.firstCampaignKeyword || 'Unavailable'}</strong><small>{lead.notes || 'No notes yet'}</small></div><span className={`lead-stage ${lead.stage.toLowerCase()}`}>{stageLabels[lead.stage]}</span><span className="lead-last-seen">{date(lead.lastCommentAt)}</span><ArrowRight size={17} className="campaign-list-arrow" /></button></li>)}</ul></> : !error && <div className="empty-state"><div className="empty-icon"><UserRound size={26} /></div><strong>{search || stage || campaignId ? 'No leads match these filters' : 'Your next customer starts with a comment'}</strong><p>{search || stage || campaignId ? 'Try a different stage, campaign, or search.' : 'When someone comments with a campaign keyword, their lead record will appear here automatically.'}</p></div>}
      {result && <div className="users-pagination"><span>Page {page} of {Math.max(1, Math.ceil(result.total / result.pageSize))} · {result.total} leads</span><div><button className="campaign-status-button" aria-label="Previous lead page" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} />Previous</button><button className="campaign-status-button" aria-label="Next lead page" disabled={page * result.pageSize >= result.total || loading} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight size={16} /></button></div></div>}
    </section>
    {leadId && <LeadEditor key={leadId} id={leadId} onClose={onClose} onSaved={() => setReload((value) => value + 1)} />}
  </>;
}
