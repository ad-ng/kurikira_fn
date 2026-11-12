import { useEffect, useState, type KeyboardEvent } from 'react';
import { ArrowRight, BarChart3, CircleAlert, MessageCircle, MousePointerClick, RefreshCw, Send, UsersRound } from 'lucide-react';
import { api, type AnalyticsReport, type Campaign } from './api';

function ActivityChart({ timeline }: { timeline: AnalyticsReport['timeline'] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const index = Math.min(selected ?? timeline.length - 1, timeline.length - 1);
  const current = timeline[index];
  const max = Math.max(1, ...timeline.map((item) => item.matched));
  const point = (i: number, value: number) => `${20 + i / Math.max(1, timeline.length - 1) * 760},${175 - value / max * 145}`;
  const onKey = (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    setSelected(event.key === 'Home' ? 0 : event.key === 'End' ? timeline.length - 1 : Math.max(0, Math.min(timeline.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1))));
  };
  return <div className="analytics-chart" tabIndex={0} role="group" aria-label="Daily comment activity. Use left and right arrow keys to explore dates." onKeyDown={onKey} onPointerMove={(event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSelected(Math.max(0, Math.min(timeline.length - 1, Math.round(((event.clientX - rect.left) / rect.width * 800 - 20) / 760 * (timeline.length - 1)))));
  }}>
    <div className="chart-readout" aria-live="polite"><span>{current?.date}</span><strong>{current?.matched || 0} comments</strong><span>{current?.accepted || 0} DMs accepted</span></div>
    <svg viewBox="0 0 800 205" role="img" aria-label="Matching comments and accepted private messages by day">
      {[0, .5, 1].map((fraction) => <g key={fraction}><line x1="20" x2="780" y1={175 - fraction * 145} y2={175 - fraction * 145} stroke="#eae7e1" strokeDasharray="4 5" /><text x="20" y={165 - fraction * 145} fontSize="10" fill="#a1a8af">{Math.round(max * fraction)}</text></g>)}
      <polyline points={timeline.map((item, i) => point(i, item.matched)).join(' ')} fill="none" stroke="#e47b5e" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={timeline.map((item, i) => point(i, item.accepted)).join(' ')} fill="none" stroke="#7caa91" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {current && <><line x1={20 + index / Math.max(1, timeline.length - 1) * 760} x2={20 + index / Math.max(1, timeline.length - 1) * 760} y1="20" y2="175" stroke="#c9c5bd" /><circle cx={point(index, current.matched).split(',')[0]} cy={point(index, current.matched).split(',')[1]} r="4" fill="#e47b5e" stroke="white" strokeWidth="2" /></>}
      <text x="20" y="199" fontSize="10" fill="#99a2ad">{timeline[0]?.date}</text><text x="780" y="199" textAnchor="end" fontSize="10" fill="#99a2ad">{timeline.at(-1)?.date}</text>
    </svg>
  </div>;
}

