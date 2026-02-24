import { api } from './client'

export interface Subscription {
  id: number
  user_id: number
  service_name: string
  logo_url: string | null
  cost_amount: string | null
  cost_currency: string
  billing_cycle: string | null
  next_renewal_date: string | null
  status: string
  source: string
  confidence_score: number | null
  notes: string | null
  detected_at: string | null
  updated_at: string
}

export interface SubscriptionCreate {
  service_name: string
  cost_amount?: number
  cost_currency?: string
  billing_cycle?: string
  next_renewal_date?: string
  status?: string
  notes?: string
}

export const subscriptionsApi = {
  list: () => api.get<Subscription[]>('/subscriptions/').then((r) => r.data),

  create: (data: SubscriptionCreate) =>
    api.post<Subscription>('/subscriptions/', data).then((r) => r.data),

  update: (id: number, data: Partial<SubscriptionCreate>) =>
    api.patch<Subscription>(`/subscriptions/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/subscriptions/${id}`),
}

export const gmailApi = {
  status: () => api.get<{ connected: boolean; last_sync_at: string | null }>('/gmail/status').then((r) => r.data),
  getConnectUrl: () => api.get<{ url: string }>('/gmail/connect').then((r) => r.data),
  scan: () => api.post<{ scanned: boolean; new_subscriptions: number }>('/gmail/scan').then((r) => r.data),
  disconnect: () => api.delete('/gmail/disconnect'),
}

export const notificationsApi = {
  list: () =>
    api.get<Array<{ id: number; type: string; title: string; body: string; read: boolean; created_at: string }>>(
      '/notifications/',
    ).then((r) => r.data),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
}
