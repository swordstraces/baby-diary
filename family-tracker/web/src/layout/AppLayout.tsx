import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AppLayout() {
  const { selectedBabyId } = useAuth()
  const babyQuery = selectedBabyId ? `?babyId=${encodeURIComponent(selectedBabyId)}` : ''

  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="主导航">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          首页
        </NavLink>
        <NavLink to={`/timeline${babyQuery}`} className={({ isActive }) => (isActive ? 'active' : '')}>
          时间线
        </NavLink>
        <NavLink to={`/add${babyQuery ? `${babyQuery}&` : '?'}type=FEEDING`} className={({ isActive }) => (isActive ? 'active' : '')}>
          记录
        </NavLink>
        <NavLink to="/mine" className={({ isActive }) => (isActive ? 'active' : '')}>
          我的
        </NavLink>
      </nav>
    </div>
  )
}
