import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setToken } from '../api/client'
import type { BabySummary, MeResponse } from '../api/types'

type AuthState = {
  me: MeResponse | null
  loading: boolean
  error: string | null
  selectedBabyId: string | null
  setSelectedBabyId: (id: string | null) => void
  refreshMe: () => Promise<void>
  loginWithToken: (token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBabyId, setSelectedBabyIdState] = useState<string | null>(null)

  const setSelectedBabyId = useCallback((id: string | null) => {
    setSelectedBabyIdState(id)
    if (id) {
      localStorage.setItem('baby_tracker_baby', id)
    } else {
      localStorage.removeItem('baby_tracker_baby')
    }
  }, [])

  const refreshMe = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setMe(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api<MeResponse>('/api/me')
      setMe(data)
      const stored = localStorage.getItem('baby_tracker_baby')
      const first = data.babies[0]?.id ?? null
      const next = stored && data.babies.some((b) => b.id === stored) ? stored : first
      setSelectedBabyIdState(next)
    } catch (e) {
      setMe(null)
      setError(e instanceof Error ? e.message : '加载失败')
      setToken(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const loginWithToken = useCallback(async (token: string) => {
    setToken(token)
    await refreshMe()
  }, [refreshMe])

  const logout = useCallback(() => {
    setToken(null)
    setMe(null)
    setSelectedBabyIdState(null)
    localStorage.removeItem('baby_tracker_baby')
  }, [])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  const value = useMemo(
    () =>
      ({
        me,
        loading,
        error,
        selectedBabyId,
        setSelectedBabyId,
        refreshMe,
        loginWithToken,
        logout,
      }) satisfies AuthState,
    [me, loading, error, selectedBabyId, setSelectedBabyId, refreshMe, loginWithToken, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth 必须在 AuthProvider 内使用')
  }
  return ctx
}

export function useOptionalBaby(babies: BabySummary[], selectedBabyId: string | null): BabySummary | null {
  if (!babies.length) return null
  if (selectedBabyId) {
    const b = babies.find((x) => x.id === selectedBabyId)
    if (b) return b
  }
  return babies[0] ?? null
}
