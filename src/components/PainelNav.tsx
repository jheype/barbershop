"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FiMenu,
  FiChevronLeft,
  FiChevronDown,
  FiScissors,
  FiUsers,
  FiUser,
  FiCalendar,
  FiPackage,
  FiCpu,
  FiBarChart2,
  FiLogOut,
  FiSettings,
} from "react-icons/fi";
import { BsCash } from "react-icons/bs";
import { PiCashRegisterFill } from "react-icons/pi";
import { GoAlert } from "react-icons/go";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  test: (p: string) => boolean;
};

const topItems: NavItem[] = [
  { href: "/painel/servicos", label: "Services", Icon: FiScissors, test: (p) => p.startsWith("/painel/servicos") },
  { href: "/painel/barbeiros", label: "Barbers", Icon: FiUsers, test: (p) => p.startsWith("/painel/barbeiros") },
  { href: "/painel/clientes", label: "Customers", Icon: FiUser, test: (p) => p.startsWith("/painel/clientes") },
  { href: "/painel/remuneracoes", label: "Compensation", Icon: BsCash, test: (p) => p.startsWith("/painel/remuneracoes") },
  { href: "/painel/calendar", label: "Calendar", Icon: FiCalendar, test: (p) => p.startsWith("/painel/calendar") },
  { href: "/painel/produtos", label: "Products", Icon: FiPackage, test: (p) => p.startsWith("/painel/produtos") },
  { href: "/painel/recursos", label: "Resources", Icon: FiCpu, test: (p) => p.startsWith("/painel/recursos") },
  { href: "/painel/caixa", label: "Cashier", Icon: PiCashRegisterFill, test: (p) => p.startsWith("/painel/caixa") },
  { href: "/painel/relatorios", label: "Reports", Icon: FiBarChart2, test: (p) => p.startsWith("/painel/relatorios") },
  { href: "/painel/configuracoes", label: "Settings", Icon: FiSettings, test: (p) => p.startsWith("/painel/configuracoes") },
];

export default function PainelNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loadingOut, setLoadingOut] = useState(false);

  const isStockPath = useMemo(() => pathname.startsWith("/painel/estoque"), [pathname]);
  const [stockOpen, setStockOpen] = useState<boolean>(isStockPath);

  useEffect(() => {
    setMobileOpen(false);
    setStockOpen(pathname.startsWith("/painel/estoque"));
  }, [pathname]);

  const base = "flex items-center gap-3 rounded-lg px-3 py-2 transition border border-transparent";
  const active = "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white";
  const inactive =
    "border-transparent text-[#E4E7EC] " +
    "hover:border-[#2A2E36] " +
    "hover:bg-[#0F1115]/60 hover:backdrop-blur-md " +
    "hover:shadow-[0_18px_55px_rgba(0,0,0,0.55)] " +
    "hover:-translate-y-[1px] hover:translate-x-[1px] hover:scale-[1.01]";

  async function logout() {
    try {
      setLoadingOut(true);
      await fetch("/api/admin/logout", { method: "POST" });
      window.location.assign("/admin/login");
    } finally {
      setLoadingOut(false);
    }
  }

  function NavLink({
    href,
    label,
    Icon,
    isActive,
  }: {
    href: string;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
  }) {
    return (
      <Link href={href} title={label} className={`${base} ${isActive ? active : inactive}`}>
        <Icon className="text-xl shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  }

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-3">
        <Link href="/painel" className="flex items-center gap-2">
          {!collapsed && <span className="text-xl font-extrabold tracking-widest">DASHBOARD</span>}
        </Link>
        <button
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed((v) => !v)}
          className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F]"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <FiMenu /> : <FiChevronLeft />}
        </button>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3 overflow-y-auto min-h-0">
        {topItems.slice(0, 5).map(({ href, label, Icon, test }) => {
          const isActive = test(pathname);
          return <NavLink key={href} href={href} label={label} Icon={Icon} isActive={isActive} />;
        })}

        <div className="mt-1">
          <button
            type="button"
            onClick={() => setStockOpen((v) => !v)}
            className={`${base} ${isStockPath ? active : inactive} w-full justify-between`}
            title="Inventory"
          >
            <span className="flex items-center gap-3">
              <FiPackage className="text-xl shrink-0" />
              {!collapsed && <span className="truncate">Inventory</span>}
            </span>
            {!collapsed && (
              <FiChevronDown className={`transition-transform ${stockOpen ? "rotate-0" : "-rotate-90"}`} />
            )}
          </button>

          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-200 ease-out ${
              collapsed
                ? "max-h-0 opacity-0"
                : stockOpen
                ? "max-h-40 opacity-100 mt-1"
                : "max-h-0 opacity-0"
            }`}
          >
            <div className="pl-9 space-y-1">
              <NavLink
                href="/painel/estoque/alertas"
                label="Alerts"
                Icon={GoAlert}
                isActive={pathname.startsWith("/painel/estoque/alertas")}
              />
              <NavLink
                href="/painel/estoque/relatorios"
                label="Reports"
                Icon={FiBarChart2}
                isActive={pathname.startsWith("/painel/estoque/relatorios")}
              />
            </div>
          </div>
        </div>

        {topItems.slice(5).map(({ href, label, Icon, test }) => {
          const isActive = test(pathname);
          return <NavLink key={href} href={href} label={label} Icon={Icon} isActive={isActive} />;
        })}
      </nav>

      <div className="p-3 mt-auto">
        <button
          onClick={logout}
          disabled={loadingOut}
          className="w-full inline-flex items-center justify-center gap-3 rounded-lg border border-[#2A2E36] px-3 py-2 text-[#E4E7EC] hover:bg-fuchsia-500 hover:text-white disabled:opacity-50 transition"
          title="Sign out"
        >
          <FiLogOut className="text-xl" />
          {!collapsed && <span>{loadingOut ? "Signing out..." : "Sign out"}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="md:hidden sticky top-0 z-40 w-full bg-[#0F1115]/80 backdrop-blur border-b border-[#24272D]">
        <div className="flex items-start justify-start px-4 py-3 relative">
          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="h-10 w-10 grid place-items-center rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F]"
          >
            <FiMenu className="text-[22px]" />
          </button>
        </div>
      </div>

      <aside
        className={`hidden md:block fixed left-0 top-0 h-screen z-[9999] isolate border-r border-[#24272D] bg-[#0F1115] transition-[width] duration-200 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <div
          className="
            pointer-events-none
            absolute right-0 top-0 h-full w-[2px]
            bg-gradient-to-b from-indigo-500 to-fuchsia-500
            shadow-[0_0_12px_rgba(99,102,241,0.9)]
          "
        />
        {content}
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute left-0 top-0 h-full w-72 border-r border-[#24272D] bg-[#0F1115] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-[#24272D]">
              <span className="text-xl font-extrabold tracking-widest">DASHBOARD</span>
              <button
                aria-label="Close"
                onClick={() => setMobileOpen(false)}
                className="h-9 w-9 grid place-items-center rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F]"
              >
                <FiChevronLeft />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">{content}</div>
          </div>
        </div>
      )}
    </>
  );
}
