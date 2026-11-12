import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, CircleAlert, ListOrdered, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api, type QualificationFlow, type QualificationQuestion } from './api';

export const questionText = (question: QualificationQuestion) => question.prompt + (question.type === 'CHOICE' ? '\n' + question.options.map((option, index) => `${index + 1}. ${option}`).join('\n') + '\nReply with a number or option.' : '');
const propertyTemplate = (): QualificationFlow => ({ completionMessage: 'Thank you! Our team will review your preferences and contact you to arrange a visit.', questions: [
  { id: crypto.randomUUID(), label: 'Budget', prompt: 'What is your budget? Please include the currency.', type: 'TEXT', options: [] },
  { id: crypto.randomUUID(), label: 'Preferred location', prompt: 'Which area or location would you prefer?', type: 'TEXT', options: [] },
  { id: crypto.randomUUID(), label: 'Bedrooms', prompt: 'How many bedrooms would you like?', type: 'NUMBER', options: [] },
  { id: crypto.randomUUID(), label: 'Visit time', prompt: 'When would you like to visit the property?', type: 'TEXT', options: [] }
] });

export function QuestionFlowBuilder({ accountId, value, onChange }: { accountId: string; value: QualificationFlow | null; onChange: (value: QualificationFlow | null) => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false; setEnabled(null); setError('');
    if (!value || !accountId) return;
    api.messagingStatus(accountId).then((status) => { if (!cancelled) setEnabled(status.enabled); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not check Instagram messaging.'); });
    return () => { cancelled = true; };
  }, [accountId, Boolean(value)]);
  async function enable() {
    setBusy(true); setError('');
    try { const status = await api.enableMessaging(accountId); setEnabled(status.enabled); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not enable Instagram replies.'); }
    finally { setBusy(false); }
  }
  function update(index: number, change: Partial<QualificationQuestion>) { if (value) onChange({ ...value, questions: value.questions.map((question, i) => i === index ? { ...question, ...change } : question) }); }
  function move(index: number, step: number) { if (!value) return; const questions = [...value.questions]; [questions[index], questions[index + step]] = [questions[index + step], questions[index]]; onChange({ ...value, questions }); }
  return <section className={`public-reply-section qualification-builder ${value ? 'enabled' : ''}`} aria-labelledby="qualification-builder-title"><div className="public-reply-heading"><div className="public-reply-icon"><ListOrdered size={21} /></div><div><h3 id="qualification-builder-title">Ask questions in Instagram DMs</h3><p>Collect answers one at a time and save them to the lead.</p></div><label className="public-reply-switch"><input type="checkbox" aria-label="Enable campaign questionnaire" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked ? propertyTemplate() : null)} /><span aria-hidden="true" /></label></div>
    {value && <div className="public-reply-body"><div className="qualification-setup"><div><strong>{enabled ? <><Check size={15} />Account subscribed for replies</> : 'Connect Instagram message replies'}</strong><p>{enabled ? 'Test from another Instagram account before launching. If replies do not appear in Leads, ask your administrator to check the Instagram message setup.' : 'Allow Kurikira to receive replies from your Instagram account. Unrelated conversations are ignored. Enable this before activating the questionnaire, or save the campaign as paused.'}</p></div><button className="campaign-status-button" type="button" disabled={!accountId || busy} onClick={() => void enable()}>{busy ? <RefreshCw size={15} className="spin" /> : null}{enabled ? 'Reconnect replies' : 'Enable message replies'}</button></div>{error && <div className="form-error" role="alert"><CircleAlert size={16} />{error}</div>}
      <p className="growth-note">The first question is included in your opening DM. Each answer unlocks the next question. An optional campaign link is included in the opening DM. People can reply STOP or CANCEL at any time.</p>
      <ol className="qualification-questions">{value.questions.map((question, index) => <li key={question.id}><div className="qualification-question-header"><span>QUESTION {index + 1}</span><div><button type="button" className="qualification-icon-button" disabled={index === 0} aria-label={`Move question ${index + 1} up`} onClick={() => move(index, -1)}><ArrowUp size={15} /></button><button type="button" className="qualification-icon-button" disabled={index === value.questions.length - 1} aria-label={`Move question ${index + 1} down`} onClick={() => move(index, 1)}><ArrowDown size={15} /></button><button type="button" className="qualification-icon-button danger" disabled={value.questions.length === 1} aria-label={`Remove question ${index + 1}`} onClick={() => onChange({ ...value, questions: value.questions.filter((_, i) => i !== index) })}><Trash2 size={15} /></button></div></div><div className="form-grid"><div className="field"><label htmlFor={`question-label-${question.id}`}>Save answer as</label><input id={`question-label-${question.id}`} value={question.label} maxLength={60} required onChange={(event) => update(index, { label: event.target.value })} placeholder="Budget" /></div><div className="field"><label htmlFor={`question-type-${question.id}`}>Answer type</label><select id={`question-type-${question.id}`} value={question.type} onChange={(event) => update(index, { type: event.target.value as QualificationQuestion['type'], options: event.target.value === 'CHOICE' ? ['Yes', 'No'] : [] })}><option value="TEXT">Text</option><option value="NUMBER">Number</option><option value="CHOICE">Multiple choice</option></select></div><div className="field full"><label htmlFor={`question-prompt-${question.id}`}>Question to send</label><textarea id={`question-prompt-${question.id}`} rows={2} required maxLength={300} value={question.prompt} onChange={(event) => update(index, { prompt: event.target.value })} /></div>{question.type === 'CHOICE' && <div className="field full"><label htmlFor={`question-options-${question.id}`}>Options, one per line</label><textarea id={`question-options-${question.id}`} rows={3} value={question.options.join('\n')} required onChange={(event) => update(index, { options: event.target.value.split('\n') })} /><small>Use 2–8 options, up to 40 characters each. People can reply with the option or its number.</small></div>}</div></li>)}</ol>
      <button className="subtle-button" type="button" disabled={value.questions.length >= 10} onClick={() => onChange({ ...value, questions: [...value.questions, { id: crypto.randomUUID(), label: '', prompt: '', type: 'TEXT', options: [] }] })}><Plus size={15} />Add question <span>({value.questions.length}/10)</span></button>
      <div className="field qualification-completion"><label htmlFor="qualification-completion">Completion message</label><textarea id="qualification-completion" rows={3} required maxLength={400} value={value.completionMessage} onChange={(event) => onChange({ ...value, completionMessage: event.target.value })} /><small>Sent exactly as written, without an automatically added campaign link. Answers stay visible in Leads while the campaign exists. Deleting the campaign removes its answers.</small></div>
      <p className="growth-note">Question edits apply to new conversations. Existing conversations keep their original questions. Automated replies stop outside Instagram’s messaging window; a conversation needing review is not retried automatically.</p>
    </div>}
  </section>;
}
