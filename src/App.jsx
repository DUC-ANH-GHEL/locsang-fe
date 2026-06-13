import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation  } from 'react-router-dom'
import { useEffect } from 'react'
// import jwt_decode from 'jwt-decode';

import ClientLayout from './layouts/ClientLayout'
import AdminLayout from './layouts/AdminLayout'

import PrivateRoute from './components/PrivateRoute';
import { CartProvider } from './contexts/CartContext';
import { StorefrontAuthProvider } from './contexts/StorefrontAuthContext';
import ScrollToTop from './components/common/ScrollToTop';

const Home = lazy(() => import('./pages/client/Home'));
const ProductList = lazy(() => import('./pages/client/ProductList'));
const ProductDetail = lazy(() => import('./pages/client/ProductDetail'));
const Checkout = lazy(() => import('./pages/client/Checkout'));
const AccountAuth = lazy(() => import('./pages/client/AccountAuth'));
const AccountProfile = lazy(() => import('./pages/client/AccountProfile'));
const AccountOrders = lazy(() => import('./pages/client/AccountOrders'));

const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Products = lazy(() => import('./pages/admin/Product/Products'));
const OrderCreate = lazy(() => import('./pages/admin/Order/OrderCreate'));
const Orders = lazy(() => import('./pages/admin/Orders'));
const AdminLoginPage = lazy(() => import('./pages/admin/Login'));
const HomeContentEditor = lazy(() => import('./pages/admin/HomeContent/HomeContentEditor'));
const CreateProduct = lazy(() => import('./pages/admin/Product/CreateProduct'));
const ProductReadonlyDetail = lazy(() => import('./pages/admin/Product/ProductReadonlyDetail'));
const CreateCategory = lazy(() => import('./pages/admin/Category/CreateCategory'));
const Categories = lazy(() => import('./pages/admin/Category/Categories'));
const EditCategory = lazy(() => import('./pages/admin/Category/EditCategory'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const AdminAccounts = lazy(() => import('./pages/admin/Accounts'));

const STOREFRONT_MANIFEST = '/manifest.webmanifest';
const ADMIN_MANIFEST = '/admin-manifest.webmanifest';

function PwaManifestRouteSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isAdminRoute = pathname.startsWith('/admin');
    const manifestHref = isAdminRoute ? ADMIN_MANIFEST : STOREFRONT_MANIFEST;
    const appTitle = isAdminRoute ? 'Lộc Sang Admin' : 'Lộc Sang';

    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.setAttribute('rel', 'manifest');
      document.head.appendChild(manifestLink);
    }

    manifestLink.setAttribute('href', manifestHref);
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', appTitle);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <>
      <PwaManifestRouteSync />
      <ScrollToTop />
      <Suspense
        fallback={(
          <div className="min-h-screen flex items-center justify-center bg-[#f6f7fb] px-4">
            <div className="rounded-2xl bg-white border border-[#eadfd4] px-6 py-5 shadow-[0_18px_40px_rgba(32,26,23,0.08)] text-center">
              <div className="mx-auto mb-3 h-9 w-9 rounded-full border-[3px] border-[#f2d9c6] border-t-[#d56f4a] animate-spin" />
              <div className="text-sm font-semibold text-[#2f2722]">Đang tải trang...</div>
            </div>
          </div>
        )}
      >
        <Routes>
          <Route
            path="/"
            element={(
              <StorefrontAuthProvider>
                <CartProvider>
                  <ClientLayout />
                </CartProvider>
              </StorefrontAuthProvider>
            )}
          >
            <Route index element={<Home />} />
            <Route path="products" element={<ProductList />} />
            <Route path="san-pham/:slug" element={<ProductDetail />} />
            <Route path="products/:id/:slug" element={<ProductDetail />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="account/login" element={<AccountAuth />} />
            <Route path="account" element={<AccountProfile />} />
            <Route path="account/orders" element={<AccountOrders />} />
          </Route>

          <Route path="/admin/login" element={<AdminLoginPage />} />
{/*


      <Route path="/admin" element={<Dashboard />}> */}
       {/* <Route path="/admin/login" element={
        isLoggedIn() ? <Navigate to="/admin" /> : <AdminLoginPage />
      } />

      <Route path="/admin" element={
        isLoggedIn() ? <Dashboard /> : <Navigate to="/admin/login" />
      }> */}

          <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="products/create" element={<CreateProduct />} />
            <Route path="product/update/:id" element={<CreateProduct />} />
            <Route path="categories" element={<Categories />} />
            <Route path="categories/create" element={<CreateCategory />} />
            <Route path="categories/:id/edit" element={<EditCategory />} />
            <Route path="home-content" element={<HomeContentEditor />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/create" element={<OrderCreate />} />
            <Route path="accounts" element={<AdminAccounts />} />
            <Route path="settings" element={<Settings />} />
            <Route path="product/:id" element={<ProductReadonlyDetail />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default App
