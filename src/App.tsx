import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, BarChart3, Check, CircleAlert, CircleCheck, CircleDashed, Command, Eye, EyeOff, Instagram, LayoutDashboard, Link2, LockKeyhole, LogOut, MessageCircle, MoreHorizontal, Play, RefreshCw, Save, Search, Send, Settings2, ShieldCheck, Users, UsersRound, UserRound, Bell, Menu, X } from 'lucide-react';
import { api, ApiError, type EmailChallenge, type Account, type Campaign, type Comment, type CommentStatus, type Overview, type Reel, type QualificationFlow, type User } from './api';
import { ReelImage, ReelPicker } from './ReelPicker';
import { CampaignActions } from './CampaignActions';
import { AnalyticsView } from './AnalyticsView';
import { LeadManagement } from './LeadManagement';
import { UserManagement } from './UserManagement';
import { QuestionFlowBuilder, questionText } from './QuestionFlowBuilder';
import { Profile } from './Profile';
import { Notifications, NotificationBell, useNotificationInbox, type NotificationInbox } from './Notifications';
import './notifications.css';
import { PublicReplyField } from './PublicReplyField';

type View = 'overview' | 'campaigns' | 'activity' | 'users' | 'analytics' | 'leads' | 'profile' | 'notifications';
type WorkspaceRoute = { view: View; campaignId?: string; leadId?: string; creating?: boolean };

function readWorkspaceRoute(): WorkspaceRoute {
  const query = new URLSearchParams(window.location.search);
  const view = query.get('view');
  return {
    view: view === 'campaigns' || view === 'activity' || view === 'users' || view === 'analytics' || view === 'leads' || view === 'profile' || view === 'notifications' ? view : 'overview',
    campaignId: query.get('campaign') || undefined,
    leadId: query.get('lead') || undefined,
    creating: query.get('create') === '1'
  };
}

function workspaceUrl({ view, campaignId, leadId, creating }: WorkspaceRoute) {
  const query = new URLSearchParams();
  query.set('view', view);
  if (['campaigns', 'analytics', 'leads'].includes(view) && campaignId) query.set('campaign', campaignId);
  if (view === 'leads' && leadId) query.set('lead', leadId);
  if (view === 'campaigns' && creating) query.set('create', '1');
  return `${window.location.pathname}?${query}`;
}

type Filter = 'ALL' | 'ACCEPTED' | 'PENDING' | 'REJECTED' | 'NEEDS_REVIEW' | 'IGNORED';

const statusLabels: Record<CommentStatus, string> = {
  ACCEPTED: 'Delivered', REJECTED: 'Rejected', PENDING: 'Pending', SENDING: 'Sending', UNCERTAIN: 'Needs review', IGNORED: 'Ignored'
};

function formatDate(value: string | null, withTime = true) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kigali', day: '2-digit', month: 'short', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(value));
}

function statusClass(status: CommentStatus) {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED') return 'error';
  if (status === 'UNCERTAIN' || status === 'SENDING') return 'warning';
  if (status === 'PENDING') return 'info';
  return 'neutral';
}

function StatusBadge({ status }: { status: CommentStatus }) {
  return <span className={`status-badge ${statusClass(status)}`}><span className="status-dot" />{statusLabels[status]}</span>;
}

function Brand() {
  return <div className="brand" aria-label="Kurikira"><img className="brand-logo" src="/kurikira-logo.png" alt="Kurikira" /><img className="brand-icon" src="/kurikira-icon.png" alt="" aria-hidden="true" /></div>;
}

