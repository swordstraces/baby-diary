import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { CareRecord, RecordType } from '../api/types'
import { formatTime } from '../utils/time'

const TYPE_LABEL: Record<RecordType, string> = {
  FEEDING: '喂奶',
  DIAPER: '尿布',
  SLEEP: '睡眠',
  MOOD: '情绪',
  FOOD: '辅食',
  HEALTH: '健康',
}

export function RecordDetailPage() {
  const { id } = useParams()
  const [record, setRecord] = useState<CareRecord | null>(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) {
      return
    }
    try {
      const r = await api<CareRecord>(`/api/records/${id}`)
      setRecord(r)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function onComment(e: FormEvent) {
    e.preventDefault()
    if (!id || !comment.trim()) {
      return
    }
    setBusy(true)
    try {
      await api(`/api/records/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: comment }),
      })
      setComment('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败')
    } finally {
      setBusy(false)
    }
  }

  if (!id) {
    return null
  }

  if (error && !record) {
    return (
      <div className="page narrow">
        <p className="error">{error}</p>
        <Link to="/timeline">返回时间线</Link>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="page narrow">
        <p className="muted">加载中…</p>
      </div>
    )
  }

  return (
    <div className="page narrow">
      <Link className="back-link" to="/timeline">
        ← 返回
      </Link>
      <h1>{TYPE_LABEL[record.type]}</h1>
      <p className="muted">
        {formatTime(record.createdAt)} · {record.createdBy.displayName}
      </p>
      <pre className="json-preview">{JSON.stringify(record.payload, null, 2)}</pre>
      {record.note ? <p className="note">{record.note}</p> : null}

      <section className="card">
        <h2>评论</h2>
        <ul className="comments">
          {(record.comments ?? []).map((c) => (
            <li key={c.id}>
              <div className="comment-meta">
                {c.member.displayName} · {formatTime(c.createdAt)}
              </div>
              <div>{c.text}</div>
            </li>
          ))}
        </ul>
        <form className="form inline" onSubmit={onComment}>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="交接留言…" />
          <button className="btn secondary" type="submit" disabled={busy}>
            发送
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>
    </div>
  )
}
