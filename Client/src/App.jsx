import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { LocaleProvider } from './context/LocaleContext';
import { ThemeProvider } from './context/ThemeContext';
import { WishlistProvider } from './context/WishlistContext';
import RouteFallback from './components/RouteFallback';
import WhatsAppFAB from './components/layout/WhatsAppFAB';
import MarketingPixels from './components/MarketingPixels';
import AdminGuard from './components/admin/AdminGuard';
import AdminLayout from './components/admin/AdminLayout';

const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ListingDetailPage = lazy(() => import('./pages/ListingDetailPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const BookingSuccessPage = lazy(() => import('./pages/BookingSuccessPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const WishlistPage = lazy(() =>
  import('./pages/AccountPage').then((m) => ({ default: m.WishlistPage }))
);
const CareersPage = lazy(() => import('./pages/CareersPage'));
const AboutPage = lazy(() =>
  import('./pages/StaticPages').then((m) => ({ default: m.AboutPage }))
);
const CompoundsPage = lazy(() =>
  import('./pages/StaticPages').then((m) => ({ default: m.CompoundsPage }))
);
const FaqPage = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.FaqPage })));
const TermsPage = lazy(() =>
  import('./pages/StaticPages').then((m) => ({
    default: () => <m.LegalPage kind="terms" />,
  }))
);
const PrivacyPage = lazy(() =>
  import('./pages/StaticPages').then((m) => ({
    default: () => <m.LegalPage kind="privacy" />,
  }))
);
const RefundPage = lazy(() =>
  import('./pages/StaticPages').then((m) => ({
    default: () => <m.LegalPage kind="refund-policy" />,
  }))
);
const ContactPage = lazy(() => import('./pages/ContactPage'));
const BecomeAHostPage = lazy(() => import('./pages/BecomeAHostPage'));

const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminSlideshowPage = lazy(() => import('./pages/admin/AdminSlideshowPage'));
const AdminDestinationsPage = lazy(() => import('./pages/admin/AdminDestinationsPage'));
const AdminCompoundsPage = lazy(() => import('./pages/admin/AdminCompoundsPage'));
const AdminUnitsPage = lazy(() => import('./pages/admin/AdminUnitsPage'));
const AdminMarketingPage = lazy(() => import('./pages/admin/AdminMarketingPage'));

export default function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          <LocaleProvider>
            <ThemeProvider>
              <WishlistProvider>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/home" element={<Navigate to="/" replace />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/listings/:slug" element={<ListingDetailPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/booking-success" element={<BookingSuccessPage />} />
                    <Route path="/sign-in" element={<SignInPage />} />
                    <Route path="/sign-up" element={<SignUpPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/account" element={<AccountPage />} />
                    <Route path="/wishlist" element={<WishlistPage />} />
                    <Route path="/careers" element={<CareersPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/compounds" element={<CompoundsPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/faq" element={<FaqPage />} />
                    <Route path="/owners" element={<BecomeAHostPage />} />
                    <Route path="/host-onboarding" element={<BecomeAHostPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/refund-policy" element={<RefundPage />} />

                    <Route path="/admin/login" element={<AdminLoginPage />} />
                    <Route path="/admin" element={<AdminGuard />}>
                      <Route element={<AdminLayout />}>
                        <Route index element={<AdminDashboardPage />} />
                        <Route path="slideshow" element={<AdminSlideshowPage />} />
                        <Route path="destinations" element={<AdminDestinationsPage />} />
                        <Route path="compounds" element={<AdminCompoundsPage />} />
                        <Route path="units" element={<AdminUnitsPage />} />
                        <Route path="marketing" element={<AdminMarketingPage />} />
                      </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
                <MarketingPixels />
                <WhatsAppFAB />
              </WishlistProvider>
            </ThemeProvider>
          </LocaleProvider>
        </BrowserRouter>
      </AdminAuthProvider>
    </AuthProvider>
  );
}
