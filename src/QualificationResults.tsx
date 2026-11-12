import { useState } from 'react';
import { CircleAlert, ListOrdered, RefreshCw } from 'lucide-react';
import { api, type QualificationSession } from './api';

export function QualificationResults({ sessions, leadId, onStopped }: { sessions: QualificationSession[]; leadId: string; onStopped: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function stop() {
    setBusy(true); setError('');
    try { await api.stopQualification(leadId); await onStopped(); setConfirm(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not stop the questionnaire.'); }
    finally { setBusy(false); }
  }
  if (!sessions.length) return null;
  return <section className="lead-qualification-results"><p className="section-kicker">QUALIFICATION ANSWERS</p><h3><ListOrdered size={17} /> Campaign questionnaires</h3>{sessions.map((session, index) => <div className="qualification-session" key={session.id}><div className="qualification-session-header"><strong>{session.campaignKeyword}</strong><span className={`status-badge ${session.state === 'COMPLETED' ? 'success' : session.state === 'NEEDS_REVIEW' ? 'warning' : 'neutral'}`}>{session.state === 'COMPLETED' ? 'Completed' : session.state === 'STOPPED' ? 'Stopped' : session.state === 'NEEDS_REVIEW' ? 'Needs review' : !session.initialAccepted ? 'Opening DM pending' : session.awaitingReply ? 'Waiting for answer' : 'Preparing reply'}</span></div><p>{session.answers.length} of {session.questions.length} answers saved{session.state === 'WAITING' && session.initialAccepted && session.awaitingReply && session.questions[session.nextQuestion] ? ` · Next: ${session.questions[session.nextQuestion].label}` : ''}</p>{session.state === 'NEEDS_REVIEW' && <p>Check the Instagram conversation before starting again. No automatic retry will be sent.{session.replies[0]?.errorCode ? ` Error: ${session.replies[0].errorCode}.` : ''}</p>}{session.replies[0]?.status === 'SENDING' && <p>A reply is being sent. If this remains unchanged, check Instagram before restarting.</p>}<dl className="qualification-answers">{session.answers.map((answer) => <div key={answer.questionId}><dt>{answer.label}</dt><dd>{answer.answer}</dd></div>)}</dl>{index === 0 && ['WAITING', 'NEEDS_REVIEW'].includes(session.state) && <>{!confirm ? <button className="subtle-button" type="button" onClick={() => setConfirm(true)}>Stop questionnaire</button> : <div className="qualification-stop-confirm"><strong>Stop asking questions?</strong><p>Saved answers will be kept. A message already being sent may still arrive.</p><div><button type="button" className="campaign-status-button" disabled={busy} onClick={() => setConfirm(false)}>Keep running</button><button type="button" className="campaign-status-button" disabled={busy} onClick={() => void stop()}>{busy && <RefreshCw size={14} className="spin" />}Stop questionnaire</button></div></div>}</>}</div>)}{error && <div className="form-error" role="alert"><CircleAlert size={15} />{error}</div>}</section>;
}
