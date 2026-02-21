import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="flex-1 p-6 overflow-auto"
        style={{ background: 'var(--fb-content-bg)', minHeight: '100vh' }}
      >
        <Outlet />
      </main>
    </div>
  )
}
