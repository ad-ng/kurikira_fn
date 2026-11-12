const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

export type QualificationQuestion = { id: string; label: string; prompt: string; type: 'TEXT' | 'NUMBER' | 'CHOICE'; options: string[] };
export type QualificationFlow = { questions: QualificationQuestion[]; completionMessage: string };
export type QualificationSession = { id: string; campaignKeyword: string; state: 'WAITING' | 'COMPLETED' | 'STOPPED' | 'NEEDS_REVIEW'; initialAccepted: boolean; awaitingReply: boolean; questions: QualificationQuestion[]; answers: { questionId: string; label: string; question: string; answer: string; answeredAt: string }[]; nextQuestion: number; updatedAt: string; createdAt: string; replies: { status: CommentStatus; errorCode: string | null }[] };
export type Campaign = {
  id: string;
  accountId: string;
  mediaId: string;
  keyword: string;
  replyText: string;
  publicReplyText: string | null;
  qualificationFlow: QualificationFlow | null;
  demoLink: string;
  active: boolean;
  createdAt: string;
};

export type Overview = {
  activeCampaigns: number;
  accepted: number;
  rejected: number;
  needsReview: number;
  pending: number;
  lastWebhookAt: string | null;
};

export type Account = { id: string; username: string | null; tokenExpiresAt: string | null; createdAt: string };
export type Reel = { id: string; caption: string | null; permalink: string | null; thumbnailUrl: string | null; timestamp: string | null };
export type WorkspaceNotification = { id: string; type: string; title: string; body: string; href: string; readAt: string | null; createdAt: string };
export type NotificationPage = { notifications: WorkspaceNotification[]; unreadCount: number; nextCursor: string | null; fetchedAt: string };
export type Profile = { id: string; email: string; role: UserRole; createdAt: string; emailNotificationsEnabled: boolean; notificationDigest: 'DAILY' | 'WEEKLY' | 'NONE'; client: { name: string } };
export type UserRole = 'CLIENT' | 'ADMIN';
export type EmailChallenge = { authenticated: false; verificationRequired: true; email: string; verificationId: string; expiresIn: number; resendAfter: number; message: string };
export type User = { id: string; email: string; role: UserRole };
export type ManagedUser = User & { isActive: boolean; createdAt: string; client: { id: string; name: string } };
export type UserInput = { email: string; clientName: string; role: UserRole; password?: string; isActive?: boolean };
export type UserPage = { users: ManagedUser[]; total: number; page: number; pageSize: number };

export type CommentStatus = 'PENDING' | 'IGNORED' | 'SENDING' | 'ACCEPTED' | 'REJECTED' | 'UNCERTAIN';

export type Comment = {
  id: string;
  commentId: string;
  mediaId: string;
  text: string;
  status: CommentStatus;
  metaMessageId: string | null;
  metaErrorCode: string | null;
  publicReplyStatus: CommentStatus | null;
  publicReplyErrorCode: string | null;
  createdAt: string;
  claimedAt: string | null;
  completedAt: string | null;
  campaign: { id: string; keyword: string } | null;
};

