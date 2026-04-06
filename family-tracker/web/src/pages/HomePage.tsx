import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { HandoffResponse } from '../api/types'
import { useAuth, useOptionalBaby } from '../context/AuthContext'
import { formatTime } from '../utils/time'

export function HomePage() {
  const { me, selectedBabyId, refreshMe } = useAuth()
  const baby = useOptionalBaby(me?.babies ?? [], selectedBabyId)
  const [handoff, setHandoff] = useState<HandoffResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!baby?.id) {
      setHandoff(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const h = await api<HandoffResponse>(`/api/handoff?babyId=${encodeURIComponent(baby.id)}`)
        if (!cancelled) {
          setHandoff(h)
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
  }, [baby?.id])

  if (!me) {
    return null
  }

  if (!me.family) {
    return (
      <div className="page">
        <p className="muted">还没有家庭数据，请重新登录。</p>
      </div>
    )
  }

  if (!baby) {
    return (
      <div className="page">
        <p className="muted">暂无宝宝信息，请联系管理员。</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{me.family.name}</h1>
          <p className="muted">
            {baby.name} · 邀请码 <span className="mono">{me.family.inviteCode}</span>
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={() => void refreshMe()}>
          刷新
        </button>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <section className="card">
        <h2>交接班摘要</h2>
        {handoff?.hints?.length ? (
          <ul className="hints">
            {handoff.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">暂无特别提示。</p>
        )}
        <div className="grid-3">
          <SummaryItem
            title="上次喂奶"
            value={handoff?.lastFeeding ? formatTime(handoff.lastFeeding.createdAt) : '—'}
            sub={feedingGapLabel(handoff)}
          />
          <SummaryItem title="上次换尿布" value={handoff?.lastDiaper ? formatTime(handoff.lastDiaper.createdAt) : '—'} />
          <SummaryItem title="上次睡眠记录" value={handoff?.lastSleep ? formatTime(handoff.lastSleep.createdAt) : '—'} />
        </div>
        <p className="muted small">近 24 小时已记 {handoff?.last24hRecordCount ?? '—'} 条</p>
      </section>

      <section className="card">
        <h2>快速记录</h2>
        <div className="quick-grid">
          <Link className="btn tile" to={`/add?type=FEEDING&babyId=${baby.id}`}>
            喂奶
          </Link>
          <Link className="btn tile" to={`/add?type=DIAPER&babyId=${baby.id}`}>
            尿布
          </Link>
          <Link className="btn tile" to={`/add?type=SLEEP&babyId=${baby.id}`}>
            睡眠
          </Link>
          <Link className="btn tile secondary" to={`/timeline?babyId=${baby.id}`}>
            时间线
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>家庭成员</h2>
        <ul className="members">
          {me.members.map((m) => (
            <li key={m.id}>
              <span className="name">{m.displayName}</span>
              <span className="muted small">
                @{m.loginKey}
                {m.identityTag ? ` · ${m.identityTag}` : ''}
                {m.role === 'ADMIN' ? ' · 管理员' : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function SummaryItem({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="summary-item">
      <div className="muted small">{title}</div>
      <div className="summary-value">{value}</div>
      {sub ? <div className="muted small">{sub}</div> : null}
    </div>
  )
}

function feedingGapLabel(h: HandoffResponse | null) {
  if (h?.feedingGapMinutes == null) {
    return undefined
  }
  return `距今 ${h.feedingGapMinutes} 分钟`
}
