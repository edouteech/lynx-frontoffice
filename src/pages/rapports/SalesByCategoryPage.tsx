import { useMemo, useState, useEffect } from "react";
import { Filter, Store, UserRound, Printer, RotateCcw, TrendingUp, ShoppingBag, BadgeDollarSign, Percent } from "lucide-react";
import DataTable, { type Column } from "../../components/DataTable";
import { DateRangePicker } from "../../components/DateRangePicker";
import { fetchSalesByCategory, type SalesByCategory } from "../../api/salesByCategory";
import { fetchUsers } from "../../api/users";
import { fetchStores } from "../../api/stores";

/* ================= TYPES ================= */

type Row = SalesByCategory & {
  employeeId: string;
  storeId: string;
  soldAt: string;
};

/* ================= FORMAT UTILS ================= */

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

export default function SalesByCategoryPage() {
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

  const [employeeId, setEmployeeId] = useState("all");
  const [storeId, setStoreId] = useState("all");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const hasFilters = employeeId !== "all" || storeId !== "all" || from !== defaultFrom || to !== defaultTo;

  const handleClearFilters = () => {
    setEmployeeId("all");
    setStoreId("all");
    setFrom(defaultFrom);
    setTo(defaultTo);
    setAppliedEmployeeId("all");
    setAppliedStoreId("all");
    setAppliedFrom(defaultFrom);
    setAppliedTo(defaultTo);
  };

  const [appliedEmployeeId, setAppliedEmployeeId] = useState("all");
  const [appliedStoreId, setAppliedStoreId] = useState("all");
  const [appliedFrom, setAppliedFrom] = useState(from);
  const [appliedTo, setAppliedTo] = useState(to);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "Tous les employés" },
  ]);

  const [stores, setStores] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "Tous les magasins" },
  ]);

  /* ================= API LOAD ================= */

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetchSalesByCategory({
          start_date: appliedFrom,
          end_date: appliedTo,
          store_id: appliedStoreId !== "all" ? Number(appliedStoreId) : undefined,
          employee_id: appliedEmployeeId !== "all" ? Number(appliedEmployeeId) : undefined,
        });

        const mapped: Row[] = res.data.map((item) => ({
          ...item,
          employeeId: appliedEmployeeId,
          storeId: appliedStoreId,
          soldAt: new Date().toISOString(),
        }));

        setRows(mapped);
      } catch (e) {
        console.error(e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [appliedFrom, appliedTo, appliedStoreId, appliedEmployeeId]);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [usersRes, storesRes] = await Promise.all([
          fetchUsers(1),
          fetchStores(1),
        ]);
        setEmployees([{ id: "all", name: "Tous les employés" }, ...usersRes.data.map(u => ({ id: String(u.id), name: u.name }))]);
        setStores([{ id: "all", name: "Tous les magasins" }, ...storesRes.data.map(s => ({ id: String(s.id), name: s.name }))]);
      } catch (e) {
        console.error("Erreur chargement metadata", e);
      }
    }
    loadMeta();
  }, []);

  /* ================= KPI CALCULATIONS ================= */
  
  const totals = useMemo(() => {
    return rows.reduce((acc, row) => ({
      revenue_ttc: acc.revenue_ttc + Number(row.revenue_net),
      revenue_ht: acc.revenue_ht + Number(row.revenue_ht),
      total_cost_ht: acc.total_cost_ht + Number(row.total_cost_ht),
      profit_ht: acc.profit_ht + Number(row.profit_ht),
      items_sold: acc.items_sold + Number(row.quantity_sold),
    }), { revenue_ttc: 0, revenue_ht: 0, total_cost_ht: 0, profit_ht: 0, items_sold: 0 });
  }, [rows]);

  const avgMarginPct = useMemo(() => {
    if (totals.total_cost_ht === 0) return 0;
    return (totals.profit_ht / totals.total_cost_ht) * 100;
  }, [totals]);

  /* ================= COLUMNS ================= */

  const columns: Column<Row>[] = useMemo(
    () => [
      { 
        key: "category", 
        label: "Catégorie", 
        sortable: true,
        render: (v) => <span className="font-semibold text-gray-900">{String(v)}</span>
      },
      {
        key: "quantity_sold",
        label: "Qté articles vendues",
        sortable: true,
        align: "right",
        render: (v) => (
          <span className="inline-flex items-center rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-700">
            {formatNumber(Number(v ?? 0))}
          </span>
        ),
      },
      {
        key: "total_cost_ht",
        label: "Coût d'achat",
        sortable: true,
        align: "right",
        render: (_, row) => (
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500">HT: {formatFcfa(row.total_cost_ht)}</span>
            <span className="font-medium text-gray-700">TTC: {formatFcfa(row.total_cost_ttc)}</span>
          </div>
        ),
      },
      {
        key: "revenue_ht",
        label: "CA HT",
        sortable: true,
        align: "right",
        render: (v) => <span className="font-medium text-gray-700">{formatFcfa(Number(v ?? 0))}</span>,
      },
      {
        key: "revenue_net",
        label: "CA TTC",
        sortable: true,
        align: "right",
        render: (v) => <span className="font-bold text-blue-700">{formatFcfa(Number(v ?? 0))}</span>,
      },
      {
        key: "profit_ht",
        label: "Marge HT",
        sortable: true,
        align: "right",
        render: (v) => (
          <span className={`font-semibold ${Number(v) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatFcfa(Number(v ?? 0))}
          </span>
        ),
      },
      {
        key: "margin_percent",
        label: "Taux marge",
        sortable: true,
        align: "right",
        render: (v) => {
          const pct = Number(v ?? 0);
          return (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${pct >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {pct.toFixed(1)} %
            </span>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">
          Analyse par catégorie
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Performance des ventes regroupées par rayons et catégories
        </p>
      </header>

      {/* FILTERS */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm mb-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">Employés</div>
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
            <div className="mb-1 text-xs font-semibold text-gray-600">Magasin</div>
            <div className="relative">
              <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
              onClick={() => {
                setAppliedEmployeeId(employeeId);
                setAppliedStoreId(storeId);
                setAppliedFrom(from);
                setAppliedTo(to);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/20 hover:bg-[#2563EB] active:scale-95 transition-all"
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
              <span className="text-xl font-bold text-gray-900">TTC = {formatFcfa(totals.revenue_ttc)}</span>
              <span className="text-sm font-medium text-gray-600">HT = {formatFcfa(totals.revenue_ht)}</span>
            </div>
          }
          icon={BadgeDollarSign}
          accent="bg-blue-600"
        />
        <KpiCard
          label="Marge globale"
          value={
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">{formatFcfa(totals.profit_ht)}</span>
              <span className="text-sm font-medium text-emerald-600">Taux = {avgMarginPct.toFixed(1)} %</span>
            </div>
          }
          tooltip={`Marge HT = CA HT - Coût HT\nTaux = (Marge HT / Coût HT) * 100`}
          icon={TrendingUp}
          accent="bg-emerald-600"
        />
        <KpiCard
          label="Volume d'articles"
          value={<span className="text-2xl font-bold text-gray-900">{formatNumber(totals.items_sold)}</span>}
          icon={ShoppingBag}
          accent="bg-violet-600"
        />
        <KpiCard
          label="Top Catégorie"
          value={<span className="text-xl font-bold text-gray-900 truncate">{rows[0]?.category || "---"}</span>}
          sub={<span className="text-xs text-gray-500">{rows[0] ? formatFcfa(rows[0].revenue_net) : ""}</span>}
          icon={Percent}
          accent="bg-amber-600"
        />
      </div>

      {/* TABLE */}
      <div className="mt-6">
        <DataTable<Row>
          data={rows}
          columns={columns}
          title="Performance détaillée par catégorie"
          searchable
          searchPlaceholder="Rechercher une catégorie…"
          exportFilename="ventes-par-categorie"
          loading={loading}
          customFilters={
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              Imprimer
            </button>
          }
          getRowId={(r) => r.category}
        />
      </div>
    </div>
  );
}