type AuthStep = 'login' | 'register' | 'verify' | 'forgot' | 'reset';
type PendingAuth = { step: 'verify' | 'reset'; email: string; verificationId: string; resendAt: number; expiresAt: number };
function savedAuth(): PendingAuth | null {
  try {
    const value = JSON.parse(sessionStorage.getItem('kurikira-pending-auth') || 'null');
    return value && ['verify', 'reset'].includes(value.step) && typeof value.email === 'string' && typeof value.verificationId === 'string' && value.expiresAt > Date.now() ? value : null;
  } catch { return null; }
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [pending, setPending] = useState<PendingAuth | null>(savedAuth);
  const [email, setEmail] = useState(() => savedAuth()?.email || '');
  const [step, setStep] = useState<AuthStep>(() => savedAuth()?.step || 'login');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const register = step === 'register';
  const codeStep = step === 'verify' || step === 'reset';
  const newPassword = register || step === 'reset';
  const cooldown = Math.max(0, Math.ceil(((pending?.resendAt || 0) - now) / 1000));
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    try { if (pending) sessionStorage.setItem('kurikira-pending-auth', JSON.stringify(pending)); else sessionStorage.removeItem('kurikira-pending-auth'); } catch { /* Storage may be unavailable in private browsing. */ }
  }, [pending]);

  function changeStep(next: AuthStep) {
    setStep(next); setPending(null); setPassword(''); setConfirmation(''); setCode(''); setError(''); setNotice(''); setVisible(false);
  }
  function acceptChallenge(result: EmailChallenge, next: 'verify' | 'reset') {
    setEmail(result.email); setPassword(''); setConfirmation(''); setCode(''); setStep(next);
    setPending({ step: next, email: result.email, verificationId: result.verificationId, resendAt: Date.now() + result.resendAfter * 1000, expiresAt: Date.now() + result.expiresIn * 1000 });
    setNow(Date.now());
    setNotice(next === 'verify' ? 'Check your inbox and spam folder for your verification code.' : result.message);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword && password !== confirmation) { setError('Passwords do not match.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      if (step === 'register') acceptChallenge(await api.register(email, password), 'verify');
      else if (step === 'forgot') acceptChallenge(await api.forgotPassword(email), 'reset');
      else if (step === 'verify' && pending) { await api.verifyEmail(email, pending.verificationId, code); setPending(null); onLogin(); }
      else if (step === 'reset' && pending) {
        const result = await api.resetPassword(email, pending.verificationId, code, password);
        changeStep('login'); setNotice(result.message);
      } else { await api.login(email, password); onLogin(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to complete this request.'); }
    finally { setBusy(false); }
  }
  async function resend() {
    if (!pending || cooldown > 0) return;
    setBusy(true); setError(''); setNotice('');
    try {
      acceptChallenge(step === 'verify' ? await api.resendVerification(email, pending.verificationId) : await api.forgotPassword(email), step === 'verify' ? 'verify' : 'reset');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to resend code.'); }
    finally { setBusy(false); }
  }
  const heading = step === 'verify' ? 'Verify your email' : step === 'forgot' || step === 'reset' ? 'Reset your password' : register ? 'Create your workspace' : 'Sign in to your workspace';
  const submitLabel = step === 'verify' ? 'Verify & open workspace' : step === 'forgot' ? 'Send reset code' : step === 'reset' ? 'Change password' : register ? 'Create workspace' : 'Open workspace';

  return <div className="login-layout">
    <section className="login-story conversation-pattern">
      <Brand />
      <div className="login-story-content">
        <div className="eyebrow light"><span className="eyebrow-line" /> COMMENT AUTOMATION, SIMPLIFIED</div>
        <h1>Every comment<br />is a <em>conversation</em><span className="accent-period">.</span></h1>
        <p>Manage the moment someone says hello. One thoughtful reply, delivered right when it matters.</p>
        <div className="story-orbit" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-center"><MessageCircle size={29} strokeWidth={1.6} /></div><div className="orbit-chip top"><span>CHATBOT</span><Send size={15} /></div><div className="orbit-chip bottom"><CircleCheck size={16} /><span>Private reply sent</span></div></div>
      </div>
      <div className="login-story-footer"><span>Made for meaningful connections.</span><span>© {new Date().getFullYear()} NGOGA Digitals</span></div>
    </section>
    <section className="login-form-side">
      <div className="login-form-wrap">
        <div className="login-mobile-brand"><Brand /></div>
        <div className="login-icon"><LockKeyhole size={24} strokeWidth={1.7} /></div>
        <p className="eyebrow">{codeStep ? 'CHECK YOUR EMAIL' : register ? 'GET STARTED' : step === 'forgot' ? 'ACCOUNT RECOVERY' : 'WELCOME BACK'}</p>
        <h2>{heading}</h2>
        <p className="muted login-subtitle">{codeStep ? `Enter the six-digit code sent to ${email}. Codes expire after 10 minutes.` : step === 'forgot' ? 'We’ll email you a code to choose a new password.' : 'Your campaigns and conversations, all in one place.'}</p>
        <form onSubmit={submit}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" value={email} readOnly={codeStep} maxLength={254} onChange={(event) => setEmail(event.target.value)} required />
          {codeStep && <><label htmlFor="email-code">Email code</label><input id="email-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ''))} placeholder="000000" required /></>}
          {step !== 'forgot' && step !== 'verify' && <>
            <label htmlFor="password">{step === 'reset' ? 'New password' : 'Password'}</label>
            <div className="password-wrap"><input id="password" type={visible ? 'text' : 'password'} autoComplete={newPassword ? 'new-password' : 'current-password'} minLength={newPassword ? 12 : undefined} maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="password-toggle" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            {newPassword && <><p className="muted">Use at least 12 characters.</p><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={1024} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></>}
          </>}
          </fieldset>
          {notice && <p role="status" className="muted">{notice}</p>}
          {pending && now >= pending.expiresAt && <p role="status" className="muted">Your code has expired. Request a new code below.</p>}
          {error && <div role="alert" className="form-error"><CircleAlert size={16} />{error}</div>}
          <button className="primary-button login-submit" disabled={busy || (codeStep && !!pending && now >= pending.expiresAt)} type="submit">{busy ? <RefreshCw className="spin" size={17} aria-label="Please wait" /> : <>{submitLabel} <ArrowRight size={18} /></>}</button>
        </form>
        {codeStep && <button className="subtle-button" style={{ display: 'block', marginTop: 12 }} disabled={busy || cooldown > 0} type="button" onClick={() => void resend()}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}</button>}
        {step === 'login' && <button className="subtle-button" style={{ display: 'block', marginTop: 12 }} disabled={busy} type="button" onClick={() => changeStep('forgot')}>Forgot password?</button>}
        <button className="subtle-button" style={{ display: 'block', marginTop: 12 }} disabled={busy} type="button" onClick={() => changeStep(step === 'login' ? 'register' : 'login')}>{step === 'login' ? 'New here? Create an account' : 'Back to sign in'}</button>
        {codeStep && <button className="subtle-button" style={{ display: 'block', marginTop: 12 }} disabled={busy} type="button" onClick={() => changeStep(step === 'verify' ? 'register' : 'forgot')}>Use a different email</button>}
        <div className="login-secure"><ShieldCheck size={17} /> Your Instagram credentials stay with Meta</div>
        <p className="login-legal">By using Kurikira, you agree to our <a href="/terms">Terms &amp; conditions</a> and acknowledge our <a href="/privacy">Privacy policy</a>. <a href="/">About Kurikira</a></p>
      </div>
    </section>
  </div>;
}

function Sidebar({ view, onView, onLogout, user, mobile = false, onClose }: { view: View; onView: (view: View) => void; onLogout: () => void; user: User | null; mobile?: boolean; onClose?: () => void }) {
  const links = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'campaigns' as const, label: 'Campaigns', icon: Settings2 },
    { id: 'activity' as const, label: 'Activity', icon: Activity },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { id: 'leads' as const, label: 'Leads', icon: UsersRound },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'profile' as const, label: 'Profile', icon: UserRound },
    ...(user?.role === 'ADMIN' ? [{ id: 'users' as const, label: 'Users & clients', icon: Users }] : [])
  ];
  return <aside className={`sidebar${mobile ? ' sidebar-mobile' : ''}`}>
    <div className="sidebar-top">{mobile ? <div className="mobile-navigation-heading"><Brand /><button type="button" className="mobile-menu-close" aria-label="Close navigation" onClick={onClose} autoFocus><X size={22} /></button></div> : <Brand />}<p className="sidebar-group-label">WORKSPACE</p><nav aria-label="Main navigation">{links.map(({ id, label, icon: Icon }) => <button key={id} aria-label={label} aria-current={view === id ? 'page' : undefined} className={`nav-link ${view === id ? 'active' : ''}`} onClick={() => onView(id)}><Icon size={19} strokeWidth={1.8} /><span>{label}</span>{view === id && <span className="nav-active-dot" />}</button>)}</nav></div>
    <div className="sidebar-bottom"><div className="sidebar-help"><div className="help-icon"><MessageCircle size={17} /></div><strong>Keep conversations moving.</strong><p>Turn every comment into a meaningful first message.</p></div><div className="sidebar-account"><div className="account-avatar">{user?.email?.[0]?.toUpperCase() || 'U'}</div><div><strong>{user?.email || 'Your workspace'}</strong><span>{user?.role === 'ADMIN' ? 'Administrator' : 'Client account'}</span></div><button aria-label="Sign out" title="Sign out" onClick={onLogout}><LogOut size={18} />{mobile && <span>Sign out</span>}</button></div></div>
  </aside>;
}

