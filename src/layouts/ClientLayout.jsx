import Header from '../components/Header'
import Footer from '../components/Footer'
import MobileBottomNav from '../components/MobileBottomNav'
import ProductQuickSearch from '../components/ProductQuickSearch'
import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'

const ClientLayout = () => {
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const isCheckoutRoute = location.pathname.startsWith('/checkout')
  const shouldHideHeaderFooter = isCheckoutRoute

  return (
    <div className="min-h-screen">
      {!shouldHideHeaderFooter && <Header onOpenSearch={() => setSearchOpen(true)} />}
      <main className={shouldHideHeaderFooter ? 'min-h-screen' : 'min-h-[calc(100dvh-5.4rem)] pt-[calc(env(safe-area-inset-top,0px)+5.4rem)] md:pt-[4.95rem]'}>
        <Outlet context={{ openProductSearch: () => setSearchOpen(true) }} />
      </main>
      {!shouldHideHeaderFooter && <Footer />}
      <MobileBottomNav onOpenSearch={() => setSearchOpen(true)} searchOpen={searchOpen} />
      <ProductQuickSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

export default ClientLayout
