import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ExternalLink, Film, RefreshCw, Search, X } from 'lucide-react';
import { api, type Reel } from './api';

type Props = {
  accountId: string;
  value: string;
  onChange: (mediaId: string) => void;
  label: string;
  id: string;
};

function reelDate(timestamp: string | null) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function reelTitle(reel: Reel) {
  const caption = reel.caption?.trim();
  return caption || (reelDate(reel.timestamp) ? `Reel posted ${reelDate(reel.timestamp)}` : 'Untitled Reel');
}

export function ReelImage({ reel, className = 'reel-image', alt = '' }: { reel?: Reel; className?: string; alt?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const thumbnailUrl = reel?.thumbnailUrl;
  const hasImage = Boolean(thumbnailUrl && thumbnailUrl !== failedUrl);
  return <div className={className} role={hasImage ? undefined : 'img'} aria-label={hasImage ? undefined : 'Reel preview unavailable'}>
    {hasImage ? <img src={thumbnailUrl!} alt={alt} loading="lazy" onError={() => setFailedUrl(thumbnailUrl!)} /> : <Film size={27} strokeWidth={1.5} />}
  </div>;
}

export function ReelPicker({ accountId, value, onChange, label, id }: Props) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    setReels([]);
    setError('');
    if (!accountId) { setLoading(false); return; }
    setLoading(true);
    api.reels(accountId).then((items) => { if (!cancelled) setReels(items); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load Reels.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accountId, retry]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)')];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); triggerRef.current?.focus(); };
  }, [open]);

  const selected = reels.find((reel) => reel.id === value);
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return reels;
    return reels.filter((reel) => `${reel.caption || ''} ${reel.id} ${reelDate(reel.timestamp) || ''}`.toLocaleLowerCase().includes(term));
  }, [query, reels]);

  return <div className="field reel-field">
    <label id={`${id}-label`}>{label}</label>
    <button ref={triggerRef} className={`reel-selection ${value ? 'has-reel' : ''}`} type="button" aria-labelledby={`${id}-label`} onClick={() => { setQuery(''); setOpen(true); }} disabled={!accountId}>
      {selected ? <ReelImage reel={selected} /> : <div className="reel-image"><Film size={25} strokeWidth={1.5} /></div>}
      <span className="reel-selection-copy"><strong>{selected ? reelTitle(selected) : value ? 'Current Reel' : 'Choose a Reel'}</strong><small>{selected ? `${reelDate(selected.timestamp) || 'Date unavailable'} · ID ${selected.id}` : value ? `ID ${value} · Browse to change` : loading ? 'Loading your Reels…' : 'Browse by thumbnail, caption, date, or ID'}</small></span>
      <span className="reel-selection-action">{value ? 'Change' : 'Browse'}</span>
    </button>
    {error ? <div className="reel-field-note error">{error} <button type="button" onClick={() => setRetry((n) => n + 1)}>Retry</button></div> : <small>{loading ? 'Loading Reels from Instagram…' : `${reels.length} Reels available from this account`}</small>}

    {open && <div className="reel-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={dialogRef} className="reel-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-dialog-title`}>
        <header className="reel-dialog-header"><div><p className="section-kicker">INSTAGRAM LIBRARY</p><h2 id={`${id}-dialog-title`}>Choose a Reel</h2><p>Use the thumbnail and date to find the right post. Search captions or paste a Reel ID.</p></div><button className="reel-close" type="button" aria-label="Close Reel picker" onClick={() => setOpen(false)}><X size={21} /></button></header>
        <div className="reel-dialog-toolbar"><div className="reel-search"><Search size={19} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search caption, date, or Reel ID" aria-label="Search Reels" /></div><span>{visible.length} of {reels.length} Reels</span></div>
        <div className="reel-dialog-results">{loading ? <div className="reel-empty"><RefreshCw className="spin" size={25} /><strong>Loading your Reels</strong></div> : error ? <div className="reel-empty"><strong>Reels could not be loaded</strong><p>{error}</p><button type="button" className="subtle-button" onClick={() => setRetry((n) => n + 1)}>Try again</button></div> : !reels.length ? <div className="reel-empty"><Film size={28} /><strong>No Reels found</strong><p>Publish a Reel on this Instagram account, then reopen this picker.</p></div> : !visible.length ? <div className="reel-empty"><Search size={25} /><strong>No matching Reels</strong><p>Try a word from the caption, a posting date, or the Reel ID.</p><button type="button" className="subtle-button" onClick={() => setQuery('')}>Clear search</button></div> : <div className="reel-grid">{visible.map((reel) => <div className={`reel-card ${value === reel.id ? 'selected' : ''}`} key={reel.id}>
          <button type="button" className="reel-card-main" onClick={() => { onChange(reel.id); setOpen(false); }} aria-label={`Select ${reelTitle(reel)}, ID ${reel.id}`}><ReelImage reel={reel} /><span className="reel-card-copy"><strong title={reel.caption || undefined}>{reelTitle(reel)}</strong><small>{reelDate(reel.timestamp) || 'Date unavailable'}</small><small className="reel-id">ID {reel.id}</small></span><span className="reel-card-check">{value === reel.id && <Check size={15} />}</span></button>
          {reel.permalink && <a className="reel-instagram-link" href={reel.permalink} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>View on Instagram <ExternalLink size={13} /></a>}
        </div>)}</div>}</div>
        <footer className="reel-dialog-footer"><span>{value ? `Selected Reel ID ${value}` : 'Select a Reel to continue'}</span><button type="button" className="subtle-button" onClick={() => setOpen(false)}>Done</button></footer>
      </section>
    </div>}
  </div>;
}
