import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { getDashboardPath } from "@/lib/constant";
import { Toaster } from "@/components/ui/sonner";

import Home from "@/pages/Home";
import PublicBecomeTrainer from "@/pages/PublicBecomeTrainer";
import Products from "@/pages/product/Products";
import ProductDetail from "@/pages/product/ProductDetail";
import PaymentReturn from "@/pages/product/PaymentReturn";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagement from "@/pages/admin/user/UserManagement";
import UserDetail from "@/pages/admin/user/UserDetail";
import ExerciseLibrary from "@/pages/admin/exercise/ExerciseLibrary";
import ProductManagement from "@/pages/admin/product/ProductManagement";
import ProductRequests from "@/pages/admin/ProductRequests";
import OrderManagement from "@/pages/admin/OrderManagement";
import CategoryManagement from "@/pages/admin/category/CategoryManagement";
import TrainerAssignments from "@/pages/admin/TrainerAssignments";
import TrainerVerification from "@/pages/admin/TrainerVerification";
import SubscriptionManagement from "@/pages/admin/subscription/SubscriptionManagement";
import PromoCodeManagement from "@/pages/admin/PromoCodeManagement";
import DiscountManagement from "@/pages/admin/discount/DiscountManagement";
import SubscriptionPaymentReturn from "@/pages/user/subscription/SubscriptionPaymentReturn";

import DietitianDashboard from "@/pages/dietitian/DietitianDashboard";
import AssignmentRequests from "@/pages/dietitian/AssignmentRequests";
import TrainerProfile from "@/pages/dietitian/TrainerProfile";

import UserDashboard from "@/pages/user/UserDashboard";
import MyOrders from "@/pages/user/MyOrders";
import RequestProduct from "@/pages/user/RequestProduct";
import LogExercise from "@/pages/user/LogExercise";
import Profile from "@/pages/user/Profile";
import BecomeTrainer from "@/pages/user/BecomeTrainer";
import MyTrainer from "@/pages/user/trainer/MyTrainer";
import TrainerDetail from "@/pages/user/trainer/TrainerDetail";
import Subscription from "@/pages/user/subscription/Subscription";
import AiRecommendation from "@/pages/user/AiRecommendation";
import Rewards from "@/pages/user/Rewards";
import Notifications from "@/pages/user/Notifications";
import AuthLayout from "./pages/auth/AuthLayout";

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardPath(user.role)} replace />;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:pl-60 pl-0">
        <div className="mx-auto max-w-5xl px-6 py-6 pt-14 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/become-trainer" element={<PublicBecomeTrainer />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/payment/esewa/success" element={<PaymentReturn />} />
          <Route path="/payment/esewa/failure" element={<PaymentReturn />} />
          <Route path="/payment/khalti/return" element={<PaymentReturn />} />
          <Route
            path="/payment/subscription/esewa/success"
            element={<SubscriptionPaymentReturn />}
          />
          <Route
            path="/payment/subscription/esewa/failure"
            element={<SubscriptionPaymentReturn />}
          />
          <Route path="/dashboard" element={<RoleRedirect />} />
          <Route path="/login" element={<AuthLayout />} />
          <Route
            path="/register"
            element={<Navigate to="/login?tab=register" replace />}
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/trainees"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <UserManagement role="trainee" />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/trainers"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <UserManagement role="dietitian" />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <UserDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* <Route
            path="/admin/exercises"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <ExerciseLibrary />
                </Layout>
              </ProtectedRoute>
            }
          /> */}
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <ProductManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/product-requests"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <ProductRequests />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <OrderManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <CategoryManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/trainer-assignments"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <TrainerAssignments />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/trainer-verification"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <TrainerVerification />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/subscriptions"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <SubscriptionManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/promo-codes"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <PromoCodeManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/discounts"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <DiscountManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <Notifications />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Trainer */}
          <Route
            path="/trainer"
            element={
              <ProtectedRoute roles={["dietitian", "admin"]}>
                <Layout>
                  <DietitianDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/assignments"
            element={
              <ProtectedRoute roles={["dietitian"]}>
                <Layout>
                  <AssignmentRequests />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/profile"
            element={
              <ProtectedRoute roles={["dietitian"]}>
                <Layout>
                  <TrainerProfile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/notifications"
            element={
              <ProtectedRoute roles={["dietitian"]}>
                <Layout>
                  <Notifications />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Customer */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <UserDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/shop"
            element={<Navigate to="/products" replace />}
          />
          <Route
            path="/customer/orders"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <MyOrders />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/trainer"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <MyTrainer />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/become-trainer"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <BecomeTrainer />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/trainers/:id"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <TrainerDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/request-product"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <RequestProduct />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* <Route
            path="/customer/log-exercise"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <LogExercise />
                </Layout>
              </ProtectedRoute>
            }
          /> */}
          <Route
            path="/customer/profile"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/subscription"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <Subscription />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/ai-recommendation"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <AiRecommendation />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/rewards"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <Rewards />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/notifications"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <Notifications />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Legacy redirects */}
          <Route path="/user" element={<Navigate to="/customer" replace />} />
          <Route
            path="/dietitian"
            element={<Navigate to="/trainer" replace />}
          />

          <Route
            path="/unauthorized"
            element={
              <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold">403 — Access Denied</h1>
                  <p className="mt-2 text-muted-foreground">
                    You don&apos;t have permission to view this page.
                  </p>
                </div>
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
