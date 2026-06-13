import { useLocation, useNavigate } from "react-router-dom";

export default function CenterEmployeeTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname.includes("/employees") ? "employee" : "center";

  const buttonClass = (tab) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm ${
      active === tab ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <div className="center-employee-tabs mb-4 flex w-full shrink-0 justify-end md:relative md:mb-4">
      <div className="app-segmented w-auto shrink-0">
        <button type="button" onClick={() => navigate("/dashboard/center")} className={buttonClass("center")}>
          Center
        </button>
        <button type="button" onClick={() => navigate("/dashboard/employees")} className={buttonClass("employee")}>
          Employee
        </button>
      </div>
    </div>
  );
}
