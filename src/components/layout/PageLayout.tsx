import { ReactNode } from 'react'
import { BottomNav } from './BottomNav'

interface PageLayoutProps {
  children: ReactNode
  showNav?: boolean
  className?: string
}

export function PageLayout({ children, showNav = true, className = '' }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className={`flex-1 max-w-lg mx-auto w-full ${showNav ? 'pb-24' : ''} ${className}`}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  )
}
