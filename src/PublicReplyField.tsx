import { useId, useState } from 'react';
import { MessageCircle } from 'lucide-react';

export function PublicReplyField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [enabled, setEnabled] = useState(Boolean(value));
  const id = useId();
  return <section className={`public-reply-section ${enabled ? 'enabled' : ''}`} aria-labelledby={`${id}-title`}>
    <div className="public-reply-heading"><div className="public-reply-icon"><MessageCircle size={20} /></div><div><h3 id={`${id}-title`}>Follow-up comment reply</h3><p>Reply publicly to the original comment after the private message succeeds.</p></div><label className="public-reply-switch"><input type="checkbox" checked={enabled} aria-label="Enable follow-up comment reply" onChange={(event) => { setEnabled(event.target.checked); onChange(event.target.checked ? value || 'Just sent you a message! Check your inbox.' : ''); }} /><span aria-hidden="true" /></label></div>
    {enabled && <div className="public-reply-body"><div className="field"><label htmlFor={`${id}-text`}>Public reply text</label><textarea id={`${id}-text`} rows={3} maxLength={800} value={value} onChange={(event) => onChange(event.target.value)} required placeholder="Just sent you a message! Check your inbox." /><small>{value.length}/800 characters · Visible to everyone in the Reel’s comments.</small></div><div className="public-reply-preview"><span>COMMENT REPLY PREVIEW</span><p><MessageCircle size={16} /><span>{value || 'Your public reply will appear here.'}</span></p></div></div>}
  </section>;
}
