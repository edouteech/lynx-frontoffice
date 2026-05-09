import { useMemo, useState, useEffect } from "react";
import { Filter, Store, Printer, TrendingUp, ShoppingBag, BadgeDollarSign, Percent, RotateCcw } from "lucide-react";
import DataTable, { type Column } from "../../components/DataTable";
import { DateRangePicker } from "../../components/DateRangePicker";
import { fetchSalesByStore, type SalesByStore } from "../../api/salesByStore";
import { fetchStores } from "../../api/stores";
import { fetchItemCategories } from "../../api/itemCategories";

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
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
      <div className={`absolute right-0 top-0 h-24 w-24 rounded-bl-full opacity-10 ${accent}`} />
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

/* ================= HISTOGRAM ================= */

function StoreHistogram({ data }: { data: SalesByStore[] }) {
  const sorted = [...data].sort((a, b) => b.revenue_net - a.revenue_net);
  if (!sorted.length) return null;

  const CHART_H  = 260;
  const BAR_W    = 56;
  const BAR_GAP  = 24;
  const PAD_LEFT = 52;
  const PAD_RIGHT = 16;
  const PAD_TOP  = 38;
  const PAD_BOT  = 64;
  const GRID     = 5;

  const maxVal = sorted[0]?.revenue_net ?? 1;
  const totalW = PAD_LEFT + sorted.length * (BAR_W + BAR_GAP) - BAR_GAP + PAD_RIGHT;

  const COLORS = [
    "#3B82F6","#6366F1","#8B5CF6","#EC4899",
    "#F59E0B","#10B981","#06B6D4","#F97316",
  ];

  function fmtK(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(0)} k`;
    return String(v);
  }

  function abbr(name: string, max = 11) {
    return name.length > max ? name.slice(0, max - 1) + "…" : name;
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 overflow-x-auto">
      <h3 className="mb-1 text-sm font-bold text-gray-700">CA Net par magasin</h3>
      <p className="mb-4 text-xs text-gray-400">Trié par CA net décroissant</p>
      <svg
        width={Math.max(totalW, 400)}
        height={CHART_H + PAD_TOP + PAD_BOT}
        className="overflow-visible"
        aria-label="Histogramme CA net par magasin"
      >
        {/* Grille horizontale + étiquettes axe Y */}
        {Array.from({ length: GRID + 1 }, (_, i) => {
          const y   = PAD_TOP + (CHART_H / GRID) * i;
          const val = maxVal * (1 - i / GRID);
          return (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                x2={totalW - PAD_RIGHT}
                y1={y} y2={y}
                stroke={i === GRID ? "#94A3B8" : "#E2E8F0"}
                strokeWidth={i === GRID ? 1.5 : 1}
                strokeDasharray={i === GRID ? undefined : "4 3"}
              />
              <text x={PAD_LEFT - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#94A3B8">
                {fmtK(val)}
              </text>
            </g>
          );
        })}

        {/* Label axe Y */}
        <text
          x={10} y={PAD_TOP + CHART_H / 2}
          textAnchor="middle" fontSize={9} fill="#94A3B8"
          transform={`rotate(-90, 10, ${PAD_TOP + CHART_H / 2})`}
        >
          CA Net (FCFA)
        </text>

        {/* Barres + valeurs + labels X */}
        {sorted.map((store, i) => {
          const barH  = maxVal > 0 ? (store.revenue_net / maxVal) * CHART_H : 0;
          const x     = PAD_LEFT + i * (BAR_W + BAR_GAP);
          const y     = PAD_TOP + CHART_H - barH;
          const color = COLORS[i % COLORS.length];

          return (
            <g key={store.store_id}>
              {/* Barre */}
              <rect x={x} y={y} width={BAR_W} height={barH} fill={color} rx={6} opacity={0.85}>
                <title>{store.store_name} : {formatFcfa(store.revenue_net)}</title>
              </rect>

              {/* Valeur au-dessus */}
              <text
                x={x + BAR_W / 2} y={y - 7}
                textAnchor="middle" fontSize={9} fontWeight="700" fill={color}
              >
                {formatFcfa(store.revenue_net)}
              </text>

              {/* Nom magasin */}
              <text
                x={x + BAR_W / 2} y={PAD_TOP + CHART_H + 18}
                textAnchor="middle" fontSize={10} fontWeight="600" fill="#374151"
              >
                {abbr(store.store_name)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}


/* ================= PROFIT BADGE ================= */

function ProfitBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        isPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {isPositive ? "+" : ""}
      {formatFcfa(value)}
    </span>
  );
}

/* ================= MAIN PAGE ================= */

export default function SalesByStorePage() {
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

  /* Filters UI */
  const [storeId, setStoreId] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const hasFilters =
    storeId !== "all" ||
    categoryId !== "all" ||
    from !== defaultFrom ||
    to !== defaultTo;

  const handleClearFilters = () => {
    setStoreId("all");
    setCategoryId("all");
    setFrom(defaultFrom);
    setTo(defaultTo);
    setAppliedStoreId("all");
    setAppliedCategoryId("all");
    setAppliedFrom(defaultFrom);
    setAppliedTo(defaultTo);
  };

  /* Applied filters */
  const [appliedStoreId, setAppliedStoreId] = useState<string>("all");
  const [appliedCategoryId, setAppliedCategoryId] = useState<string>("all");
  const [appliedFrom, setAppliedFrom] = useState(from);
  const [appliedTo, setAppliedTo] = useState(to);

  /* Category filter UI (merged above) */

  /* Stores list */
  const [stores, setStores] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "Tous les magasins" },
  ]);

  /* Categories list */
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "Toutes les catégories" },
  ]);

  /* Data */
  const [rows, setRows] = useState<SalesByStore[]>([]);
  const [loading, setLoading] = useState(false);

  /* Load stores */
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

  /* Load categories */
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetchItemCategories(1);
        const mapped = res.data.map((c) => ({ id: String(c.id), name: c.name }));
        setCategories([{ id: "all", name: "Toutes les catégories" }, ...mapped]);
      } catch (e) {
        console.error(e);
      }
    }
    loadCategories();
  }, []);

  /* Load report data */
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const sid = appliedStoreId !== "all" ? Number(appliedStoreId) : undefined;
        const cid = appliedCategoryId !== "all" ? Number(appliedCategoryId) : undefined;

        const byStore = await fetchSalesByStore({ start_date: appliedFrom, end_date: appliedTo, store_id: sid, category_id: cid });

        setRows(byStore.data);
      } catch (e) {
        console.error(e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [appliedFrom, appliedTo, appliedStoreId, appliedCategoryId]);

  /* KPIs */
  const totalRevenuNet = useMemo(() => rows.reduce((s, r) => s + Number(r.revenue_net ?? 0), 0), [rows]);
  const totalProfit     = useMemo(() => rows.reduce((s, r) => s + Number(r.profit ?? 0), 0), [rows]);
  const totalTx         = useMemo(() => rows.reduce((s, r) => s + Number(r.total_transactions ?? 0), 0), [rows]);
  const avgMargin       = useMemo(() => {
    if (!rows.length) return 0;
    return rows.reduce((s, r) => s + Number(r.profit_margin_pct ?? 0), 0) / rows.length;
  }, [rows]);

  /* Table columns */
  const columns: Column<SalesByStore>[] = useMemo(
    () => [
      {
        key: "store_name",
        label: "Magasin",
        sortable: true,
        render: (v) => (
          <span className="flex items-center gap-2 font-semibold text-gray-900">
            <Store className="h-4 w-4 text-blue-400" />
            {String(v)}
          </span>
        ),
      },
      {
        key: "total_transactions",
        label: "Transactions",
        sortable: true,
        align: "right",
        render: (v) => formatNumber(Number(v ?? 0)),
      },
      {
        key: "total_items_sold",
        label: "Articles vendus",
        sortable: true,
        align: "right",
        render: (v) => formatNumber(Number(v ?? 0)),
      },
      {
        key: "revenue_ht",
        label: "CA Brut HT",
        sortable: true,
        align: "right",
        render: (v) => formatFcfa(Number(v ?? 0)),
      },
      {
        key: "total_discount",
        label: "Remises",
        sortable: true,
        align: "right",
        render: (v) => (
          <span className="text-red-500">-{formatFcfa(Number(v ?? 0))}</span>
        ),
      },
      {
        key: "revenue_net",
        label: "CA Net",
        sortable: true,
        align: "right",
        render: (v) => (
          <span className="font-bold text-blue-700">{formatFcfa(Number(v ?? 0))}</span>
        ),
      },
      {
        key: "total_cost",
        label: "Coût d'achat",
        sortable: true,
        align: "right",
        render: (v) => formatFcfa(Number(v ?? 0)),
      },
      {
        key: "profit",
        label: "Marge brute",
        sortable: true,
        align: "right",
        render: (v) => <ProfitBadge value={Number(v ?? 0)} />,
      },
      {
        key: "profit_margin_pct",
        label: "Taux marge",
        sortable: true,
        align: "right",
        render: (v) => {
          const pct = Number(v ?? 0);
          return (
            <span
              className={`font-semibold ${pct >= 0 ? "text-emerald-600" : "text-red-600"}`}
            >
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
        <h1 className="text-2xl font-semibold text-gray-900">Synthèse globale</h1>
        <p className="mt-1 text-sm text-gray-500">
          Comparatif des performances commerciales par point de vente
        </p>
      </header>

      {/* ================= FILTER BAR ================= */}
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

          <label className="lg:col-span-2">
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

          <label className="lg:col-span-2">
            <div className="mb-1 text-xs font-semibold text-gray-600">Catégorie</div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2 lg:col-span-2">
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
                setAppliedCategoryId(categoryId);
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

      {/* ================= KPI CARDS ================= */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="CA Net total"
          value={formatFcfa(totalRevenuNet)}
          icon={BadgeDollarSign}
          accent="bg-blue-500"
        />
        <KpiCard
          label="Marge brute"
          value={formatFcfa(totalProfit)}
          sub={totalProfit >= 0 ? "Bénéficiaire" : "Déficitaire"}
          icon={TrendingUp}
          accent={totalProfit >= 0 ? "bg-emerald-500" : "bg-red-500"}
        />
        <KpiCard
          label="Transactions"
          value={formatNumber(totalTx)}
          icon={ShoppingBag}
          accent="bg-violet-500"
        />
        <KpiCard
          label="Taux marge moyen"
          value={`${avgMargin.toFixed(1)} %`}
          icon={Percent}
          accent="bg-amber-500"
        />
      </div>

      {/* ================= CHART ================= */}
      <div className="mb-6">
        <StoreHistogram data={rows} />
      </div>

      {/* ================= TABLE ================= */}
      <div className="mt-6">
        <DataTable<SalesByStore>
          data={rows}
          columns={columns}
          title="Performance par magasin"
          searchable
          searchPlaceholder="Rechercher un magasin…"
          exportFilename="ventes-par-magasin"
          emptyMessage={loading ? "Chargement..." : "Aucune donnée pour la période"}
          getRowId={(r) => String(r.store_id)}
          customFilters={
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              Imprimer
            </button>
          }
        />
      </div>
    </div>
  );
}
