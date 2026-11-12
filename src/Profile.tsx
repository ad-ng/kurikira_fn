import { useEffect, useState, type FormEvent } from 'react';
import { Bell, Check, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { api, type Profile as ProfileData } from './api';

export function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [digest, setDigest] = useState<ProfileData['notificationDigest']>('WEEKLY');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  function apply(value: ProfileData) { setProfile(value); setEnabled(value.emailNotificationsEnabled); setDigest(value.notificationDigest); }
  useEffect(() => { let active = true; api.profile().then(value => { if (active) apply(value); }).catch(cause => { if (active) setError(cause.message || 'Could not load profile.'); }); return () => { active = false; }; }, []);
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try { apply(await api.updateProfile({ emailNotificationsEnabled: enabled, notificationDigest: digest })); setNotice('Your notification preferences are saved.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save preferences.'); }
    finally { setSaving(false); }
  }
  const dirty = !!profile && (enabled !== profile.emailNotificationsEnabled || digest !== profile.notificationDigest);
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR ACCOUNT</div><h1>Your profile<span className="heading-dot">.</span></h1><p>Your workspace details and the updates you want to receive.</p></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!profile ? <div className="panel empty-state">{error ? <button className="subtle-button" onClick={() => { setError(''); void api.profile().then(apply).catch(cause => setError(cause.message)); }}>Try again</button> : <RefreshCw className="spin" aria-label="Loading profile" />}</div> : <div className="profile-layout">
      <section className="panel profile-details" aria-label="Account details"><div className="profile-avatar">{profile.email[0].toUpperCase()}</div><p className="section-kicker">YOUR WORKSPACE</p><h2>{profile.client.name}</h2><dl><div><dt>Email address</dt><dd>{profile.email}</dd></div><div><dt>Account role</dt><dd>{profile.role === 'ADMIN' ? 'Administrator' : 'Client'}</dd></div><div><dt>Member since</dt><dd>{new Date(profile.createdAt).toLocaleDateString('en-GB', { timeZone: 'Africa/Kigali', day: 'numeric', month: 'long', year: 'numeric' })}</dd></div></dl></section>
      <form className="panel profile-preferences" onSubmit={save}><p className="section-kicker">STAY IN THE LOOP</p><h2>Notifications, your way.</h2><p>Choose what reaches your inbox. Your notifications are always available inside Kurikira.</p>
        <label className="notification-preference" htmlFor="email-notifications"><span className="preference-icon"><Mail size={22} /></span><span><strong>Email notifications</strong><small>Receive connection alerts, delivery issues, new leads, completed qualifications, account-access updates, and your chosen summaries.</small></span><input id="email-notifications" type="checkbox" role="switch" checked={enabled} disabled={saving} onChange={event => { setEnabled(event.target.checked); setNotice(''); }} /></label>
        <div className="notification-preference"><span className="preference-icon"><Bell size={22} /></span><span><strong>In-app notifications</strong><small>Your notification bell and inbox stay available, even when email is off.</small></span><span className="preference-always"><Check size={15} />Always on</span></div>
        <div className="field profile-digest"><label htmlFor="notification-digest">Campaign summary</label><select id="notification-digest" value={digest} disabled={saving} onChange={event => { setDigest(event.target.value as ProfileData['notificationDigest']); setNotice(''); }}><option value="WEEKLY">Weekly · Monday at 08:00</option><option value="DAILY">Daily · 08:00</option><option value="NONE">No campaign summaries</option></select><small>Times are Kigali time (CAT). Summaries appear in-app and are also emailed when email notifications are on.</small></div>
        <div className="profile-security"><ShieldCheck size={20} /><p>Verification codes, password resets, and password-security alerts are essential account emails and will still be sent.</p></div>
        {notice && <p className="form-success" role="status"><Check size={16} />{notice}</p>}
        <div className="profile-save"><span>{dirty ? 'Unsaved changes' : 'Preferences up to date'}</span><button className="primary-button" disabled={saving || !dirty} type="submit">{saving ? <RefreshCw className="spin" size={17} /> : <Check size={17} />}Save preferences</button></div>
      </form>
    </div>}
  </>;
}
