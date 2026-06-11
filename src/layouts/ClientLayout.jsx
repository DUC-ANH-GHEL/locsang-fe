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
  const isShortsRoute = location.pathname.startsWith('/shorts')
  const isHomeRoute = location.pathname === '/'
  const isCommerceRoute = isHomeRoute || location.pathname.startsWith('/products') || isCheckoutRoute
  const shouldHideHeaderFooter = isCheckoutRoute || isShortsRoute
  const shouldHideBottomNav = isShortsRoute

  return (
    <div className="min-h-screen">
      {!shouldHideHeaderFooter && <Header onOpenSearch={() => setSearchOpen(true)} />}
      <main className={shouldHideHeaderFooter ? 'min-h-screen' : 'min-h-screen pb-28 pt-[calc(env(safe-area-inset-top,0px)+5.4rem)] md:pb-0 md:pt-[4.95rem]'}>
        <Outlet context={{ openProductSearch: () => setSearchOpen(true) }} />
      </main>
      {!shouldHideHeaderFooter && (
        <div className={isCommerceRoute ? 'hidden md:block' : ''}>
          <Footer />
        </div>
      )}
      {!shouldHideBottomNav && <MobileBottomNav onOpenSearch={() => setSearchOpen(true)} searchOpen={searchOpen} />}
      <ProductQuickSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

export default ClientLayout
