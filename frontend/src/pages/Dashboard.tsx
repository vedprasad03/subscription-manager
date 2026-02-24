import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionsApi, gmailApi } from '../api/subscriptions'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../components/NotificationBell'
import AddSubscriptionModal from '../components/AddSubscriptionModal'

function formatCurrency(amount: string | null, currency: string) {
  if (!amount) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount))
}

function monthlyEquivalent(amount: string | null, cycle: string | null): number {
  if (!amount) return 0
  const n = Number(amount)
  if (cycle === 'annual') return n / 12
  if (cycle === 'weekly') return n * 4.33
  return n
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function RenewalBadge({ dateStr }: { dateStr: string | null }) {
  const days = daysUntil(dateStr)
  if (days === null) return <span className="text-gray-400 text-xs">—</span>
  if (days < 0) return <span className="text-xs text-gray-400">Overdue</span>
  if (days === 0) return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Today</span>
  if (days <= 3) return <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">In {days}d</span>
  if (days <= 7) return <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">In {days}d</span>
  return <span className="text-xs text-gray-500">{new Date(dateStr!).toLocaleDateString()}</span>
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
    trial: 'bg-blue-50 text-blue-700',
    paused: 'bg-yellow-50 text-yellow-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'cancelled'>('all')

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: subscriptionsApi.list,
  })

  const { data: gmailStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: gmailApi.status,
  })

  const scan = useMutation({
    mutationFn: gmailApi.scan,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
      alert(`Scan complete. ${data.new_subscriptions} new subscription(s) detected.`)
    },
  })

  const deleteSubscription = useMutation({
    mutationFn: subscriptionsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  })

  const filtered = subscriptions.filter((s) => filter === 'all' || s.status === filter)

  const totalMonthly = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + monthlyEquivalent(s.cost_amount, s.billing_cycle), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-gray-900">Subscription Manager</span>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Monthly spend</p>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalMonthly)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Annual spend</p>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalMonthly * 12)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Active subscriptions</p>
            <p className="text-2xl font-bold text-gray-900">
              {subscriptions.filter((s) => s.status === 'active').length}
            </p>
          </div>
        </div>

        {/* Gmail connect banner */}
        {gmailStatus && !gmailStatus.connected && (
          <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-900">Connect Gmail to auto-detect subscriptions</p>
              <p className="text-xs text-indigo-700 mt-0.5">We scan for billing emails and extract subscription details automatically.</p>
            </div>
            <a href="/connect-gmail" className="ml-4 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
              Connect
            </a>
          </div>
        )}

        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'active', 'cancelled'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
                  filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {gmailStatus?.connected && (
              <button
                onClick={() => scan.mutate()}
                disabled={scan.isPending}
                className="flex items-center gap-1.5 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium text-gray-700 rounded-lg px-3 py-2 transition-colors"
              >
                <svg className={`w-4 h-4 ${scan.isPending ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {scan.isPending ? 'Scanning…' : 'Scan inbox'}
              </button>
            )}
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-sm text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400">No subscriptions found.</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 text-sm text-indigo-600 hover:underline">
                Add one manually
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Service</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Cost</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">Cycle</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Next renewal</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{sub.service_name}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(sub.cost_amount, sub.cost_currency)}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize hidden sm:table-cell">{sub.billing_cycle ?? '—'}</td>
                    <td className="px-4 py-3"><RenewalBadge dateStr={sub.next_renewal_date} /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={sub.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${sub.service_name}?`)) deleteSubscription.mutate(sub.id)
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {showAdd && <AddSubscriptionModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
