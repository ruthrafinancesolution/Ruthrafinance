import { Home, IndianRupee, UserPlus, UsersRound } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

function navClass(isActive) {
  return `employee-tab-link flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 transition active:scale-[0.97] ${
    isActive
      ? "text-[#3B82F6]"
      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
  }`;
}

export default function EmployeeMobileNav() {
  const location = useLocation();

  const customersActive =
    location.pathname === "/employee/customers" ||
    /^\/employee\/customers\/[^/]+/.test(location.pathname);

  const registerActive = location.pathname === "/employee/profile";

  return (
    <nav
      className="employee-tabbar fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 items-stretch border-t border-[var(--app-border)] bg-white/95 px-0.5 pt-1 backdrop-blur-xl supports-[padding:max(0px)]:pb-[max(8px,env(safe-area-inset-bottom))] pb-[max(8px,env(safe-area-inset-bottom))]"
      aria-label="Main navigation"
    >
      <NavLink to="/employee" end className={({ isActive }) => navClass(isActive)}>
        <Home className="employee-tab-icon h-[22px] w-[22px] shrink-0" />
        <span className="employee-tab-label text-[10px] font-semibold tracking-wide">Home</span>
      </NavLink>

      <NavLink to="/employee/customers" className={() => navClass(customersActive)}>
        <UsersRound className="employee-tab-icon h-[22px] w-[22px] shrink-0" />
        <span className="employee-tab-label text-[10px] font-semibold tracking-wide">Customer</span>
      </NavLink>

      <NavLink to="/employee/collection" className={({ isActive }) => navClass(isActive)}>
        <IndianRupee className="employee-tab-icon h-[22px] w-[22px] shrink-0" />
        <span className="employee-tab-label text-[10px] font-semibold tracking-wide">Collection</span>
      </NavLink>

      <NavLink to="/employee/profile" className={() => navClass(registerActive)}>
        <UserPlus className="employee-tab-icon h-[22px] w-[22px] shrink-0" />
        <span className="employee-tab-label text-[10px] font-semibold tracking-wide">Register</span>
      </NavLink>
    </nav>
  );
}
