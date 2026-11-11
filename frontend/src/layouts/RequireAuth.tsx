import { Navigate, useLocation } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Spinner } from "../components/States";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../types";
import type { ReactNode } from "react";

export function roleHome(role: Role): string {
  if (role === "admin") return "/staff/dashboard";
  if (role === "officer") return "/staff/officer";
  return "/staff/complaints";
}

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-page">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <Spinner className="h-6 w-6" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <>{children}</>;
}