function MobileNavigation({ open, onClose, view, onView, onLogout, user }: { open: boolean; onClose: () => void; view: View; onView: (view: View) => void; onLogout: () => void; user: User | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!open) { if (element.open) element.close(); return; }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!element.open) element.showModal();
    return () => { document.body.style.overflow = overflow; if (element.open) element.close(); };
  }, [open]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 901px)');
    const resize = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener('change', resize);
    return () => desktop.removeEventListener('change', resize);
  }, [onClose]);
  return <dialog ref={dialog} id="mobile-workspace-navigation" className="mobile-navigation" aria-label="Workspace navigation" onCancel={event => { event.preventDefault(); onClose(); }} onClose={onClose} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }}><Sidebar mobile view={view} user={user} onClose={onClose} onView={next => { onView(next); onClose(); }} onLogout={() => { onClose(); onLogout(); }} /></dialog>;
}

function Topbar({ view, onRefresh, refreshing, inbox, onNotifications, onProfile, user, menuOpen, onMenu }: { menuOpen: boolean; onMenu: () => void; view: View; onRefresh: () => void; refreshing: boolean; inbox: NotificationInbox; onNotifications: () => void; onProfile: () => void; user: User | null }) {
  const titles = { overview: 'Overview', campaigns: 'Campaigns', activity: 'Activity', users: 'Users & clients', analytics: 'Analytics', leads: 'Leads', profile: 'Your profile', notifications: 'Notifications' };
  return <header className="topbar"><div className="topbar-location"><button type="button" className="mobile-menu-trigger" onClick={onMenu} aria-label="Open navigation" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="mobile-workspace-navigation"><Menu size={22} /><span>Menu</span></button><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{titles[view]}</strong></div></div><div className="topbar-actions"><div className="live-pill"><span /> LIVE WORKSPACE</div><button className="icon-button refresh-top" onClick={onRefresh} aria-label="Refresh dashboard" title="Refresh dashboard"><RefreshCw size={18} className={refreshing ? 'spin' : ''} /></button><NotificationBell inbox={inbox} onOpen={onNotifications} /><button className="top-avatar profile-avatar-button" onClick={onProfile} aria-label="Open your profile" title="Your profile">{user?.email?.[0]?.toUpperCase() || 'U'}</button></div></header>;
}

function MetricCard({ label, value, icon: Icon, tone, foot }: { label: string; value: number; icon: typeof Send; tone: string; foot: string }) {
  return <div className="metric-card"><div className="metric-head"><span>{label}</span><div className={`metric-icon ${tone}`}><Icon size={19} strokeWidth={1.8} /></div></div><div className="metric-value">{value.toLocaleString()}</div><div className="metric-foot">{foot}</div></div>;
}

function ActivityTable({ comments, compact = false }: { comments: Comment[]; compact?: boolean }) {
  if (!comments.length) return <div className="empty-state"><div className="empty-icon"><MessageCircle size={27} /></div><strong>No comments yet</strong><p>New comment events will appear here once Meta sends them to your webhook.</p></div>;
  return <div className="table-wrap"><table><thead><tr><th>COMMENT</th><th>CAMPAIGN</th><th>PRIVATE MESSAGE</th><th>COMMENT REPLY</th><th>RECEIVED</th><th className="row-end">DETAIL</th></tr></thead><tbody>{comments.slice(0, compact ? 6 : undefined).map((comment) => <tr key={comment.id}><td><div className="comment-cell"><div className="comment-avatar"><MessageCircle size={17} /></div><div><strong title={comment.text}>{comment.text}</strong><small>ID {comment.commentId}</small></div></div></td><td><span className="campaign-chip">{comment.campaign?.keyword || '—'}</span></td><td><StatusBadge status={comment.status} /></td><td title={comment.publicReplyErrorCode ? `Meta error code: ${comment.publicReplyErrorCode}` : undefined}>{comment.publicReplyStatus ? <StatusBadge status={comment.publicReplyStatus} /> : <span className="comment-reply-none">—</span>}</td><td className="date-cell">{formatDate(comment.createdAt)}</td><td className="row-end detail-cell">{comment.metaMessageId ? <span title={`Meta message ID: ${comment.metaMessageId}`}><Check size={15} /> Sent</span> : comment.metaErrorCode ? <span title={`Meta error code: ${comment.metaErrorCode}`}>Code {comment.metaErrorCode}</span> : <span>—</span>}</td></tr>)}</tbody></table></div>;
}

