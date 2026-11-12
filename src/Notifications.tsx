import { Bell, Check, CircleAlert, Instagram, RefreshCw, UsersRound } from 'lucide-react';
import { api, type NotificationPage, type WorkspaceNotification } from './api';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useNotificationInbox(enabled: boolean) {
  const [page, setPage] = useState<NotificationPage>({ notifications: [], unreadCount: 0, nextCursor: null, fetchedAt: new Date().toISOString() });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const loading = useRef(false);
  const mounted = useRef(true);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    // Polling never overlaps a read/load-more operation.
    if (!enabled || loading.current) return;
    const version = ++revision.current;
    try { const value = await api.notifications(); if (mounted.current && revision.current === version) { setPage(current => current.notifications.length > 20 && value.notifications.some(row => current.notifications.some(existing => existing.id === row.id)) ? { ...value, notifications: [...value.notifications, ...current.notifications.filter(row => !value.notifications.some(fresh => fresh.id === row.id))], nextCursor: current.nextCursor } : value); setError(''); } }
    catch (cause) { if (mounted.current && revision.current === version) setError(cause instanceof Error ? cause.message : 'Could not load notifications.'); }
  }, [enabled]);
  useEffect(() => {
    mounted.current = true;
    if (!enabled) { setPage({ notifications: [], unreadCount: 0, nextCursor: null, fetchedAt: new Date().toISOString() }); setError(''); return; }
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30000);
    return () => { mounted.current = false; revision.current++; clearInterval(timer); };
  }, [enabled, refresh]);
  async function read(item: WorkspaceNotification) {
    if (loading.current || item.readAt) return;
    loading.current = true; revision.current++;
    try {
      await api.readNotification(item.id);
      if (mounted.current) setPage(current => ({ ...current, unreadCount: Math.max(0, current.unreadCount - 1), notifications: current.notifications.map(row => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row) }));
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not mark notification as read.'); }
    finally { loading.current = false; }
  }
  async function readAll() {
    if (loading.current) return;
    loading.current = true; revision.current++; setBusy(true);
    try { await api.readAllNotifications(page.fetchedAt); if (mounted.current) setPage(current => ({ ...current, unreadCount: 0, notifications: current.notifications.map(row => ({ ...row, readAt: row.readAt || new Date().toISOString() })) })); }
    catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not mark notifications as read.'); }
    finally { loading.current = false; if (mounted.current) setBusy(false); void refresh(); }
  }
  async function loadMore() {
    if (!page.nextCursor || loading.current) return;
    loading.current = true; revision.current++; setBusy(true);
    try { const value = await api.notifications(page.nextCursor); if (mounted.current) setPage(current => ({ ...value, notifications: [...current.notifications, ...value.notifications.filter(row => !current.notifications.some(existing => existing.id === row.id))] })); }
    catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not load more notifications.'); }
    finally { loading.current = false; if (mounted.current) setBusy(false); }
  }
  return { ...page, error, busy, refresh, read, readAll, loadMore };
}
export type NotificationInbox = ReturnType<typeof useNotificationInbox>;

export function NotificationBell({ inbox, onOpen }: { inbox: NotificationInbox; onOpen: () => void }) {
  return <button className="icon-button notification-bell" onClick={onOpen} aria-label={`Notifications${inbox.unreadCount ? `, ${inbox.unreadCount} unread` : ''}`} title="Notifications"><Bell size={19} />{inbox.unreadCount > 0 && <span className="notification-count">{inbox.unreadCount > 99 ? '99+' : inbox.unreadCount}</span>}</button>;
}

export function Notifications({ inbox, onOpen, onProfile }: { inbox: NotificationInbox; onOpen: (href: string) => void; onProfile: () => void }) {
  const date = (value: string) => new Date(value).toLocaleString('en-GB', { timeZone: 'Africa/Kigali', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> WORKSPACE UPDATES</div><h1>Your notifications<span className="heading-dot">.</span></h1><p>{inbox.unreadCount ? `${inbox.unreadCount} unread updates from your workspace.` : 'You’re all caught up. New updates will appear here.'}</p></div><button className="campaign-status-button" disabled={inbox.busy || !inbox.unreadCount} onClick={() => void inbox.readAll()}><Check size={17} />Mark all as read</button></div>
    {inbox.error && <div className="form-error" role="alert">{inbox.error}<button className="subtle-button" onClick={() => void inbox.refresh()}>Try again</button></div>}
    <section className="panel notifications-panel" aria-label="Notification inbox">{inbox.notifications.length ? <ul className="notification-list">{inbox.notifications.map(item => {
      const Icon = item.type === 'CONNECTION_ATTENTION' ? Instagram : item.type === 'DELIVERY_FAILED' || item.type === 'ACCOUNT_ACCESS_CHANGED' ? CircleAlert : item.type === 'NEW_LEAD' ? UsersRound : Bell;
      return <li key={item.id} className={item.readAt ? '' : 'unread'}><button className="notification-item" onClick={() => { void inbox.read(item); onOpen(item.href); }}><span className={`notification-type ${item.type === 'DELIVERY_FAILED' ? 'attention' : ''}`}><Icon size={20} /></span><span className="notification-copy"><strong>{!item.readAt && <span className="notification-unread-dot" aria-label="Unread" />}{item.title}</strong><span>{item.body}</span><small>{date(item.createdAt)} · CAT</small></span></button>{!item.readAt && <button className="notification-read-button" title="Mark as read" aria-label={`Mark “${item.title}” as read`} onClick={() => void inbox.read(item)}><Check size={17} /></button>}</li>;
    })}</ul> : <div className="empty-state"><div className="empty-icon"><Bell size={25} /></div><strong>No notifications yet</strong><p>Connection alerts, leads, qualifications, and campaign summaries will appear here.</p></div>}{inbox.nextCursor && <div className="notification-load-more"><button className="subtle-button" disabled={inbox.busy} onClick={() => void inbox.loadMore()}>{inbox.busy ? <RefreshCw className="spin" size={16} /> : 'Load older notifications'}</button></div>}</section>
    <p className="notification-preferences-link">Choose which updates reach your inbox in <button className="subtle-button" onClick={onProfile}>Profile & notification preferences</button>.</p>
  </>;
}
