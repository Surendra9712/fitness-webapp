import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { getDashboardPath } from "@/lib/roles";
import { LogOut, Leaf } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-emerald-600" />
          <span className="text-lg font-bold tracking-tight text-emerald-900">
            FitStore
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/products">Products</Link>
          </Button>
          {user ? (
            <>
              <Button asChild>
                <Link to={getDashboardPath(user.role)}>{user.name}</Link>
              </Button>
              <Button
                variant={"ghost"}
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                <LogOut />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
