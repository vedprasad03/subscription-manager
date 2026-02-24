import { FormEvent, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionsApi, SubscriptionCreate } from '../api/subscriptions'

interface Props {
  onClose: () => void
}

export default function AddSubscriptionModal({ onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<SubscriptionCreate>({
    service_name: '',
    cost_amount: undefined,
    cost_currency: 'USD',
    billing_cycle: 'monthly',
    next_renewal_date: '',
    status: 'active',
  })
  const [error, setError] = useState('')

  const create = useMutation({
    mutationFn: subscriptionsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] })
      onClose()
    },
    onError: () => setError('Failed to create subscription.'),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate({
      ...form,
      next_renewal_date: form.next_renewal_date || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add subscription</h2>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Service name *</label>
            <input
              required
              value={form.service_name}
              onChange={(e) => setForm({ ...form, service_name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Netflix, Spotify…"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost_amount ?? ''}
                onChange={(e) => setForm({ ...form, cost_amount: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="9.99"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <input
                value={form.cost_currency}
                onChange={(e) => setForm({ ...form, cost_currency: e.target.value.toUpperCase() })}
                maxLength={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Billing cycle</label>
              <select
                value={form.billing_cycle ?? ''}
                onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="weekly">Weekly</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Next renewal</label>
              <input
                type="date"
                value={form.next_renewal_date ?? ''}
                onChange={(e) => setForm({ ...form, next_renewal_date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
            >
              {create.isPending ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