export type LeadStage = 'NEW' | 'CONTACTED' | 'CUSTOMER' | 'LOST';
export type Lead = { id: string; authorId: string; username: string | null; name: string | null; email: string | null; phone: string | null; notes: string; stage: LeadStage; firstCampaignId: string | null; firstCampaignKeyword: string | null; lastCommentAt: string; createdAt: string; updatedAt: string; account: { id: string; username: string | null }; _count: { comments: number } };
export type LeadDetail = Lead & { qualificationSessions: QualificationSession[]; comments: { id: string; text: string; createdAt: string; status: CommentStatus; campaignId: string | null; campaignKeyword: string | null; publicReplyStatus: CommentStatus | null }[] };
export type LeadPage = { leads: Lead[]; total: number; page: number; pageSize: number; stages: Partial<Record<LeadStage, number>> };
export type Performance = { matched: number; accepted: number; publicReplies: number; rejected: number; needsReview: number; pending: number; leads: number; customers: number; clicks: number; clickedMessages: number; acceptanceRate: number; clickRate: number };
export type AnalyticsReport = { days: number; generatedAt: string; summary: Performance; campaigns: (Performance & { id: string | null; keyword: string; mediaId: string; active: boolean; account: { username: string | null } })[]; timeline: { date: string; matched: number; accepted: number }[] };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, Array.isArray(body.message) ? body.message.join(', ') : body.message || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  profile: () => request<Profile>('/api/profile'),
  updateProfile: (data: Pick<Profile, 'emailNotificationsEnabled' | 'notificationDigest'>) => request<Profile>('/api/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  notifications: (cursor?: string) => request<NotificationPage>(`/api/notifications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  readNotification: (id: string) => request<{ read: true }>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  readAllNotifications: (before: string) => request<{ read: true }>('/api/notifications/read-all', { method: 'POST', body: JSON.stringify({ before }) }),
  session: () => request<{ authenticated: boolean; user: User | null }>('/auth/session'),
  login: (email: string, password: string) => request<{ authenticated: boolean; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string) => request<EmailChallenge>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  verifyEmail: (email: string, verificationId: string, code: string) => request<{ authenticated: true; user: User }>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, verificationId, code }) }),
  resendVerification: (email: string, verificationId: string) => request<EmailChallenge>('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email, verificationId }) }),
  forgotPassword: (email: string) => request<EmailChallenge>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email: string, verificationId: string, code: string, password: string) => request<{ authenticated: false; message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, verificationId, code, password }) }),
  logout: () => request<{ authenticated: boolean }>('/auth/session', { method: 'DELETE' }),
  users: (search: string, page: number) => request<UserPage>(`/api/admin/users?${new URLSearchParams({ search, page: String(page) })}`),
  createUser: (data: UserInput) => request<ManagedUser>('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<UserInput>) => request<ManagedUser>(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  messagingStatus: (accountId: string) => request<{ enabled: boolean; lastReplyAt: string | null }>(`/api/accounts/${encodeURIComponent(accountId)}/messaging`),
  enableMessaging: (accountId: string) => request<{ enabled: boolean; lastReplyAt: string | null }>(`/api/accounts/${encodeURIComponent(accountId)}/messaging`, { method: 'POST' }),
  stopQualification: (leadId: string) => request<{ stopped: boolean }>(`/api/leads/${encodeURIComponent(leadId)}/qualification/stop`, { method: 'POST' }),
  analytics: (days: number, campaignId?: string) => request<AnalyticsReport>(`/api/analytics?${new URLSearchParams({ days: String(days), ...(campaignId ? { campaignId } : {}) })}`),
  leads: (search: string, stage: string, page: number, campaignId?: string) => request<LeadPage>(`/api/leads?${new URLSearchParams({ search, page: String(page), ...(stage ? { stage } : {}), ...(campaignId ? { campaignId } : {}) })}`),
  lead: (id: string) => request<LeadDetail>(`/api/leads/${encodeURIComponent(id)}`),
  updateLead: (id: string, data: Pick<Lead, 'name' | 'email' | 'phone' | 'notes' | 'stage'>) => request<LeadDetail>(`/api/leads/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  overview: () => request<Overview>('/api/overview'),
  accounts: () => request<Account[]>('/api/accounts'),
  connectUrl: () => request<{ url: string }>('/api/instagram/connect-url'),
  pendingInstagram: () => request<{ needsAccountId: boolean }>('/api/instagram/pending'),
  completeInstagram: (accountId: string) => request<{ account: Account }>('/api/instagram/complete', { method: 'POST', body: JSON.stringify({ accountId }) }),
  reels: (accountId: string) => request<Reel[]>(`/api/accounts/${encodeURIComponent(accountId)}/reels`),
  campaigns: () => request<Campaign[]>('/api/campaigns'),
  comments: () => request<Comment[]>('/api/comments'),
  createCampaign: (data: Pick<Campaign, 'accountId' | 'mediaId' | 'keyword' | 'replyText' | 'publicReplyText' | 'qualificationFlow' | 'demoLink' | 'active'>) => request<Campaign>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  deleteCampaign: (id: string) => request<void>(`/api/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateCampaign: (id: string, data: Partial<Pick<Campaign, 'mediaId' | 'keyword' | 'replyText' | 'publicReplyText' | 'qualificationFlow' | 'demoLink' | 'active'>>) => request<Campaign>(`/api/campaigns/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) })
};