function OverviewView({ overview, campaigns, comments, onView }: { overview: Overview; campaigns: Campaign[]; comments: Comment[]; onView: (view: View) => void }) {
  const primary = campaigns[0];
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR INSTAGRAM WORKSPACE</div><h1>Good to see you<span className="heading-dot">.</span></h1><p>Here’s what’s happening with your Instagram conversations.</p></div><div className="heading-date">{new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kigali', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</div></div>
    <section className="metrics-grid" aria-label="Performance summary"><MetricCard label="Replies delivered" value={overview.accepted} icon={Send} tone="coral" foot="Private replies accepted by Meta" /><MetricCard label="Active campaigns" value={overview.activeCampaigns} icon={Play} tone="violet" foot="Listening for comment keywords" /><MetricCard label="Pending sends" value={overview.pending} icon={CircleDashed} tone="blue" foot="Waiting for processing" /><MetricCard label="Needs attention" value={overview.needsReview + overview.rejected} icon={CircleAlert} tone="amber" foot="Review uncertain and rejected sends" /></section>
    <div className="overview-grid"><section className="panel campaign-feature"><div className="panel-heading"><div><p className="section-kicker">CURRENT CAMPAIGN</p><h2>Comment to DM</h2></div><button className="subtle-button" onClick={() => onView('campaigns')}>Manage <ArrowRight size={16} /></button></div>{primary ? <><div className="feature-hero"><div className="feature-instagram"><Instagram size={23} /></div><div><span>INSTAGRAM REEL</span><strong>Keyword automation</strong></div><span className={`feature-state ${primary.active ? '' : 'paused'}`}><span />{primary.active ? 'Active' : 'Paused'}</span></div><div className="feature-detail"><div><span>TRIGGER WORD</span><strong>{primary.keyword}</strong></div><div><span>MEDIA ID</span><strong className="mono">{primary.mediaId}</strong></div></div><div className="feature-reply"><span>PRIVATE REPLY</span><p>{primary.replyText} {primary.demoLink && <a href={primary.demoLink} target="_blank" rel="noreferrer">{primary.demoLink}</a>}</p></div></> : <div className="empty-state compact"><strong>No campaign configured</strong><p>Connect Instagram and choose a Reel in Campaigns.</p></div>}</section><section className="panel how-it-works"><div className="panel-heading"><div><p className="section-kicker">THE JOURNEY</p><h2>From comment to conversation</h2></div><MoreHorizontal size={22} className="muted-icon" /></div><div className="journey-list"><div className="journey-item"><span className="journey-number">01</span><div className="journey-line" /><div><strong>Someone comments</strong><p>We listen for your keyword on the selected Reel.</p></div><div className="journey-icon"><MessageCircle size={19} /></div></div><div className="journey-item"><span className="journey-number">02</span><div className="journey-line" /><div><strong>A private reply goes out</strong><p>Your opening message lands in their Instagram inbox.</p></div><div className="journey-icon"><Send size={19} /></div></div><div className="journey-item"><span className="journey-number">03</span><div><strong>Every result is recorded</strong><p>Follow accepted, rejected, and uncertain sends.</p></div><div className="journey-icon"><CircleCheck size={19} /></div></div></div><div className="webhook-signal"><span className="signal-dot" /><span>Last comment received</span><strong>{formatDate(overview.lastWebhookAt)}</strong></div></section></div>
    <section className="panel recent-panel"><div className="panel-heading"><div><p className="section-kicker">LATEST ACTIVITY</p><h2>Recent comments</h2></div><button className="subtle-button" onClick={() => onView('activity')}>View all <ArrowRight size={16} /></button></div><ActivityTable comments={comments} compact /></section>
  </>;
}

function CampaignEditor({ campaign, onSaved, onDeleted }: { campaign: Campaign; onSaved: () => Promise<void>; onDeleted: () => void }) {
  const [draft, setDraft] = useState({ mediaId: campaign.mediaId, keyword: campaign.keyword, replyText: campaign.replyText, publicReplyText: campaign.publicReplyText || '', qualificationFlow: campaign.qualificationFlow || null, demoLink: campaign.demoLink, active: campaign.active });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useEffect(() => setDraft({ mediaId: campaign.mediaId, keyword: campaign.keyword, replyText: campaign.replyText, publicReplyText: campaign.publicReplyText || '', qualificationFlow: campaign.qualificationFlow || null, demoLink: campaign.demoLink, active: campaign.active }), [campaign.id]);
  const dirty = Object.keys(draft).some((key) => key === 'qualificationFlow' ? JSON.stringify(draft.qualificationFlow) !== JSON.stringify(campaign.qualificationFlow || null) : draft[key as keyof typeof draft] !== (key === 'publicReplyText' ? campaign.publicReplyText || '' : campaign[key as keyof Campaign]));
  async function save(event?: FormEvent) {
    event?.preventDefault(); setSaving(true); setError(''); setNotice('');
    try { const updated = await api.updateCampaign(campaign.id, { ...draft, publicReplyText: draft.publicReplyText.trim() || null }); setDraft({ mediaId: updated.mediaId, keyword: updated.keyword, replyText: updated.replyText, publicReplyText: updated.publicReplyText || '', qualificationFlow: updated.qualificationFlow || null, demoLink: updated.demoLink, active: updated.active }); await onSaved(); setNotice('Campaign changes saved.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save campaign.'); }
    finally { setSaving(false); }
  }
  return <form className="campaign-form" onSubmit={save}><div className="form-intro"><div><p className="section-kicker">CAMPAIGN SETTINGS</p><h2>Make every reply count.</h2><p>Choose the Reel, the word to listen for, and the first message your audience receives.</p></div><CampaignActions campaign={campaign} disabled={saving} onSaved={onSaved} onDeleted={onDeleted} onNotice={setNotice} onStatusChanged={(active) => setDraft((current) => ({ ...current, active }))} /></div><ReelPicker id="media-id" label="Instagram Reel" accountId={campaign.accountId} value={draft.mediaId} onChange={(mediaId) => setDraft((current) => ({ ...current, mediaId }))} /><div className="form-grid"><div className="field"><label htmlFor="keyword">Trigger keyword</label><div className="input-icon"><Command size={18} /><input id="keyword" value={draft.keyword} onChange={(event) => setDraft({ ...draft, keyword: event.target.value })} placeholder="CHATBOT" required /></div><small>Matched as a whole word, regardless of letter case.</small></div><div className="field full"><label htmlFor="reply-text">Private reply text</label><textarea id="reply-text" rows={4} value={draft.replyText} onChange={(event) => setDraft({ ...draft, replyText: event.target.value })} required /><small>{draft.qualificationFlow ? 'The first question is added to this message. An optional link is included in this opening reply.' : 'An optional link can be included in this opening reply.'}</small></div><div className="field full"><label htmlFor="demo-link">Link (optional)</label><div className="input-icon"><Link2 size={18} /><input id="demo-link" type="url" value={draft.demoLink} onChange={(event) => setDraft({ ...draft, demoLink: event.target.value })} placeholder="https://example.com/demo" /></div><small>Leave blank when your campaign does not need a link.</small></div></div><div className="preview-box"><div className="preview-label"><span>MESSAGE PREVIEW</span><MessageCircle size={17} /></div><div className="preview-bubble">{draft.replyText || 'Your reply text'}{draft.demoLink.trim() && <> <span>{draft.demoLink.trim()}</span></>}{draft.qualificationFlow?.questions[0] && '\n\n' + questionText(draft.qualificationFlow.questions[0])}</div><p>This is the private message sent after a matching comment.</p></div><QuestionFlowBuilder accountId={campaign.accountId} value={draft.qualificationFlow} onChange={(qualificationFlow) => setDraft((current) => ({ ...current, qualificationFlow }))} /><PublicReplyField value={draft.publicReplyText} onChange={(publicReplyText) => setDraft((current) => ({ ...current, publicReplyText }))} />{error && <div className="form-error"><CircleAlert size={16} />{error}</div>}{notice && <div className="form-success"><CircleCheck size={16} />{notice}</div>}<div className="form-actions"><span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span><button className="primary-button" disabled={!dirty || saving} type="submit">{saving ? <RefreshCw size={17} className="spin" /> : <Save size={17} />} Save changes</button></div></form>;
}

function NewCampaign({ accounts, onSaved }: { accounts: Account[]; onSaved: (campaign: Campaign) => Promise<void> }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [mediaId, setMediaId] = useState('');
  const [keyword, setKeyword] = useState('CHATBOT');
  const [replyText, setReplyText] = useState('Thanks for commenting! See the demo:');
  const [demoLink, setDemoLink] = useState('');
  const [publicReplyText, setPublicReplyText] = useState('');
  const [qualificationFlow, setQualificationFlow] = useState<QualificationFlow | null>(null);
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try { const campaign = await api.createCampaign({ accountId, mediaId, keyword, replyText, publicReplyText: publicReplyText.trim() || null, qualificationFlow, demoLink, active }); await onSaved(campaign); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create campaign'); }
    finally { setSaving(false); }
  }
  return <form className="campaign-form" onSubmit={save}><p className="section-kicker">NEW CAMPAIGN</p><h2>Choose a Reel and message</h2><div className="form-grid"><div className="field"><label htmlFor="new-account">Instagram account</label><select id="new-account" value={accountId} onChange={(event) => { setAccountId(event.target.value); setMediaId(''); }}>{accounts.map((account) => <option key={account.id} value={account.id}>@{account.username || account.id}</option>)}</select></div><ReelPicker id="new-reel" label="Reel" accountId={accountId} value={mediaId} onChange={setMediaId} /><div className="field"><label htmlFor="new-keyword">Keyword</label><input id="new-keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} required /></div><div className="field"><label htmlFor="new-link">Link (optional)</label><input id="new-link" type="url" value={demoLink} onChange={(event) => setDemoLink(event.target.value)} placeholder="https://example.com" /><small>If provided, the link is included in the opening reply.</small></div><div className="field full"><label htmlFor="new-reply">Private reply text</label><textarea id="new-reply" value={replyText} onChange={(event) => setReplyText(event.target.value)} rows={4} required /></div></div><QuestionFlowBuilder accountId={accountId} value={qualificationFlow} onChange={setQualificationFlow} /><label className="start-paused-option"><input type="checkbox" checked={!active} onChange={(event) => setActive(!event.target.checked)} />Start this campaign paused</label><PublicReplyField value={publicReplyText} onChange={setPublicReplyText} />{error && <div className="form-error">{error}</div>}<div className="form-actions"><span>{mediaId ? `Selected Reel ID ${mediaId}` : 'Choose a Reel to continue'}</span><button className="primary-button" type="submit" disabled={saving || !mediaId}>{saving ? 'Saving...' : 'Create campaign'}</button></div></form>;
}

function PendingAccount({ onSaved }: { onSaved: () => Promise<void> }) {
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function complete(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try { await api.completeInstagram(accountId.trim()); await onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not verify this account'); }
    finally { setSaving(false); }
  }
  return <form className="panel editor-panel campaign-form" onSubmit={complete}><p className="section-kicker">ONE MORE STEP</p><h2>Confirm your Instagram account</h2><p>Meta granted access but did not include an account list. Enter the numeric professional account ID shown under your Instagram account in Meta’s API setup. We verify this ID with the token you just granted before connecting it.</p><div className="field"><label htmlFor="connect-account-id">Instagram professional account ID</label><input id="connect-account-id" inputMode="numeric" pattern="[0-9]{8,30}" value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder="17841454090031131" required /></div>{error && <div className="form-error">{error}</div>}<div className="form-actions"><span>Only an account Meta granted can be connected.</span><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Verifying...' : 'Finish connection'}</button></div></form>;
}

function CampaignsView({ campaigns, accounts, needsAccountId, onSaved, route, onNavigate }: {
  campaigns: Campaign[];
  accounts: Account[];
  needsAccountId: boolean;
  onSaved: () => Promise<void>;
  route: WorkspaceRoute;
  onNavigate: (route: WorkspaceRoute, replace?: boolean) => void;
}) {
  const [connectError, setConnectError] = useState('');
  const [statusNotice, setStatusNotice] = useState('');
  const current = campaigns.find((campaign) => campaign.id === route.campaignId);
  const isDetail = Boolean(route.campaignId || route.creating);
  const [reelsByAccount, setReelsByAccount] = useState<Record<string, Reel[]>>({});
  const campaignAccountIds = JSON.stringify([...new Set(campaigns.map((campaign) => campaign.accountId))].sort());
  useEffect(() => {
    if (isDetail) return;
    let cancelled = false;
    const accountIds: string[] = JSON.parse(campaignAccountIds);
    void Promise.allSettled(accountIds.map(async (accountId) => {
      const reels = await api.reels(accountId);
      if (!cancelled) setReelsByAccount((current) => ({ ...current, [accountId]: reels }));
    }));
    return () => { cancelled = true; };
  }, [campaignAccountIds, isDetail]);
  const backToList = () => onNavigate({ view: 'campaigns' });
  const accountLabel = (accountId: string) => {
    const account = accounts.find((item) => item.id === accountId);
    return account?.username ? `@${account.username}` : accountId;
  };
  async function connect() { try { const { url } = await api.connectUrl(); window.location.assign(url); } catch (cause) { setConnectError(cause instanceof Error ? cause.message : 'Could not start Instagram connection'); } }
  return <>
    {isDetail && <button className="subtle-button campaign-back" onClick={backToList}><ArrowLeft size={16} /> Back to campaigns</button>}
    <div className="page-heading">
      <div><div className="eyebrow"><span className="eyebrow-line" /> AUTOMATION SETUP</div>
        <h1>{route.creating ? 'New campaign' : route.campaignId ? current?.keyword || 'Campaign not found' : 'Your campaigns'}<span className="heading-dot">.</span></h1>
        <p>{route.creating ? 'Choose a Reel and set up your automatic reply.' : current ? `Instagram account ${accountLabel(current.accountId)} · Created ${formatDate(current.createdAt, false)}` : 'Choose a campaign to view and manage its settings.'}</p>
      </div>
      {current && !route.creating && <button className="campaign-status-button" onClick={() => onNavigate({ view: 'analytics', campaignId: current.id })}><BarChart3 size={17} />View analytics</button>}
      {!isDetail && <div className="campaign-heading-actions"><button className="subtle-button" onClick={() => void connect()}><Instagram size={18} /> Connect Instagram</button>{accounts.length > 0 && <button className="primary-button" onClick={() => onNavigate({ view: 'campaigns', creating: true })}>+ New campaign</button>}</div>}
    </div>
    {connectError && <div className="form-error">{connectError}</div>}
    {statusNotice && <div className="form-success" role="status">{statusNotice}</div>}
    {needsAccountId && <PendingAccount onSaved={onSaved} />}
    {route.creating ? accounts.length > 0 ? <div className="panel editor-panel"><NewCampaign accounts={accounts} onSaved={async (campaign) => { await onSaved(); onNavigate({ view: 'campaigns', campaignId: campaign.id }, true); }} /></div> : <div className="panel empty-state"><strong>Connect your Instagram account</strong><p>Connect an account before creating a campaign.</p><button className="primary-button" onClick={() => void connect()}>Connect Instagram</button></div>
      : route.campaignId ? current ? <div className="panel editor-panel"><CampaignEditor key={current.id} campaign={current} onSaved={onSaved} onDeleted={() => { setStatusNotice(`${current.keyword}: campaign deleted.`); onNavigate({ view: 'campaigns' }, true); }} /></div> : <div className="panel empty-state"><strong>Campaign not found</strong><p>This campaign may no longer be available in your workspace.</p><button className="subtle-button" onClick={backToList}>View all campaigns <ArrowRight size={16} /></button></div>
      : campaigns.length ? <section className="panel campaign-list" aria-label="Campaign list">
        <div className="campaign-list-heading"><h2>All campaigns</h2><span>{campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'} · {campaigns.filter((campaign) => campaign.active).length} active</span></div>
        <ul>{campaigns.map((campaign) => <li key={campaign.id} className="campaign-list-row"><a className="campaign-list-item" href={workspaceUrl({ view: 'campaigns', campaignId: campaign.id })} onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onNavigate({ view: 'campaigns', campaignId: campaign.id }); }}>
          <ReelImage reel={reelsByAccount[campaign.accountId]?.find((reel) => reel.id === campaign.mediaId)} className="campaign-list-thumbnail" alt={`Reel preview for ${campaign.keyword}`} />
          <div className="campaign-list-copy"><strong>{campaign.keyword}</strong><span>{accountLabel(campaign.accountId)} · Reel {campaign.mediaId}</span><p>{campaign.replyText}</p></div>
          <div className="campaign-list-meta"><span className={`feature-state ${campaign.active ? '' : 'paused'}`}><span />{campaign.active ? 'Active' : 'Paused'}</span><small>Created {formatDate(campaign.createdAt, false)}</small></div>
          <ArrowRight size={19} className="campaign-list-arrow" />
        </a><div className="campaign-list-action"><CampaignActions campaign={campaign} onSaved={onSaved} onDeleted={() => {}} onNotice={setStatusNotice} /></div></li>)}</ul>
      </section> : <div className="panel empty-state"><div className="empty-icon"><Settings2 size={25} /></div><strong>{accounts.length ? 'No campaigns yet' : 'Connect your Instagram account'}</strong><p>{accounts.length ? 'Create your first campaign to turn Reel comments into private replies.' : 'Connect your professional account, then choose a Reel for your first campaign.'}</p>{accounts.length ? <button className="primary-button" onClick={() => onNavigate({ view: 'campaigns', creating: true })}>+ New campaign</button> : !needsAccountId && <button className="primary-button" onClick={() => void connect()}>Connect Instagram</button>}</div>}
  </>;
}

function ActivityView({ comments }: { comments: Comment[] }) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const filters: { id: Filter; label: string }[] = [{ id: 'ALL', label: 'All' }, { id: 'ACCEPTED', label: 'Delivered' }, { id: 'PENDING', label: 'Pending' }, { id: 'NEEDS_REVIEW', label: 'Needs review' }, { id: 'REJECTED', label: 'Rejected' }, { id: 'IGNORED', label: 'Ignored' }];
  const visible = useMemo(() => comments.filter((comment) => (filter === 'ALL' || (filter === 'NEEDS_REVIEW' ? ['UNCERTAIN', 'SENDING'].includes(comment.status) : comment.status === filter)) && (!search || `${comment.text} ${comment.commentId} ${comment.mediaId}`.toLowerCase().includes(search.toLowerCase()))), [comments, filter, search]);
  return <><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> DELIVERY HISTORY</div><h1>Every interaction<span className="heading-dot">.</span></h1><p>See what happened after each comment, from trigger to private reply.</p></div><div className="heading-badge"><Activity size={18} /> {comments.length} recent events</div></div><section className="panel activity-panel"><div className="activity-toolbar"><div className="filter-tabs" role="group" aria-label="Filter comment status">{filters.map((item) => <button key={item.id} className={filter === item.id ? 'selected' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div><div className="search-wrap"><Search size={17} /><input aria-label="Search comments" placeholder="Search comments..." value={search} onChange={(event) => setSearch(event.target.value)} /></div></div><ActivityTable comments={visible} /><div className="activity-footer"><span>Showing {visible.length} of the latest {comments.length} comments</span><span>Times shown in Kigali (CAT)</span></div></section><div className="review-note"><CircleAlert size={19} /><p><strong>Uncertain or stuck sends need manual review.</strong> The system does not retry them automatically, so no one receives a duplicate private reply.</p></div></>;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const inbox = useNotificationInbox(authenticated === true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  useEffect(() => { if (!authenticated) setMobileMenuOpen(false); }, [authenticated]);
  const [connectionNotice, setConnectionNotice] = useState('');
  const [route, setRoute] = useState<WorkspaceRoute>(readWorkspaceRoute);
  const view = route.view;
  const navigate = useCallback((next: WorkspaceRoute, replace = false) => {
    const previous = readWorkspaceRoute();
    if (next.view !== previous.view || next.campaignId !== previous.campaignId) window.scrollTo(0, 0);
    window.history[replace ? 'replaceState' : 'pushState']({}, '', workspaceUrl(next));
    setRoute(next);
  }, []);
  const setView = (next: View) => navigate({ view: next });
  useEffect(() => {
    const onPopState = () => setRoute(readWorkspaceRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [usersRefreshKey, setUsersRefreshKey] = useState(0);
  const refreshSession = useCallback(async () => {
    const session = await api.session();
    setUser(session.user); setAuthenticated(session.authenticated);
  }, []);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [needsAccountId, setNeedsAccountId] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [nextOverview, nextAccounts, nextCampaigns, nextComments, nextPending] = await Promise.all([api.overview(), api.accounts(), api.campaigns(), api.comments(), api.pendingInstagram(), refreshSession(), inbox.refresh()]);
      setOverview(nextOverview); setAccounts(nextAccounts); setCampaigns(nextCampaigns); setComments(nextComments); setNeedsAccountId(nextPending.needsAccountId); setUsersRefreshKey((key) => key + 1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) { setAuthenticated(false); return; }
      setError(cause instanceof Error ? cause.message : 'Unable to load workspace data.');
    } finally { setLoading(false); }
  }, [refreshSession, inbox.refresh]);

  useEffect(() => { api.session().then(({ authenticated: value, user: current }) => { setUser(current); setAuthenticated(value); }).catch(() => { setAuthenticated(false); setError('Backend unavailable. Check that the NestJS server is running.'); }); }, []);
  useEffect(() => { const query = new URLSearchParams(window.location.search); const outcome = query.get('instagram'); if (outcome) { navigate({ view: 'campaigns' }, true); const detail = query.get('detail'); const reason = detail === 'missing_response' ? 'Meta returned without an authorization code or state.' : detail === 'state_mismatch' ? 'The Meta login state expired or did not match. Start the connection again.' : detail === 'token_exchange' ? 'Meta rejected the authorization code exchange.' : detail === 'account_discovery' ? 'Meta granted access, but did not return a discoverable Instagram professional account.' : detail === 'subscription' ? 'The account was granted, but Meta rejected the comment webhook subscription.' : 'Check the backend logs for the reason.'; setConnectionNotice(outcome === 'connected' ? 'Instagram connected. Choose a Reel to create your campaign.' : outcome === 'needs_account' ? 'Meta granted access. Enter your Instagram account ID below to finish connecting it.' : outcome === 'denied' ? 'Meta cancelled or denied the Instagram connection. Please check the Meta login permissions and try again.' : `Instagram connection failed: ${reason}`); } }, [navigate]);
  useEffect(() => { if (authenticated) void refresh(); }, [authenticated, refresh]);
  useEffect(() => { if (!authenticated) return; const timer = setInterval(() => void refresh(), 30000); return () => clearInterval(timer); }, [authenticated, refresh]);

  async function logout() { try { await api.logout(); } finally { setAuthenticated(false); setUser(null); setOverview(null); setAccounts([]); setNeedsAccountId(false); setCampaigns([]); setComments([]); } }

  if (authenticated === null) return <div className="loading-screen"><Brand /><RefreshCw className="spin" size={24} /></div>;
  if (!authenticated) return <Login onLogin={() => { setError(''); void api.session().then(({ user: current }) => setUser(current)); setAuthenticated(true); }} />;

  return <div className="app-shell"><Sidebar view={view} onView={setView} onLogout={() => void logout()} user={user} /><MobileNavigation open={mobileMenuOpen} onClose={closeMobileMenu} view={view} onView={setView} user={user} onLogout={() => void logout()} /><div className="main-shell"><Topbar menuOpen={mobileMenuOpen} onMenu={() => setMobileMenuOpen(true)} view={view} inbox={inbox} user={user} onNotifications={() => setView('notifications')} onProfile={() => setView('profile')} onRefresh={() => { if (view === 'notifications') { void inbox.refresh(); return; } if (['users', 'analytics', 'leads'].includes(view)) setUsersRefreshKey((key) => key + 1); else void refresh(); }} refreshing={loading} /><main className="main-content">{connectionNotice && <div className={connectionNotice.startsWith('Instagram connected') || connectionNotice.startsWith('Meta granted') ? 'form-success' : 'global-error'}><CircleAlert size={18} />{connectionNotice}<button className="subtle-button" onClick={() => setConnectionNotice('')}>Dismiss</button></div>}{error && <div className="global-error"><CircleAlert size={18} />{error}<button onClick={() => void refresh()}>Try again</button></div>}{view === 'profile' ? <Profile /> : view === 'notifications' ? <Notifications inbox={inbox} onProfile={() => setView('profile')} onOpen={(href) => { if (!href.startsWith('/app?')) return; const target = new URL(href, window.location.origin); const nextView = target.searchParams.get('view'); if (!['overview', 'campaigns', 'activity', 'analytics', 'leads', 'profile'].includes(nextView || '')) return; navigate({ view: nextView as View, leadId: target.searchParams.get('lead') || undefined, campaignId: target.searchParams.get('campaign') || undefined }); }} /> : view === 'analytics' ? <AnalyticsView campaigns={campaigns} campaignId={route.campaignId} refreshKey={usersRefreshKey} onCampaignChange={(id) => navigate({ view: 'analytics', campaignId: id || undefined })} onOpenCampaign={(id) => navigate({ view: 'campaigns', campaignId: id })} onLeads={(id) => navigate({ view: 'leads', campaignId: id })} /> : view === 'leads' ? <LeadManagement campaigns={campaigns} campaignId={route.campaignId} leadId={route.leadId} refreshKey={usersRefreshKey} onCampaignChange={(id) => navigate({ view: 'leads', campaignId: id || undefined })} onOpen={(id) => navigate({ view: 'leads', campaignId: route.campaignId, leadId: id })} onClose={() => navigate({ view: 'leads', campaignId: route.campaignId })} /> : view === 'users' ? user?.role === 'ADMIN' ? <UserManagement currentUser={user} onSessionChanged={refreshSession} refreshKey={usersRefreshKey} /> : <div className="panel empty-state"><strong>Administrator access required</strong><p>User management is available to administrators.</p><button className="subtle-button" onClick={() => setView('overview')}>Back to overview <ArrowRight size={16} /></button></div> : !overview ? <div className="content-loading"><RefreshCw className="spin" size={26} /><span>Loading your workspace...</span></div> : view === 'overview' ? <OverviewView overview={overview} campaigns={campaigns} comments={comments} onView={setView} /> : view === 'campaigns' ? <CampaignsView campaigns={campaigns} accounts={accounts} needsAccountId={needsAccountId} onSaved={refresh} route={route} onNavigate={navigate} /> : <ActivityView comments={comments} />}</main><footer className="main-footer"><span>{user?.email || 'kurikira'} · NGOGA Digitals</span><span>Made to turn interest into conversation <ArrowDownRight size={14} /></span></footer></div></div>;
}
