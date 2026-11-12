import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Eye, EyeOff, Plus, RefreshCw, Search, ShieldCheck, UserRound, X } from 'lucide-react';
import { api, ApiError, type ManagedUser, type User, type UserInput, type UserPage, type UserRole } from './api';

function UserEditor({ target, currentUser, onClose, onSaved }: { target: ManagedUser | null; currentUser: User; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [email, setEmail] = useState(target?.email || '');
  const [clientName, setClientName] = useState(target?.client.name || '');
  const [role, setRole] = useState<UserRole>(target?.role || 'CLIENT');
  const [isActive, setIsActive] = useState(target?.isActive ?? true);
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const lock = useRef(false);
  const self = target?.id === currentUser.id;
  const securityChange = target ? role !== target.role || isActive !== target.isActive || Boolean(password) : role === 'ADMIN';

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal(); document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && lock.current) { event.preventDefault(); event.stopPropagation(); } };
    document.addEventListener('keydown', onKeyDown, true);
    return () => { dialog?.close(); document.body.style.overflow = overflow; document.removeEventListener('keydown', onKeyDown, true); if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => { if (review) cancelRef.current?.focus(); }, [review]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (securityChange && !review) { setReview(true); return; }
    lock.current = true; setBusy(true); setError('');
    const data: UserInput = { email: email.trim(), clientName: clientName.trim(), role, ...(password ? { password } : {}) };
    try {
      if (target) {
        // Send only changed access fields, keeping unrelated sessions intact.
        const { role: _role, ...rest } = data;
        await api.updateUser(target.id, { ...rest, ...(role !== target.role ? { role } : {}), ...(isActive !== target.isActive ? { isActive } : {}) });
      } else await api.createUser(data);
      await onSaved(target ? 'User changes saved.' : 'User created. Share their sign-in details securely.');
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save user. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }

  return <dialog ref={dialogRef} className="users-dialog" aria-labelledby="user-editor-title" aria-describedby="user-editor-description" onCancel={(event) => { event.preventDefault(); if (!lock.current) onClose(); }} onClick={(event) => { if (event.target === event.currentTarget && !lock.current) onClose(); }}>
    <form className="users-editor" onSubmit={save}>
      <button className="campaign-confirm-close" type="button" aria-label="Close user editor" disabled={busy} onClick={onClose}><X size={19} /></button>
      <div className="users-editor-icon"><UserRound size={24} /></div><p className="section-kicker">ADMINISTRATION</p>
      <h2 id="user-editor-title">{review ? 'Confirm access changes' : target ? 'Edit user' : 'Add a new user'}</h2>
      <p id="user-editor-description">{review ? 'Review these changes before updating account access.' : 'Set up their workspace and choose what they can access.'}</p>
      {review ? <div className="user-access-review"><strong>{email}</strong><dl><div><dt>Role</dt><dd>{role === 'ADMIN' ? 'Administrator' : 'Client'}</dd></div><div><dt>Access</dt><dd>{isActive ? 'Active' : 'Suspended'}</dd></div>{password && target && <div><dt>Password</dt><dd>Will be reset</dd></div>}</dl><p>{role === 'ADMIN' ? 'Administrators can manage every user, including roles and account access.' : 'Clients can manage campaigns in their own workspace.'}</p>{target && <p>Changing a role, password, or access status signs this user out. Suspension blocks sign-in; existing campaigns keep running.</p>}</div> : <div className="form-grid">
        <div className="field full"><label htmlFor="managed-email">Email address</label><input id="managed-email" type="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" /></div>
        <div className="field full"><label htmlFor="managed-client">Client / workspace name</label><input id="managed-client" required maxLength={120} value={clientName} onChange={(event) => setClientName(event.target.value)} /></div>
        <div className="field"><label htmlFor="managed-role">Role</label><select id="managed-role" value={role} disabled={self} onChange={(event) => setRole(event.target.value as UserRole)}><option value="CLIENT">Client</option><option value="ADMIN">Administrator</option></select><small>{self ? 'Your administrator access is protected.' : role === 'ADMIN' ? 'Can manage all users and access.' : 'Can manage their own workspace.'}</small></div>
        {target && <div className="field"><label htmlFor="managed-access">Account access</label><select id="managed-access" value={isActive ? 'active' : 'suspended'} disabled={self} onChange={(event) => setIsActive(event.target.value === 'active')}><option value="active">Active</option><option value="suspended">Suspended</option></select><small>{self ? 'You cannot suspend your own account.' : 'Suspending ends active sign-in sessions.'}</small></div>}
        {!self && <div className="field full"><label htmlFor="managed-password">{target ? 'New password (optional)' : 'Initial password'}</label><div className="password-wrap"><input id="managed-password" type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={1024} required={!target} value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="password-toggle" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><small>{target ? 'Leave blank to keep the current password.' : 'Use at least 12 characters. No email is sent automatically.'}</small></div>}
      </div>}
      {error && <div className="form-error" role="alert"><CircleAlert size={16} />{error}</div>}
      <div className="users-editor-footer"><button ref={cancelRef} className="campaign-status-button" type="button" disabled={busy} onClick={() => review ? setReview(false) : onClose()}>{review ? 'Back to edit' : 'Cancel'}</button><button className="primary-button" type="submit" disabled={busy}>{busy ? <RefreshCw size={16} className="spin" /> : review ? <ShieldCheck size={16} /> : <Plus size={16} />}{busy ? 'Saving…' : review ? 'Confirm changes' : target ? 'Save changes' : 'Create user'}</button></div>
    </form>
  </dialog>;
}

