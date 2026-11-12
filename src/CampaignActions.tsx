import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pause, Play, RefreshCw, Trash2, X } from 'lucide-react';
import { api, type Campaign } from './api';

type Action = 'pause' | 'delete';
type Props = {
  campaign: Campaign;
  disabled?: boolean;
  onSaved: () => Promise<void>;
  onDeleted: () => void;
  onNotice: (message: string) => void;
  onStatusChanged?: (active: boolean) => void;
};

export function CampaignActions({ campaign, disabled = false, onSaved, onDeleted, onNotice, onStatusChanged }: Props) {
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const locked = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const deleting = action === 'delete';

  useEffect(() => {
    if (!action) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    cancelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const blockEscapeWhileSaving = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && locked.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('keydown', blockEscapeWhileSaving, true);
    return () => {
      document.removeEventListener('keydown', blockEscapeWhileSaving, true);
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [action]);

  function requestAction(next: Action) {
    setError(''); onNotice(''); setAction(next);
  }

  async function execute(next: Action | 'resume') {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError(''); onNotice('');
    try {
      if (next === 'delete') await api.deleteCampaign(campaign.id);
      else {
        const active = next === 'resume';
        await api.updateCampaign(campaign.id, { active });
        onStatusChanged?.(active);
      }
      // Close only after the mutation succeeds; failures stay in the dialog for retry.
      setAction(null);
      if (next === 'delete') onDeleted();
      await onSaved();
      onNotice(`${campaign.keyword}: campaign ${next === 'delete' ? 'deleted' : next === 'pause' ? 'paused' : 'resumed'}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this campaign. Please try again.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return <>
    <div className="campaign-actions">
      <button className="campaign-status-button" type="button" disabled={disabled || busy} onClick={() => campaign.active ? requestAction('pause') : void execute('resume')} aria-label={`${campaign.active ? 'Pause' : 'Resume'} campaign ${campaign.keyword}`}>
        {busy && !action ? <RefreshCw size={15} className="spin" /> : campaign.active ? <Pause size={15} /> : <Play size={15} />}
        {busy && !action ? 'Saving…' : campaign.active ? 'Pause campaign' : 'Resume campaign'}
      </button>
      <button className="campaign-delete-button" type="button" disabled={disabled || busy} onClick={() => requestAction('delete')} aria-label={`Delete campaign ${campaign.keyword}`} title="Delete campaign"><Trash2 size={17} /><span>Delete</span></button>
    </div>
    {error && !action && <div className="form-error" role="alert">{error}</div>}
    {action && createPortal(<dialog ref={dialogRef} className="campaign-confirm-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); if (!locked.current) setAction(null); }}
      onClick={(event) => { if (event.target === event.currentTarget && !locked.current) setAction(null); }}>
      <div className="campaign-confirm-content">
        <button type="button" className="campaign-confirm-close" aria-label="Close confirmation" disabled={busy} onClick={() => setAction(null)}><X size={19} /></button>
        <div className={`campaign-confirm-icon ${deleting ? 'danger' : ''}`}>{deleting ? <Trash2 size={25} /> : <Pause size={25} />}</div>
        <p className="section-kicker">{deleting ? 'DELETE CAMPAIGN' : 'PAUSE AUTOMATION'}</p>
        <h2 id={titleId}>{deleting ? 'Delete this campaign?' : 'Pause this campaign?'}</h2>
        <p id={descriptionId} className="campaign-confirm-description">{deleting ? 'This permanently removes the campaign, its activity, analytics, questionnaire answers, and leads with no other campaign. Shared leads stay with their remaining campaigns. This cannot be undone. Your Reel stays on Instagram.' : 'New matching comments will no longer trigger replies for this campaign. Your settings will be kept, and you can resume it whenever you’re ready.'}</p>
        <div className="campaign-confirm-summary"><strong>{campaign.keyword}</strong><span>Reel {campaign.mediaId}</span><span className={`feature-state ${campaign.active ? '' : 'paused'}`}><span />{campaign.active ? 'Active' : 'Paused'}</span></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="campaign-confirm-footer"><button ref={cancelRef} type="button" className="campaign-status-button" disabled={busy} onClick={() => setAction(null)}>Cancel</button><button type="button" className={`primary-button ${deleting ? 'campaign-confirm-delete' : ''}`} disabled={busy} onClick={() => void execute(action)}>{busy ? <RefreshCw size={16} className="spin" /> : deleting ? <Trash2 size={16} /> : <Pause size={16} />}{busy ? deleting ? 'Deleting…' : 'Pausing…' : deleting ? 'Delete campaign' : 'Pause campaign'}</button></div>
      </div>
    </dialog>, document.body)}
  </>;
}
