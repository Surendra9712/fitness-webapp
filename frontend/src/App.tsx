import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { getDashboardPath } from "@/lib/roles";
import { Toaster } from "@/components/ui/sonner";

import Home from "@/pages/Home";
import Register from "@/pages/Register";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import PaymentReturn from "@/pages/PaymentReturn";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagement from "@/pages/admin/user/UserManagement";
import UserDetail from "@/pages/admin/user/UserDetail";
import ExerciseLibrary from "@/pages/admin/exercise/ExerciseLibrary";
import ProductManagement from "@/pages/admin/product/ProductManagement";
import ProductRequests from "@/pages/admin/ProductRequests";
import OrderManagement from "@/pages/admin/OrderManagement";
import CategoryManagement from "@/pages/admin/category/CategoryManagement";
import TrainerAssignments from "@/pages/admin/TrainerAssignments";

import DietitianDashboard from "@/pages/dietitian/DietitianDashboard";
import AssignmentRequests from "@/pages/dietitian/AssignmentRequests";
import TrainerProfile from "@/pages/dietitian/TrainerProfile";

import UserDashboard from "@/pages/user/UserDashboard";
import MyOrders from "@/pages/user/MyOrders";
import RequestProduct from "@/pages/user/RequestProduct";
import LogExercise from "@/pages/user/LogExercise";
import Profile from "@/pages/user/Profile";
import MyTrainer from "@/pages/user/MyTrainer";
import TrainerDetail from "@/pages/user/TrainerDetail";
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
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/payment/esewa/success" element={<PaymentReturn />} />
          <Route path="/payment/esewa/failure" element={<PaymentReturn />} />
          <Route path="/payment/khalti/return" element={<PaymentReturn />} />
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
          <Route
            path="/admin/exercises"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <ExerciseLibrary />
                </Layout>
              </ProtectedRoute>
            }
          />
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
          <Route
            path="/customer/log-exercise"
            element={
              <ProtectedRoute roles={["trainee"]}>
                <Layout>
                  <LogExercise />
                </Layout>
              </ProtectedRoute>
            }
          />
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
