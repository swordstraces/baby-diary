import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { CareRecord, RecordType } from '../api/types'
import { useAuth, useOptionalBaby } from '../context/AuthContext'
import { formatTime } from '../utils/time'

const TYPE_LABEL: Record<RecordType, string> = {
  FEEDING: '喂奶',
  DIAPER: '尿布',
  SLEEP: '睡眠',
  MOOD: '情绪',
  FOOD: '辅食',
  HEALTH: '健康',
}

export function TimelinePage() {
  const { me, selectedBabyId, setSelectedBabyId } = useAuth()
  const [params] = useSearchParams()
  const paramBaby = params.get('babyId')
  const baby = useOptionalBaby(me?.babies ?? [], paramBaby || selectedBabyId)

  useEffect(() => {
    if (paramBaby && paramBaby !== selectedBabyId) {
      setSelectedBabyId(paramBaby)
    }
  }, [paramBaby, selectedBabyId, setSelectedBabyId])

  const [items, setItems] = useState<CareRecord[]>([])
  const [filter, setFilter] = useState<RecordType | ''>('')
  const [error, setError] = useState<string | null>(null)

  const babyId = baby?.id

  const queryKey = useMemo(() => `${babyId}|${filter}`, [babyId, filter])

  useEffect(() => {
    if (!babyId) {
      setItems([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const qs = new URLSearchParams({ babyId, limit: '50' })
        if (filter) qs.set('type', filter)
        const res = await api<{ items: CareRecord[] }>(`/api/records?${qs.toString()}`)
        if (!cancelled) {
          setItems(res.items)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '加载失败')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [queryKey, babyId])

  if (!me || !baby) {
    return (
      <div className="page">
        <p className="muted">请先选择宝宝。</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>时间线</h1>
          <p className="muted">{baby.name}</p>
        </div>
        <Link className="btn secondary" to={`/add?babyId=${baby.id}&type=FEEDING`}>
          记一条
        </Link>
      </header>

      <div className="filters">
        {(['', 'FEEDING', 'DIAPER', 'SLEEP', 'HEALTH'] as const).map((t) => (
          <button
            key={t || 'ALL'}
            type="button"
            className={`chip ${filter === t ? 'active' : ''}`}
            onClick={() => setFilter(t === '' ? '' : t)}
          >
            {t === '' ? '全部' : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <ul className="timeline">
        {items.map((r) => (
          <li key={r.id} className="timeline-item">
            <Link to={`/records/${r.id}`} className="timeline-link">
              <div className="timeline-badge">{TYPE_LABEL[r.type]}</div>
              <div className="timeline-body">
                <div className="timeline-title">{summarizeRecord(r)}</div>
                <div className="muted small">
                  {formatTime(r.createdAt)} · {r.createdBy.displayName}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {items.length === 0 ? <p className="muted center">暂无记录</p> : null}
    </div>
  )
}

function summarizeRecord(r: CareRecord) {
  const p = r.payload || {}
  if (r.type === 'FEEDING') {
    const method = String(p.method || '喂奶')
    const ml = p.amountMl != null ? `${p.amountMl} ml` : ''
    const side = p.side ? String(p.side) : ''
    return [method, side, ml].filter(Boolean).join(' · ') || '喂奶记录'
  }
  if (r.type === 'DIAPER') {
    return p.kind ? `尿布 · ${String(p.kind)}` : '换尿布'
  }
  if (r.type === 'SLEEP') {
    if (p.durationMin != null) return `睡眠 · ${p.durationMin} 分钟`
    return '睡眠记录'
  }
  return r.note || '记录'
}
