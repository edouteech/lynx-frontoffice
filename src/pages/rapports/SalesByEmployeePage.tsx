import { useMemo, useState, useEffect } from "react";
import { Filter, Store, Printer, RotateCcw } from "lucide-react";
import DataTable, { type Column } from "../../components/DataTable";
import { DateRangePicker } from "../../components/DateRangePicker";
import { fetchSalesByEmployee } from "../../api/salesByEmployee";
import { fetchStores } from "../../api/stores";

type Row = {
  seller: string;
  qty: number;
  cost: number;
  amountHT: number;
  amountTTC: number;
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function toDateTimeLocalValue(d: Date, time: string = "00:00") {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`;
}

/* 🔁 mapping API → Row */
function mapApiToRow(item: any): Row {
  return {
    seller: item.employee,
    qty: item.quantity_sold,
    cost: item.total_cost,
    amountHT: item.revenue_ht,
    amountTTC: item.revenue_net,
  };
}

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

  /* ================= LOAD API ================= */
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetchSalesByEmployee({
          start_date: appliedFrom,
          end_date: appliedTo,
          store_id:
            appliedStoreId !== "all" ? Number(appliedStoreId) : undefined,
        });

        setRows(res.data.map(mapApiToRow));
      } catch (e) {
        console.error(e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [appliedFrom, appliedTo, appliedStoreId]);

  /* ================= TABLE ================= */
  const columns: Column<Row>[] = useMemo(
    () => [
      { key: "seller", label: "Nom du vendeur", sortable: true },
      {
        key: "qty",
        label: "Quantité vendue",
        sortable: true,
        align: "right",
        render: (v) => formatNumber(Number(v ?? 0)),
      },
      {
        key: "cost",
        label: "coût",
        sortable: true,
        align: "right",
        render: (v) => formatInteger(Number(v ?? 0)),
      },
      {
        key: "amountHT",
        label: "Montant HT",
        sortable: true,
        align: "right",
        render: (v) => formatInteger(Number(v ?? 0)),
      },
      {
        key: "amountTTC",
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
        render: (v) => formatFcfa(Number(v ?? 0)),
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
      </header>

      {/* ================= FILTER ================= */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
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

          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">
              Les magasins
            </div>
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

      {/* ================= TABLE ================= */}
      <div className="mt-6">
        <DataTable<Row>
          data={rows}
          columns={columns}
          title="Les chiffres d’affaires par employés"
          searchable
          searchPlaceholder="Recherche…"
          exportFilename="ventes-par-employe"
          emptyMessage={loading ? "Chargement..." : "Aucune donnée"}
          customFilters={
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              Imprimer
            </button>
          }
          getRowId={(r) => r.seller}
        />
      </div>
    </div>
  );
}
