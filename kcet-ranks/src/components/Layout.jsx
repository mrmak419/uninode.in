import { useState, useEffect, createContext } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

export const SidebarContext = createContext({
  sidebarOpen: false,
  toggleSidebar: () => {}
})

export default function Layout({ children }) {
  const location = useLocation()
  const isHome = location.pathname === '/'

  // Default: Sidebar closed everywhere by default
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Auto-close sidebar when navigating home
  useEffect(() => {
    if (isHome) setSidebarOpen(false)
  }, [isHome])

  const toggleSidebar = () => setSidebarOpen(prev => !prev)

  return (
    <SidebarContext.Provider value={{ sidebarOpen, toggleSidebar }}>
      <div className="min-h-screen bg-paper flex relative">
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Component */}
        <div className={`
          fixed top-0 left-0 h-full border-r border-border z-50 w-64
          transform transition-transform duration-300 ease-in-out bg-paper
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