export function UserManagement({ currentUser, onSessionChanged, refreshKey }: { currentUser: User; onSessionChanged: () => Promise<void>; refreshKey: number }) {
  const [result, setResult] = useState<UserPage | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<{ user: ManagedUser | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    const timer = setTimeout(() => {
      api.users(search, page).then((data) => { if (!cancelled) setResult(data); }).catch((cause) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Could not load users.');
        if (cause instanceof ApiError && [401, 403].includes(cause.status)) void onSessionChanged().catch(() => {});
      }).finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, page, reload, refreshKey, onSessionChanged]);

  async function saved(message: string) {
    // A successful mutation stays successful even if a subsequent session refresh fails.
    setNotice(message); setReload((key) => key + 1);
    try { await onSessionChanged(); } catch { /* The next workspace refresh will retry. */ }
  }
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> ADMINISTRATION</div><h1>Users &amp; clients<span className="heading-dot">.</span></h1><p>Give every client their own space. Keep access under control.</p></div><button className="primary-button" onClick={() => { setNotice(''); setEditor({ user: null }); }}><Plus size={17} /> Add user</button></div>
    <div className="admin-access-note"><ShieldCheck size={21} /><p><strong>You’re managing Kurikira as an administrator.</strong><span>Clients access their own workspace. Administrators can manage users across all workspaces.</span></p></div>
    {notice && <div className="form-success" role="status"><CircleCheck size={16} />{notice}</div>}
    {error && <div className="global-error" role="alert"><CircleAlert size={16} />{error}<button onClick={() => setReload((key) => key + 1)}>Try again</button></div>}
    <section className="panel users-panel" aria-label="User management" aria-busy={loading}>
      <div className="users-toolbar"><div><h2>All users</h2><span>{result ? `${result.total} ${search ? 'matching ' : ''}${result.total === 1 ? 'user' : 'users'}` : 'Loading users…'}</span></div><div className="search-wrap"><Search size={17} /><input aria-label="Search users" placeholder="Search email or client…" maxLength={100} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div></div>
      {loading ? <div className="users-loading" role="status"><RefreshCw size={22} className="spin" /> Loading users…</div> : result?.users.length ? <><div className="users-list-labels" aria-hidden="true"><span>USER</span><span>CLIENT WORKSPACE</span><span>ROLE &amp; ACCESS</span><span /></div><ul className="users-list">{result.users.map((user) => <li className="users-list-row" key={user.id}>
        <div className="managed-user"><div className="managed-user-avatar">{user.email[0].toUpperCase()}</div><div><strong>{user.email}{user.id === currentUser.id && <span className="user-self-tag">You</span>}</strong><small>Joined {new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kigali', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(user.createdAt))}</small></div></div>
        <div className="managed-workspace"><small>Client workspace</small><strong>{user.client.name}</strong></div>
        <div className="managed-user-access"><span className={`user-role-badge ${user.role === 'ADMIN' ? 'admin' : ''}`}>{user.role === 'ADMIN' ? <ShieldCheck size={13} /> : <UserRound size={13} />}{user.role === 'ADMIN' ? 'Admin' : 'Client'}</span><span className={`user-access-status ${user.isActive ? '' : 'suspended'}`}><span />{user.isActive ? 'Active' : 'Suspended'}</span></div>
        <button className="campaign-status-button user-edit-button" aria-label={`Edit user ${user.email}`} onClick={() => { setNotice(''); setEditor({ user }); }}>Edit</button>
      </li>)}</ul></> : !error && <div className="empty-state"><strong>{search ? 'No matching users' : 'No users yet'}</strong><p>{search ? 'Try another email address or client name.' : 'Add a user to create their client workspace.'}</p></div>}
      {result && <div className="users-pagination"><span>Page {page} of {Math.max(1, Math.ceil(result.total / result.pageSize))}</span><div><button className="campaign-status-button" disabled={page <= 1 || loading} aria-label="Previous user page" onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} />Previous</button><button className="campaign-status-button" disabled={page * result.pageSize >= result.total || loading} aria-label="Next user page" onClick={() => setPage((value) => value + 1)}>Next<ChevronRight size={16} /></button></div></div>}
    </section>
    {editor && <UserEditor target={editor.user} currentUser={currentUser} onClose={() => setEditor(null)} onSaved={saved} />}
  </>;
}
