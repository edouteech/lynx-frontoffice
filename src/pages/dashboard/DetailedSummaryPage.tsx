import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Filter, Wallet, CreditCard, Landmark, Receipt, RotateCcw, Loader2, AlertCircle } from "lucide-react";
import SummaryTable, { type SummaryColumn } from "../../components/SummaryTable";
import { DateRangePicker } from "../../components/DateRangePicker";
import { fetchDetailedSummary, type DetailedSummary } from "../../api/salesSummary";

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
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

function toDateTimeLocalValue(d: Date, time: string = "00:00") {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current != null && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
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

/* ================= MAIN PAGE ================= */

export default function DetailedSummaryPage() {
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
  const [data, setData] = useState<DetailedSummary[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = from !== defaultFrom || to !== defaultTo;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDetailedSummary({
        start_date: from,
        end_date: to,
      });
      if (res.success) {
        setData(res.data);
        setCategories(res.categories);
        setPaymentMethods(res.payment_methods);
      }
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les données du rapport.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearFilters = () => {
    setFrom(defaultFrom);
    setTo(defaultTo);
  };

  /* Calculations for KPIs */
  const grandTotal = useMemo(() => data.find(r => r.rowType === 'grandtotal'), [data]);
  const totalSales = grandTotal?.total_vente ?? 0;
  
  const totalCash = useMemo(() => {
    const cashPm = paymentMethods.find(pm => 
      pm.name.toLowerCase().includes('espece') || 
      pm.name.toLowerCase().includes('cash') || 
      pm.name.toLowerCase().includes('liquide')
    );
    return cashPm ? (grandTotal?.payments[cashPm.id] ?? 0) : 0;
  }, [paymentMethods, grandTotal]);
  
  const totalMomo = useMemo(() => {
    const momoPm = paymentMethods.find(pm => 
      pm.name.toLowerCase().includes('momo') || 
      pm.name.toLowerCase().includes('mobile') || 
      pm.name.toLowerCase().includes('mtn') || 
      pm.name.toLowerCase().includes('moov')
    );
    return momoPm ? (grandTotal?.payments[momoPm.id] ?? 0) : 0;
  }, [paymentMethods, grandTotal]);

  const totalExpenses = grandTotal?.depenses ?? 0;

  const columns: SummaryColumn<DetailedSummary>[] = useMemo(
    () => {
      const cols: SummaryColumn<DetailedSummary>[] = [
        {
          key: "agency",
          label: "Magasin",
          render: (v, item) => (
            <span className={`font-bold tracking-tight ${item.rowType === 'partner' ? 'text-indigo-600' : 'text-slate-800'}`}>
              {String(v)}
            </span>
          ),
        }
      ];

      // Colonnes catégories
      categories.forEach(cat => {
        cols.push({
          key: `categories.${cat.id}`,
          label: cat.name.toUpperCase(),
          align: "right",
          render: (v) => v ? formatNumber(Number(v)) : '0',
        });
      });

      // Colonne Total Vente
      cols.push({
        key: "total_vente",
        label: "TOTAL VENTE TTC",
        align: "right",
        render: (v) => <span className="font-black text-red-600">{formatNumber(Number(v))}</span>,
      });

      // Colonnes Moyens de Paiement
      paymentMethods.forEach(pm => {
        cols.push({
          key: `payments.${pm.id}`,
          label: pm.name.toUpperCase(),
          align: "right",
          render: (v) => {
            const isHighlight = pm.name.toLowerCase().includes('momo') || 
                              pm.name.toLowerCase().includes('espece') ||
                              pm.name.toLowerCase().includes('mobile');
            return (
              <span className={isHighlight ? "font-bold text-emerald-700" : ""}>
                {v ? formatNumber(Number(v)) : '0'}
              </span>
            );
          },
        });
      });

      // Colonnes Dépenses et Commissions
      cols.push(
        {
          key: "depenses",
          label: "DEPENSES",
          align: "right",
          render: (v) => <span className="text-red-500">{v ? formatNumber(Number(v)) : '0'}</span>,
        },
        {
          key: "comm_a_prendre",
          label: "COMMISSION",
          align: "right",
          render: (v) => v ? formatNumber(Number(v)) : '0',
        },
      );

      return cols;
    },
    [categories, paymentMethods],
  );

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">Résumé Détaillé des Ventes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Analyse comparative multidimensionnelle par agence et catégorie
        </p>
      </header>

      {/* ================= FILTER BAR ================= */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
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

          <div className="flex gap-2 shrink-0">
            {hasFilters && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button 
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/20 hover:bg-[#2563EB] active:scale-95 transition-all"
            >
              <Filter className="h-4 w-4" />
              Filtrer
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center space-y-4 rounded-2xl border border-gray-100 bg-white/50 shadow-sm backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-[#3B82F6]" />
          <p className="text-sm font-medium text-gray-500">Génération du rapport en cours...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-red-100 bg-red-50 p-12 text-center">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-bold text-red-900">Une erreur est survenue</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <>
          {/* ================= KPI CARDS ================= */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Total Ventes TTC"
              value={formatFcfa(totalSales)}
              icon={Receipt}
              accent="bg-blue-500"
            />
            <KpiCard
              label="Solde Espèce"
              value={formatFcfa(totalCash)}
              icon={Wallet}
              accent="bg-emerald-500"
            />
            <KpiCard
              label="Total MoMo"
              value={formatFcfa(totalMomo)}
              icon={CreditCard}
              accent="bg-violet-500"
            />
            <KpiCard
              label="Dépenses"
              value={formatFcfa(totalExpenses)}
              icon={Landmark}
              accent="bg-rose-500"
            />
          </div>

          {/* ================= TABLE ================= */}
          <div className="mt-6">
            <SummaryTable<DetailedSummary>
              data={data}
              columns={columns}
              title="Récapitulatif des Ventes"
              searchable
              searchPlaceholder="Rechercher une ligne..."
              onPrint={() => window.print()}
              exportFilename="resume-detaille-ventes"
              getRowType={(r) => r.rowType || 'normal'}
              getNestedValue={(obj, path) => getNestedValue(obj as any, path)}
            />
          </div>
        </>
      )}
    </div>
  );
}
