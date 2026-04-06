import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { RecordType } from '../api/types'
import { useAuth, useOptionalBaby } from '../context/AuthContext'

export function AddRecordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { me, selectedBabyId, setSelectedBabyId } = useAuth()
  const typeParam = (params.get('type') || 'FEEDING') as RecordType
  const paramBaby = params.get('babyId')
  const baby = useOptionalBaby(me?.babies ?? [], paramBaby || selectedBabyId)

  const [type, setType] = useState<RecordType>(typeParam)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [feedingMethod, setFeedingMethod] = useState<'breast' | 'bottle' | 'mixed'>('breast')
  const [side, setSide] = useState<'left' | 'right' | 'both' | ''>('')
  const [amountMl, setAmountMl] = useState('')
  const [durationMin, setDurationMin] = useState('')

  const [diaperKind, setDiaperKind] = useState<'wet' | 'dirty' | 'both'>('wet')

  const [sleepDuration, setSleepDuration] = useState('')

  const payload = useMemo(() => {
    if (type === 'FEEDING') {
      return {
        method: feedingMethod,
        side: side || undefined,
        amountMl: amountMl ? Number(amountMl) : undefined,
        durationMin: durationMin ? Number(durationMin) : undefined,
      }
    }
    if (type === 'DIAPER') {
      return { kind: diaperKind }
    }
    if (type === 'SLEEP') {
      return { durationMin: sleepDuration ? Number(sleepDuration) : undefined }
    }
    return {}
  }, [
    type,
    feedingMethod,
    side,
    amountMl,
    durationMin,
    diaperKind,
    sleepDuration,
  ])

  useEffect(() => {
    if (paramBaby && paramBaby !== selectedBabyId) {
      setSelectedBabyId(paramBaby)
    }
  }, [paramBaby, selectedBabyId, setSelectedBabyId])

  useEffect(() => {
    setType(typeParam)
  }, [typeParam])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!baby) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api('/api/records', {
        method: 'POST',
        body: JSON.stringify({
          babyId: baby.id,
          type,
          payload,
          note: note || undefined,
        }),
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  if (!me || !baby) {
    return (
      <div className="page">
        <p className="muted">未找到宝宝信息。</p>
      </div>
    )
  }

  return (
    <div className="page narrow">
      <h1>快速记录</h1>
      <form className="form" onSubmit={onSubmit}>
        <label>
          类型
          <select value={type} onChange={(e) => setType(e.target.value as RecordType)}>
            <option value="FEEDING">喂奶</option>
            <option value="DIAPER">尿布</option>
            <option value="SLEEP">睡眠</option>
            <option value="HEALTH">健康</option>
            <option value="MOOD">情绪</option>
            <option value="FOOD">辅食</option>
          </select>
        </label>

        {type === 'FEEDING' ? (
          <>
            <label>
              方式
              <select value={feedingMethod} onChange={(e) => setFeedingMethod(e.target.value as typeof feedingMethod)}>
                <option value="breast">母乳</option>
                <option value="bottle">瓶喂</option>
                <option value="mixed">混合</option>
              </select>
            </label>
            {feedingMethod === 'breast' || feedingMethod === 'mixed' ? (
              <label>
                侧别
                <select value={side} onChange={(e) => setSide(e.target.value as typeof side)}>
                  <option value="">不记录</option>
                  <option value="left">左侧</option>
                  <option value="right">右侧</option>
                  <option value="both">双侧</option>
                </select>
              </label>
            ) : null}
            <label>
              奶量 ml（可选）
              <input inputMode="numeric" value={amountMl} onChange={(e) => setAmountMl(e.target.value)} />
            </label>
            <label>
              时长 分钟（可选）
              <input inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
            </label>
          </>
        ) : null}

        {type === 'DIAPER' ? (
          <label>
            类型
            <select value={diaperKind} onChange={(e) => setDiaperKind(e.target.value as typeof diaperKind)}>
              <option value="wet">尿</option>
              <option value="dirty">便</option>
              <option value="both">两者</option>
            </select>
          </label>
        ) : null}

        {type === 'SLEEP' ? (
          <label>
            睡眠时长 分钟（可选）
            <input inputMode="numeric" value={sleepDuration} onChange={(e) => setSleepDuration(e.target.value)} />
          </label>
        ) : null}

        <label>
          备注
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </label>

        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? '保存中…' : '保存记录'}
        </button>
      </form>
    </div>
  )
}
