import { useEffect, useMemo, useState } from "react";
import { Filter, Store, UserRound, RotateCcw } from "lucide-react";
import { fetchSalesSummary, fetchSalesTrend } from "../../api/salesSummary";
import { fetchUsers } from "../../api/users";
import { fetchStores } from "../../api/stores";
import { DateRangePicker } from "../../components/DateRangePicker";

/* ================= CHART ================= */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/* ================= TYPES ================= */

type SalesSummary = {
  total_products_sold: number | string;
  revenue_ht: number | string;
  revenue_net: number | string;
  discount: number | string;
  profit: number | string;

  tva?: number | string;
  remboursements?: number | string;
  rachats?: number | string;
  nb_reductions?: number | string;
};

type SalesTrend = {
  date: string;
  revenue_ht: number | string;
};

/* ================= UTILS ================= */

function toDateTimeLocalValue(d: Date, time: string = "00:00") {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`;
}

function formatFcfa(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("XOF", "FCFA");
}

/* ================= CARD ================= */

function StatCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle?: string;
  accent: "blue" | "green" | "cyan" | "amber";
}) {
  const accentClasses =
    accent === "blue"
      ? "border-l-[#3B82F6] bg-blue-50/40"
      : accent === "green"
        ? "border-l-emerald-500 bg-emerald-50/40"
        : accent === "cyan"
          ? "border-l-cyan-500 bg-cyan-50/40"
          : "border-l-amber-500 bg-amber-50/40";

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-5 shadow-sm ${accentClasses} border-l-4`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {subtitle && <div className="mt-3 text-sm text-gray-600">{subtitle}</div>}
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

  const [applied, setApplied] = useState(() => {
    const d = new Date();
    d.setDate(1);
    const start = toDateTimeLocalValue(d);
    const d2 = new Date();
    const lastDay = new Date(d2.getFullYear(), d2.getMonth() + 1, 0);
    const end = toDateTimeLocalValue(lastDay, "23:59");
    return {
      employeeId: "all",
      storeId: "all",
      from: start,
      to: end,
    };
  });

  /* ================= DATA ================= */

  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [trend, setTrend] = useState<SalesTrend[]>([]);
  const [loading, setLoading] = useState(false);

  /* ================= LOAD USERS / STORES ================= */

  useEffect(() => {
    async function loadMeta() {
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
            store_id:
              applied.storeId !== "all" ? Number(applied.storeId) : undefined,
            employee_id:
              applied.employeeId !== "all"
                ? Number(applied.employeeId)
                : undefined,
          }),

          fetchSalesTrend({
            start_date: applied.from,
            end_date: applied.to,
            store_id:
              applied.storeId !== "all" ? Number(applied.storeId) : undefined,
            employee_id:
              applied.employeeId !== "all"
                ? Number(applied.employeeId)
                : undefined,
          }),
        ]);

        setSummary(summaryRes.data);

        const mappedTrend = trendRes.data.map((t: any) => ({
          date: t.date,
          revenue_ht: Number(t.revenue_ht),
        }));

        setTrend(mappedTrend);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [applied]);

  /* ================= SAFE NUM ================= */

  const num = (v: any) => Number(v ?? 0);

  const recap = useMemo(() => {
    return {
      ventesHT: num(summary?.revenue_ht),
      ventesTTC: num(summary?.revenue_net),
      reductions: num(summary?.discount),
      margeHT: num(summary?.profit),
      nbArticles: num(summary?.total_products_sold),
    };
  }, [summary]);

  /* ================= CHART ================= */

  const chartData = useMemo(() => {
    return trend.map((t) => ({
      date: t.date,
      revenue: t.revenue_ht,
    }));
  }, [trend]);

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">
          Récapitulatifs des ventes
        </h1>
      </header>

      {/* FILTERS */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">
              Employés
            </div>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10"
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
              Magasins
            </div>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10"
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

      {/* KPI */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Ventes HT"
          value={formatFcfa(recap.ventesHT)}
          subtitle={`Articles : ${recap.nbArticles}`}
          accent="blue"
        />

        <StatCard
          title="Ventes TTC"
          value={formatFcfa(recap.ventesTTC)}
          accent="green"
        />

        <StatCard
          title="Réduction"
          value={formatFcfa(recap.reductions)}
          accent="cyan"
        />

        <StatCard
          title="Marge HT"
          value={formatFcfa(recap.margeHT)}
          accent="amber"
        />
      </div>

      {/* CHART */}
      <div className="mt-8 rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700">
          Évolution des ventes
        </h2>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
