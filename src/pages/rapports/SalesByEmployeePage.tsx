import { useMemo, useState, useEffect } from "react";
import { Filter, Store, Printer, RotateCcw, UserRound, TrendingUp, BadgeDollarSign, Percent } from "lucide-react";
import DataTable, { type Column } from "../../components/DataTable";
import { DateRangePicker } from "../../components/DateRangePicker";
import { fetchSalesByEmployee, type SalesByEmployee } from "../../api/salesByEmployee";
import { fetchStores } from "../../api/stores";

/* ================= TYPES ================= */

type Row = SalesByEmployee;

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

export default function SalesByEmployeePage() {
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

  /* ================= FILTER UI ================= */
  const [storeId, setStoreId] = useState<string>("all");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const hasFilters = storeId !== "all" || from !== defaultFrom || to !== defaultTo;

  const handleClearFilters = () => {
    setStoreId("all");
    setFrom(defaultFrom);
    setTo(defaultTo);
    setAppliedStoreId("all");
    setAppliedFrom(defaultFrom);
    setAppliedTo(defaultTo);
  };

  /* ================= APPLIED FILTER ================= */
  const [appliedStoreId, setAppliedStoreId] = useState<string>("all");
  const [appliedFrom, setAppliedFrom] = useState(from);
  const [appliedTo, setAppliedTo] = useState(to);

  /* ================= DATA ================= */
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  /* ================= STORES ================= */
  const [stores, setStores] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "Tous les magasins" },
  ]);

  useEffect(() => {
    async function loadStores() {
      try {
        const res = await fetchStores(1);
        const mapped = res.data.map((s) => ({ id: String(s.id), name: s.name }));
        setStores([{ id: "all", name: "Tous les magasins" }, ...mapped]);
      } catch (e) {
        console.error(e);
      }
    }
    loadStores();
  }, []);

  /* ================= LOAD API ================= */
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetchSalesByEmployee({
          start_date: appliedFrom,
          end_date: appliedTo,
          store_id: appliedStoreId !== "all" ? Number(appliedStoreId) : undefined,
        });
        setRows(res.data);
      } catch (e) {
        console.error(e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [appliedFrom, appliedTo, appliedStoreId]);

  /* ================= KPI CALCULATIONS ================= */
  const totals = useMemo(() => {
    return rows.reduce((acc, row) => ({
      revenue_ttc: acc.revenue_ttc + Number(row.revenue_net),
      revenue_ht: acc.revenue_ht + Number(row.revenue_ht),
      total_cost_ht: acc.total_cost_ht + Number(row.total_cost_ht),
      profit_ht: acc.profit_ht + Number(row.profit_ht),
      total_tx: acc.total_tx + Number(row.total_transactions),
      commission: acc.commission + Number(row.commission_amount),
    }), { revenue_ttc: 0, revenue_ht: 0, total_cost_ht: 0, profit_ht: 0, total_tx: 0, commission: 0 });
  }, [rows]);

  const avgMarginPct = useMemo(() => {
    if (totals.total_cost_ht === 0) return 0;
    return (totals.profit_ht / totals.total_cost_ht) * 100;
  }, [totals]);

  /* ================= TABLE ================= */
  const columns: Column<Row>[] = useMemo(
    () => [
      { 
        key: "employee", 
        label: "Vendeur", 
        sortable: true,
        render: (v) => <span className="font-semibold text-gray-900">{String(v)}</span>
      },
      {
        key: "total_transactions",
        label: "Nbr Transactions",
        sortable: true,
        align: "right",
        render: (v) => formatNumber(Number(v ?? 0)),
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
      {
        key: "commission_amount",
        label: "Commission",
        sortable: true,
        align: "right",
        render: (v) => <span className="font-semibold text-amber-600">{formatFcfa(Number(v ?? 0))}</span>,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">
          Ventes par employé
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Analyse de la performance individuelle des vendeurs
        </p>
      </header>

      {/* ================= FILTER ================= */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm mb-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
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

          <label className="lg:col-span-4">
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

          <div className="lg:col-span-4 flex gap-2">
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
          label="Marge générée"
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
          label="Transactions"
          value={<span className="text-2xl font-bold text-gray-900">{formatNumber(totals.total_tx)}</span>}
          icon={UserRound}
          accent="bg-violet-600"
        />
        <KpiCard
          label="Commissions"
          value={<span className="text-2xl font-bold text-gray-900">{formatFcfa(totals.commission)}</span>}
          icon={Percent}
          accent="bg-amber-600"
        />
      </div>

      {/* ================= TABLE ================= */}
      <div className="mt-6">
        <DataTable<Row>
          data={rows}
          columns={columns}
          title="Performance par vendeur"
          searchable
          searchPlaceholder="Rechercher un vendeur…"
          exportFilename="ventes-par-employe"
          emptyMessage={loading ? "Chargement..." : "Aucune donnée de vente pour cette période"}
          customFilters={
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              Imprimer
            </button>
          }
          getRowId={(r) => r.employee}
        />
      </div>
    </div>
  );
}

