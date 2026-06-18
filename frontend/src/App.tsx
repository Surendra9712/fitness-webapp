import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { getDashboardPath } from "@/lib/roles";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagement from "@/pages/admin/UserManagement";
import MealLibrary from "@/pages/admin/MealLibrary";
import ExerciseLibrary from "@/pages/admin/ExerciseLibrary";

import DietitianDashboard from "@/pages/dietitian/DietitianDashboard";
import DietPlans from "@/pages/dietitian/DietPlans";
import AssignPlan from "@/pages/dietitian/AssignPlan";

import UserDashboard from "@/pages/user/UserDashboard";
import MyDietPlan from "@/pages/user/MyDietPlan";
import LogMeal from "@/pages/user/LogMeal";
import LogExercise from "@/pages/user/LogExercise";
import Profile from "@/pages/user/Profile";

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardPath(user.role)} replace />;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<RoleRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Legacy redirects */}
          <Route path="/user" element={<Navigate to="/customer" replace />} />
          <Route path="/user/my-plan" element={<Navigate to="/customer/my-plan" replace />} />
          <Route path="/user/log-meal" element={<Navigate to="/customer/log-meal" replace />} />
          <Route path="/user/log-exercise" element={<Navigate to="/customer/log-exercise" replace />} />
          <Route path="/dietitian" element={<Navigate to="/trainer" replace />} />
          <Route path="/dietitian/plans" element={<Navigate to="/trainer/plans" replace />} />
          <Route path="/dietitian/assign" element={<Navigate to="/trainer/assign" replace />} />

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
            path="/admin/meals"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <MealLibrary />
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

          {/* Trainer (dietitian) */}
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
            path="/trainer/plans"
            element={
              <ProtectedRoute roles={["dietitian", "admin"]}>
                <Layout>
                  <DietPlans />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/assign"
            element={
              <ProtectedRoute roles={["dietitian", "admin"]}>
                <Layout>
                  <AssignPlan />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Customer (user) */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute roles={["user"]}>
                <Layout>
                  <UserDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/my-plan"
            element={
              <ProtectedRoute roles={["user"]}>
                <Layout>
                  <MyDietPlan />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/log-meal"
            element={
              <ProtectedRoute roles={["user"]}>
                <Layout>
                  <LogMeal />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/log-exercise"
            element={
              <ProtectedRoute roles={["user"]}>
                <Layout>
                  <LogExercise />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/profile"
            element={
              <ProtectedRoute roles={["user"]}>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/unauthorized"
            element={
              <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold">403 — Access Denied</h1>
                  <p className="mt-2 text-muted-foreground">You don&apos;t have permission to view this page.</p>
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
