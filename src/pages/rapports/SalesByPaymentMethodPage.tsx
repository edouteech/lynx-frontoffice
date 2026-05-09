import { useEffect, useMemo, useState } from "react";
import { Filter, Store, CreditCard, Printer, RotateCcw } from "lucide-react";
import DataTable, { type Column } from "../../components/DataTable";
import { DateRangePicker } from "../../components/DateRangePicker";
import { fetchSalesByPaymentMethod } from "../../api/salesByPaymentMethod";
import { fetchStores } from "../../api/stores";
import { fetchPaymentMethods } from "../../api/paymentMethods";

type Row = {
  method: string;
  store: string;
  quantity: number;
  revenueHT: number;
  revenueNet: number;
  discount: number;
  profit: number;
};

function formatFcfa(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("XOF", "FCFA");
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function toDateTimeLocalValue(d: Date, time: string = "00:00") {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`;
}

function KpiCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent: "green" | "cyan" | "blue";
}) {
  const accentClasses =
    accent === "green"
      ? "border-l-emerald-500"
      : accent === "cyan"
        ? "border-l-cyan-500"
        : "border-l-[#3B82F6]";

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm ${accentClasses} border-l-4`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export default function SalesByPaymentMethodPage() {
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

  const [paymentMethodId, setPaymentMethodId] = useState<string>("all");
  const [storeId, setStoreId] = useState<string>("all");

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const hasFilters =
    paymentMethodId !== "all" ||
    storeId !== "all" ||
    from !== defaultFrom ||
    to !== defaultTo;

  const handleClearFilters = () => {
    setPaymentMethodId("all");
    setStoreId("all");
    setFrom(defaultFrom);
    setTo(defaultTo);
    setAppliedPaymentMethodId("all");
    setAppliedStoreId("all");
    setAppliedFrom(defaultFrom);
    setAppliedTo(defaultTo);
  };

  const [appliedPaymentMethodId, setAppliedPaymentMethodId] =
    useState<string>("all");
  const [appliedStoreId, setAppliedStoreId] = useState<string>("all");
  const [appliedFrom, setAppliedFrom] = useState(from);
  const [appliedTo, setAppliedTo] = useState(to);

  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const [stores, setStores] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "Tous les magasins" },
  ]);

  const [paymentMethods, setPaymentMethods] = useState<
    { id: string; name: string }[]
  >([{ id: "all", name: "Tous les moyens" }]);

  /* ================= LOAD PAYMENT METHODS ================= */
  useEffect(() => {
    async function loadPaymentMethods() {
      try {
        const res = await fetchPaymentMethods();

        const mapped = res.data.map((p) => ({
          id: String(p.id),
          name: p.name,
        }));

        setPaymentMethods([{ id: "all", name: "Tous les moyens" }, ...mapped]);
      } catch (e) {
        console.error(e);
      }
    }

    loadPaymentMethods();
  }, []);

  /* ================= LOAD STORES ================= */
  useEffect(() => {
    async function loadStores() {
      try {
        const res = await fetchStores(1);

        const mapped = res.data.map((s) => ({
          id: String(s.id),
          name: s.name,
        }));

        setStores([{ id: "all", name: "Tous les magasins" }, ...mapped]);
      } catch (e) {
        console.error(e);
      }
    }

    loadStores();
  }, []);

  /* ================= LOAD REPORT ================= */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetchSalesByPaymentMethod({
          start_date: appliedFrom,
          end_date: appliedTo,
          store_id:
            appliedStoreId !== "all" ? Number(appliedStoreId) : undefined,
          payment_method_id:
            appliedPaymentMethodId !== "all"
              ? Number(appliedPaymentMethodId)
              : undefined,
        });

        const mapped: Row[] = res.data.map((item) => ({
          method: item.payment_method,
          store: item.store_name,
          quantity: Number(item.quantity_sold),
          revenueHT: Number(item.revenue_ht),
          revenueNet: Number(item.revenue_net),
          discount: Number(item.discount_amount),
          profit: Number(item.profit),
        }));

        setRows(mapped);
        setSummary(res.summary);
      } catch (e) {
        console.error(e);
      }
    }

    load();
  }, [appliedFrom, appliedTo, appliedStoreId, appliedPaymentMethodId]);

  /* ================= KPI ================= */
  const totals = useMemo(() => {
    if (!summary) return { ht: 0, net: 0, profit: 0 };

    return {
      ht: Number(summary.total_revenue_ht),
      net: Number(summary.total_revenue_net),
      profit: Number(summary.total_profit),
    };
  }, [summary]);

  /* ================= TABLE ================= */
  const columns: Column<Row>[] = useMemo(
    () => [
      { key: "method", label: "Moyen de paiement", sortable: true },
      { key: "store", label: "Magasin", sortable: true },
      {
        key: "quantity",
        label: "Quantité",
        sortable: true,
        align: "right",
        render: (v) => formatInteger(Number(v ?? 0)),
      },
      {
        key: "revenueHT",
        label: "Montant HT",
        sortable: true,
        align: "right",
        render: (v) => formatInteger(Number(v ?? 0)),
      },
      {
        key: "revenueNet",
        label: "Montant TTC",
        sortable: true,
        align: "right",
        render: (v) => formatInteger(Number(v ?? 0)),
      },
      {
        key: "profit",
        label: "Profit",
        sortable: true,
        align: "right",
        render: (v) => formatInteger(Number(v ?? 0)),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">
          Rapport des ventes par moyen de paiement
        </h1>
      </header>

      {/* FILTERS */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">
              Moyens de paiements
            </div>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10"
              >
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
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
              Les magasins
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
              onClick={() => {
                setAppliedPaymentMethodId(paymentMethodId);
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

      {/* KPI */}
      <div className="mt-6 grid grid-cols-3 gap-6">
        <KpiCard title="CA HT" value={formatFcfa(totals.ht)} accent="green" />
        <KpiCard title="CA Net" value={formatFcfa(totals.net)} accent="cyan" />
        <KpiCard
          title="Profit"
          value={formatFcfa(totals.profit)}
          accent="blue"
        />
      </div>

      {/* TABLE */}
      <div className="mt-6">
        <DataTable<Row>
          data={rows}
          columns={columns}
          title="Détails par moyen de paiement"
          searchable
          exportFilename="ventes"
          customFilters={
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              aria-label="Imprimer"
              title="Imprimer"
            >
              {" "}
              <Printer className="h-4 w-4 text-gray-500" /> Imprimer{" "}
            </button>
          }
          getRowId={(r) => `${r.method}-${r.store}`}
        />
      </div>
    </div>
  );
}