export function AnalyticsView({ campaigns, campaignId, refreshKey, onCampaignChange, onOpenCampaign, onLeads }: { campaigns: Campaign[]; campaignId?: string; refreshKey: number; onCampaignChange: (id: string) => void; onOpenCampaign: (id: string) => void; onLeads: (id?: string) => void }) {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setReport(null);
    api.analytics(days, campaignId).then((data) => { if (!cancelled) setReport(data); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load campaign analytics.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days, campaignId, refreshKey, retry]);
  const summary = report?.summary;
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> CAMPAIGN PERFORMANCE</div><h1>Know what works<span className="heading-dot">.</span></h1><p>Follow the journey from Reel comments to conversations and customers.</p></div><button className="campaign-status-button" onClick={() => onLeads(campaignId)}><UsersRound size={17} /> Manage leads <ArrowRight size={15} /></button></div>
    <div className="growth-filters"><div className="field"><label htmlFor="analytics-campaign">Campaign</label><select id="analytics-campaign" value={campaignId || ''} onChange={(event) => onCampaignChange(event.target.value)}><option value="">All campaigns</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.keyword} · {campaign.mediaId}</option>)}</select></div><div className="field"><label htmlFor="analytics-period">Period</label><select id="analytics-period" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={0}>All time</option></select></div><span>Dates shown in Kigali (CAT)</span></div>
    {error && <div className="global-error" role="alert"><CircleAlert size={17} />{error}<button onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
    {loading ? <div className="users-loading" role="status"><RefreshCw size={24} className="spin" />Loading performance…</div> : report && summary && <>
      <section className="metrics-grid growth-metrics" aria-label="Campaign metrics">{[
        { label: 'Matching comments', value: summary.matched, icon: MessageCircle, note: 'Comments that triggered a campaign' },
        { label: 'DMs accepted', value: summary.accepted, icon: Send, note: `${summary.acceptanceRate}% of matching comments` },
        { label: 'Tracked link clicks', value: summary.clicks, icon: MousePointerClick, note: `${summary.clickedMessages} distinct message links clicked` },
        { label: 'Unique leads', value: summary.leads, icon: UsersRound, note: 'Distinct contacts per Instagram account' }
      ].map(({ label, value, icon: Icon, note }) => <div className="metric-card" key={label}><div className="metric-head"><span>{label}</span><div className="metric-icon coral"><Icon size={18} /></div></div><div className="metric-value">{value.toLocaleString()}</div><div className="metric-foot">{note}</div></div>)}</section>
      <div className="analytics-main-grid"><section className="panel analytics-activity"><div className="panel-heading"><div><p className="section-kicker">DAILY ACTIVITY</p><h2>Comments into conversations</h2></div><BarChart3 size={21} className="muted-icon" /></div><div className="chart-legend"><span><i />Matching comments</span><span><i />DMs accepted</span></div><ActivityChart key={`${days}-${campaignId || ''}`} timeline={report.timeline} />{days === 0 && <p className="growth-note">Chart shows the last 90 days. Totals cover all time.</p>}<details className="chart-data"><summary>View daily numbers</summary><div className="table-wrap"><table><thead><tr><th>DATE</th><th>COMMENTS</th><th>DMS ACCEPTED</th></tr></thead><tbody>{report.timeline.map((item) => <tr key={item.date}><td>{item.date}</td><td>{item.matched}</td><td>{item.accepted}</td></tr>)}</tbody></table></div></details></section>
      <section className="panel analytics-outcomes"><p className="section-kicker">BEYOND THE FIRST MESSAGE</p><h2>Campaign outcomes</h2><dl><div><dt>Public replies accepted</dt><dd>{summary.publicReplies}</dd></div><div><dt>Messages with a link click</dt><dd>{summary.clickRate}%</dd></div><div><dt>Marked as customer</dt><dd>{summary.customers}</dd></div><div><dt>Private replies rejected</dt><dd>{summary.rejected}</dd></div><div><dt>Needs review</dt><dd>{summary.needsReview}</dd></div><div><dt>Private replies pending</dt><dd>{summary.pending}</dd></div></dl><p>“Accepted” means Meta accepted the send; it does not confirm the message was read. Customer stages are updated by you.</p></section></div>
      <section className="panel analytics-campaigns"><div className="panel-heading"><div><p className="section-kicker">COMPARE YOUR CAMPAIGNS</p><h2>Performance by Reel</h2></div></div>{report.campaigns.length ? <div className="table-wrap"><table><thead><tr><th>CAMPAIGN</th><th>COMMENTS</th><th>DMS ACCEPTED</th><th>PUBLIC REPLIES</th><th>CLICKS</th><th>LEADS</th><th>CUSTOMERS</th></tr></thead><tbody>{report.campaigns.filter(campaign => campaign.id !== null).map((campaign) => <tr key={campaign.id!}><td>{campaign.id ? <button className="subtle-button" onClick={() => onOpenCampaign(campaign.id!)}>{campaign.keyword}<ArrowRight size={13} /></button> : campaign.keyword}<small className="analytics-reel">{campaign.account.username ? `@${campaign.account.username} · ` : ''}{campaign.mediaId ? `Reel ${campaign.mediaId}` : ''}</small></td><td>{campaign.matched}</td><td>{campaign.accepted}</td><td>{campaign.publicReplies}</td><td>{campaign.clicks}</td><td>{campaign.id ? <button className="analytics-leads-link" onClick={() => onLeads(campaign.id!)} aria-label={`View leads for ${campaign.keyword}`}>{campaign.leads}</button> : campaign.leads}</td><td>{campaign.customers}</td></tr>)}</tbody></table></div> : <div className="empty-state"><strong>No campaigns yet</strong><p>Campaign results will appear here after you create your first automation.</p></div>}</section>
      <p className="growth-note">Results use comments received in the selected period; tracked clicks must also occur in that period. Clicks can include repeated visits or automated previews. Tracking starts with newly sent messages; older direct links have no click history.</p>
    </>}
  </>;
}
