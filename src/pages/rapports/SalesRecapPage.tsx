import { useEffect, useMemo, useState } from "react";
import { Filter, Store, UserRound, RotateCcw, TrendingUp, ShoppingBag, BadgeDollarSign, Percent } from "lucide-react";
import { fetchSalesSummary, fetchSalesTrend } from "../../api/salesSummary";
import { fetchUsers } from "../../api/users";
import { fetchStores } from "../../api/stores";
import { DateRangePicker } from "../../components/DateRangePicker";

/* ================= CHART ================= */

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/* ================= TYPES ================= */

type SalesSummary = {
  total_transactions: number;
  total_items_sold: number;
  revenue_ttc_gross: number;
  revenue_ht_gross: number;
  discount_ttc: number;
  revenue_ttc: number;
  revenue_ht: number;
  total_cost_ttc: number;
  total_cost_ht: number;
  commission_amount: number;
  profit_ht: number;
  profit_margin_pct: number;
};

type SalesTrend = {
  date: string;
  revenue_net: number;
};

/* ================= UTILS ================= */

function formatFcfa(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("XOF", "FCFA");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
}

function toDateTimeLocalValue(d: Date, time: string = "00:00") {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`;
}

/* ================= KPI CARD ================= */

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  tooltip,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  tooltip?: string;
}) {
  return (
    <div 
      className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md"
      title={tooltip}
    >
      <div className={`absolute right-0 top-0 h-24 w-24 rounded-bl-full opacity-10 ${accent} transition-transform group-hover:scale-110`} />
      
      <div className="flex items-center gap-3 mb-4">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent} shadow-inner`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="text-sm font-bold uppercase tracking-wide text-gray-500">{label}</p>
      </div>

      <div className="mt-2 text-gray-900">
        {value}
      </div>
      {sub && <div className="mt-2 border-t border-gray-50 pt-2">{sub}</div>}
    </div>
  );
}

/* ================= PAGE ================= */

export default function SalesRecapPage() {
  const [employeeId, setEmployeeId] = useState("all");
  const [storeId, setStoreId] = useState("all");

  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "Tous les employés" },
  ]);

  const [stores, setStores] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "Tous les magasins" },
  ]);

  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    return toDateTimeLocalValue(d);
  }, []);

  const defaultTo = useMemo(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return toDateTimeLocalValue(lastDay, "23:59");
  }, []);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const hasFilters =
    employeeId !== "all" ||
    storeId !== "all" ||
    from !== defaultFrom ||
    to !== defaultTo;

  const [applied, setApplied] = useState({
    employeeId: "all",
    storeId: "all",
    from: defaultFrom,
    to: defaultTo,
  });

  const handleClearFilters = () => {
    setEmployeeId("all");
    setStoreId("all");
    setFrom(defaultFrom);
    setTo(defaultTo);
    setApplied({
      employeeId: "all",
      storeId: "all",
      from: defaultFrom,
      to: defaultTo,
    });
  };

  /* ================= DATA ================= */

  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [trend, setTrend] = useState<SalesTrend[]>([]);
  const [loading, setLoading] = useState(false);

  /* ================= LOAD USERS / STORES ================= */

  useEffect(() => {
    async function loadMeta() {
      try {
        const [usersRes, storesRes] = await Promise.all([
          fetchUsers(1),
          fetchStores(1),
        ]);

        setEmployees([
          { id: "all", name: "Tous les employés" },
          ...usersRes.data.map((u: any) => ({
            id: String(u.id),
            name: u.name,
          })),
        ]);

        setStores([
          { id: "all", name: "Tous les magasins" },
          ...storesRes.data.map((s: any) => ({
            id: String(s.id),
            name: s.name,
          })),
        ]);
      } catch (e) {
        console.error("Error loading metadata:", e);
      }
    }

    loadMeta();
  }, []);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [summaryRes, trendRes] = await Promise.all([
          fetchSalesSummary({
            start_date: applied.from,
            end_date: applied.to,
            store_id: applied.storeId !== "all" ? Number(applied.storeId) : undefined,
            employee_id: applied.employeeId !== "all" ? Number(applied.employeeId) : undefined,
          }),

          fetchSalesTrend({
            start_date: applied.from,
            end_date: applied.to,
            store_id: applied.storeId !== "all" ? Number(applied.storeId) : undefined,
            employee_id: applied.employeeId !== "all" ? Number(applied.employeeId) : undefined,
          }),
        ]);

        setSummary(summaryRes.data);
        setTrend(trendRes.data);
      } catch (e) {
        console.error("Error loading summary data:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [applied]);

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">
          Récapitulatifs des ventes
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Performance globale et évolution temporelle
        </p>
      </header>

      {/* FILTERS */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm mb-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">
              Employé
            </div>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <div className="lg:col-span-4">
            <div className="mb-1 text-xs font-semibold text-gray-600">Période</div>
            <DateRangePicker
              from={from}
              to={to}
              onRangeChange={(f, t) => {
                setFrom(f);
                setTo(t);
              }}
            />
          </div>

          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">
              Magasin
            </div>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <div className="lg:col-span-2 flex gap-2">
            {hasFilters && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setApplied({ employeeId, storeId, from, to })}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/20 hover:bg-[#2563EB] active:scale-95 transition-all disabled:opacity-50"
            >
              <Filter className="h-4 w-4" />
              Filtrer
            </button>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Chiffre d'affaire"
          value={
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">
                TTC = {formatFcfa(summary?.revenue_ttc ?? 0)}
              </span>
              <span className="text-sm font-medium text-gray-600">
                HT = {formatFcfa(summary?.revenue_ht ?? 0)}
              </span>
            </div>
          }
          icon={BadgeDollarSign}
          accent="bg-blue-600"
        />
        <KpiCard
          label="Marge"
          value={
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">
                {formatFcfa(summary?.profit_ht ?? 0)}
              </span>
              <span className="text-sm font-medium text-emerald-600">
                Taux = {Number(summary?.profit_margin_pct ?? 0).toFixed(1)} %
              </span>
            </div>
          }
          tooltip={`marge HT = vente HT - achat HT\nTaux de marge = (prix de vente HT - cout d'achat HT) / cout d'achat HT * 100`}
          icon={TrendingUp}
          accent="bg-emerald-600"
        />
        <KpiCard
          label="Volume de vente"
          value={
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">
                {formatNumber(summary?.total_transactions ?? 0)} Transactions
              </span>
              <span className="text-sm font-medium text-gray-600">
                {formatNumber(summary?.total_items_sold ?? 0)} Articles
              </span>
            </div>
          }
          icon={ShoppingBag}
          accent="bg-violet-600"
        />
        <KpiCard
          label="Commissions"
          value={
            <span className="text-2xl font-bold text-gray-900">
              {formatFcfa(summary?.commission_amount ?? 0)}
            </span>
          }
          icon={Percent}
          accent="bg-amber-600"
        />
      </div>

      {/* CHART */}
      <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Évolution des ventes
            </h2>
            <p className="text-sm text-gray-500">CA TTC sur la période</p>
          </div>
        </header>

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="date" 
                stroke="#94A3B8" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => new Date(val).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              />
              <YAxis 
                stroke="#94A3B8" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(val: number) => [formatFcfa(val), "CA TTC"]}
              />
              <Area
                type="monotone"
                dataKey="revenue_net"
                stroke="#3B82F6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

