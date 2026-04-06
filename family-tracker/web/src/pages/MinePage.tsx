import { useAuth } from '../context/AuthContext'

export function MinePage() {
  const { me, logout, refreshMe } = useAuth()

  if (!me) {
    return null
  }

  return (
    <div className="page">
      <h1>我的</h1>
      <section className="card">
        <div className="row">
          <div>
            <div className="large">{me.member.displayName}</div>
            <div className="muted small">
              @{me.member.loginKey}
              {me.member.identityTag ? ` · ${me.member.identityTag}` : ''}
              {me.member.role === 'ADMIN' ? ' · 管理员' : ''}
            </div>
          </div>
          <button type="button" className="btn ghost" onClick={() => void refreshMe()}>
            刷新资料
          </button>
        </div>
      </section>
      {me.family ? (
        <section className="card">
          <h2>家庭信息</h2>
          <p>
            {me.family.name} · 邀请码 <span className="mono">{me.family.inviteCode}</span>
          </p>
          <p className="muted small">把邀请码发给家人，在「加入家庭」页输入即可。</p>
        </section>
      ) : null}
      <button type="button" className="btn danger full" onClick={logout}>
        退出登录
      </button>
    </div>
  )
}
