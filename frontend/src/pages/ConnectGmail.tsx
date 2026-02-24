import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { gmailApi } from '../api/subscriptions'

export default function ConnectGmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const isSuccess = location.pathname.endsWith('/success')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = async () => {
    setLoading(true)
    setError('')
    try {
      const { url } = await gmailApi.getConnectUrl()
      window.location.href = url
    } catch {
      setError('Could not initiate Gmail connection. Please try again.')
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(() => navigate('/dashboard'), 2000)
      return () => clearTimeout(t)
    }
  }, [isSuccess, navigate])

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-xl font-semibold text-gray-900">Gmail connected!</h1>
          <p className="text-sm text-gray-500 mt-1">Redirecting to your dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          G
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Connect your Gmail</h1>
        <p className="text-sm text-gray-500 mb-6">
          We'll scan your inbox for subscription emails to automatically populate your dashboard.
          We request <strong>read-only</strong> access and never store your email content.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors mb-3"
        >
          {loading ? 'Redirecting to Google…' : 'Connect Gmail'}
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
