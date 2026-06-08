import Header from '../components/Header'
import Footer from '../components/Footer'
import MobileBottomNav from '../components/MobileBottomNav'
import { Outlet, useLocation } from 'react-router-dom'

const ClientLayout = () => {
  const location = useLocation()
  const isCheckoutRoute = location.pathname.startsWith('/checkout')
  const isShortsRoute = location.pathname.startsWith('/shorts')
  const shouldHideShell = isCheckoutRoute || isShortsRoute

  return (
    <div className="min-h-screen">
      {!shouldHideShell && <Header />}
      <main className={shouldHideShell ? 'min-h-screen' : 'min-h-screen pb-28 pt-[calc(env(safe-area-inset-top,0px)+4.75rem)] md:pb-0 md:pt-28'}>
        <Outlet />
      </main>
      {!shouldHideShell && <Footer />}
      {!shouldHideShell && <MobileBottomNav />}
    </div>
  )
}

export default ClientLayout
