import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { getDashboardPath, toTitleCase } from "@/lib/constant";
import { Toaster } from "@/components/ui/sonner";
import IncomingCallDialog from "@/components/call/IncomingCallDialog";
import ActiveCallOverlay from "@/components/call/ActiveCallOverlay";

import Home from "@/pages/Home";
import PublicBecomeTrainer from "@/pages/PublicBecomeTrainer";
import Products from "@/pages/product/Products";
import ProductDetail from "@/pages/product/ProductDetail";
import PaymentReturn from "@/pages/product/PaymentReturn";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagement from "@/pages/admin/user/UserManagement";
import UserDetail from "@/pages/admin/user/UserDetail";
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
import TrainerChat from "@/pages/dietitian/TrainerChat";

import UserDashboard, { getGreeting } from "@/pages/user/UserDashboard";
import MyOrders from "@/pages/user/MyOrders";
import RequestProduct from "@/pages/user/RequestProduct";
import Profile from "@/pages/user/Profile";
import BecomeTrainer from "@/pages/user/BecomeTrainer";
import MyTrainer from "@/pages/user/trainer/MyTrainer";
import ChatWithTrainer from "@/pages/user/trainer/ChatWithTrainer";
import Subscription from "@/pages/user/subscription/Subscription";
import AiRecommendation from "@/pages/user/AiRecommendation";
import WeeklyReport from "@/pages/user/WeeklyReport";
import Rewards from "@/pages/user/Rewards";
import Notifications from "@/pages/user/Notifications";
import AuthLayout from "./pages/auth/AuthLayout";
import { useState } from "react";
import { Button } from "./components/ui/button";
import { Menu } from "lucide-react";

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardPath(user.role)} replace />;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const location = useLocation();
  const pathSegments = location.pathname.split("/");
  const lastElement = pathSegments[pathSegments?.length - 1] || "Dashboard";
  const title =
    lastElement === "my-dashboard" || lastElement === "trainer-dashboard"
      ? `${getGreeting()}, ${user?.name?.split(" ")[0] || "there"} 👋`
      : lastElement;

  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={isOpen} setOpen={setIsOpen} />
      <main className="flex-1 overflow-y-auto lg:pl-60 pl-0">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex gap-2 mb-2 max-md:border-b max-md:pb-2">
            <Button
              size={"icon"}
              className="lg:hidden"
              onClick={() => setIsOpen((v) => !v)}
              aria-label="Toggle sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight ">
              {toTitleCase(title)}
            </h1>
          </div>
          <div>{children}</div>
        </div>
      </main>
      <IncomingCallDialog />
      <ActiveCallOverlay />
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
          <Route path="/payment/stripe/return" element={<PaymentReturn />} />
          <Route path="/payment/stripe/cancel" element={<PaymentReturn />} />
          <Route
            path="/payment/subscription/esewa/success"
            element={<SubscriptionPaymentReturn />}
          />
          <Route
            path="/payment/subscription/esewa/failure"
            element={<SubscriptionPaymentReturn />}
          />
          <Route
            path="/payment/subscription/stripe/return"
            element={<SubscriptionPaymentReturn />}
          />
          <Route
            path="/payment/subscription/stripe/cancel"
            element={<SubscriptionPaymentReturn />}
          />
          <Route path="/admin" element={<RoleRedirect />} />
          <Route path="/login" element={<AuthLayout />} />
          <Route
            path="/register"
            element={<Navigate to="/login?tab=register" replace />}
          />

          {/* Admin */}
          <Route
            path="/dashboard"
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
            path="/admin/trainee-management"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <UserManagement role="trainee" />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/trainer-management"
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
            path="/admin/product-management"
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
            path="/admin/order-management"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <OrderManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/category-management"
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
            path="/admin/subscription-plans"
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
            path="/admin/discount-management"
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
            path="/trainer-dashboard"
            element={
              <ProtectedRoute roles={["dietitian", "admin"]}>
                <Layout>
                  <DietitianDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/assignment-requests"
            element={
              <ProtectedRoute roles={["dietitian"]}>
                <Layout>
                  <AssignmentRequests />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/my-profile"
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
          <Route
            path="/trainer/my-orders"
            element={
              <ProtectedRoute roles={["dietitian"]}>
                <Layout>
                  <MyOrders />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/my-rewards"
            element={
              <ProtectedRoute roles={["dietitian"]}>
                <Layout>
                  <Rewards />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/chat"
            element={
              <ProtectedRoute roles={["dietitian"]}>
                <Layout>
                  <TrainerChat />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Customer */}
          <Route
            path="/my-dashboard"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <UserDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainee/shop"
            element={<Navigate to="/products" replace />}
          />
          <Route
            path="/trainee/my-orders"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <MyOrders />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainee/trainers"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <MyTrainer />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainee/chat"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <ChatWithTrainer />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainee/become-trainer"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <BecomeTrainer />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainee/trainers"
            element={<Navigate to="/trainee/trainers?tab=find" replace />}
          />
          <Route
            path="/trainee/trainers/:id"
            element={<Navigate to="/trainee/trainers?tab=find" replace />}
          />
          <Route
            path="/trainee/request-product"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <RequestProduct />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* <Route
            path="/trainee/log-exercise"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <LogExercise />
                </Layout>
              </ProtectedRoute>
            }
          /> */}
          <Route
            path="/trainee/my-profile"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainee/subscription"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <Subscription />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainee/ai-recommendations"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <AiRecommendation />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainee/weekly-report"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <WeeklyReport />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainee/my-rewards"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <Rewards />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainee/notifications"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <Notifications />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Legacy redirects */}
          <Route
            path="/user"
            element={<Navigate to="/my-dashboard" replace />}
          />
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
