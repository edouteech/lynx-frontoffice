import { useMemo, useState, useEffect } from "react";
import { Filter, Store, UserRound, Printer, RotateCcw } from "lucide-react";
import DataTable, { type Column } from "../../components/DataTable";
import { DateRangePicker } from "../../components/DateRangePicker";
import { fetchSalesByCategory } from "../../api/salesByCategory";
import { fetchUsers } from "../../api/users";
import { fetchStores } from "../../api/stores";

/* ================= TYPE UI ================= */

type Row = {
  id: number;
  category: string;
  quantity_sold: number;
  total_cost: number;
  revenue_ht: number;
  discount_amount: number;
  revenue_net: number;
  profit: number;
  margin_percent: number;

  employeeId: string;
  storeId: string;
  soldAt: string;
};

/* ================= FORMAT ================= */

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value);
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
          store_id:
            appliedStoreId !== "all" ? Number(appliedStoreId) : undefined,
          employee_id:
            appliedEmployeeId !== "all" ? Number(appliedEmployeeId) : undefined,
        });

        const mapped: Row[] = res.data.map((item) => ({
          id: item.id,
          category: item.category,
          quantity_sold: item.quantity_sold,
          total_cost: item.total_cost,
          revenue_ht: item.revenue_ht,
          discount_amount: item.discount_amount,
          revenue_net: item.revenue_net,
          profit: item.profit,
          margin_percent: item.margin_percent,

          employeeId: "all",
          storeId: "all",
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
    async function loadUsers() {
      try {
        const res = await fetchUsers(1);

        const mapped = res.data.map((u) => ({
          id: String(u.id),
          name: u.name,
        }));

        setEmployees([{ id: "all", name: "Tous les employés" }, ...mapped]);
      } catch (e) {
        console.error("Erreur chargement users", e);
      }
    }

    loadUsers();
  }, []);

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
        console.error("Erreur chargement magasins", e);
      }
    }

    loadStores();
  }, []);
  /* ================= COLUMNS ================= */

  const columns: Column<Row>[] = useMemo(
    () => [
      { key: "category", label: "Catégories", sortable: true },

      {
        key: "quantity_sold",
        label: "Quantité vendue",
        align: "right",
        render: (v) => formatNumber(Number(v ?? 0)),
      },

      {
        key: "total_cost",
        label: "Coût",
        align: "right",
        render: (v) => formatInteger(Number(v ?? 0)),
      },

      {
        key: "revenue_ht",
        label: "Montant HT",
        align: "right",
        render: (v) => formatInteger(Number(v ?? 0)),
      },

      {
        key: "discount_amount",
        label: "Réduction",
        align: "right",
        render: (v) => formatInteger(Number(v ?? 0)),
      },

      {
        key: "revenue_net",
        label: "Montant TTC",
        align: "right",
        render: (v) => formatInteger(Number(v ?? 0)),
      },

      {
        key: "profit",
        label: "Profit",
        align: "right",
        render: (v) => formatInteger(Number(v ?? 0)),
      },

      {
        key: "margin_percent",
        label: "Marge %",
        align: "right",
        render: (v) => `${Number(v ?? 0).toFixed(2)} %`,
      },
    ],
    [],
  );

  /* ================= FILTER ================= */

  const filteredRows = rows;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetchSalesByCategory({
          start_date: appliedFrom,
          end_date: appliedTo,
          store_id:
            appliedStoreId !== "all" ? Number(appliedStoreId) : undefined,
          employee_id:
            appliedEmployeeId !== "all" ? Number(appliedEmployeeId) : undefined,
        });

        const mapped: Row[] = res.data.map((item) => ({
          id: item.id,
          category: item.category,
          quantity_sold: item.quantity_sold,
          total_cost: item.total_cost,
          revenue_ht: item.revenue_ht,
          discount_amount: item.discount_amount,
          revenue_net: item.revenue_net,
          profit: item.profit,
          margin_percent: item.margin_percent,

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

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">
          Ventes par catégorie
        </h1>
      </header>

      {/* FILTERS */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          {/* EMPLOYE */}
          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">
              Employés
            </div>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 text-sm"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          {/* DATE */}
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

          {/* STORE */}
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

          {/* BUTTONS */}
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

      {/* TABLE */}
      <div className="mt-6">
        <DataTable<Row>
          data={filteredRows}
          columns={columns}
          title="Ventes par catégorie"
          searchable
          exportFilename="ventes-par-categorie"
          loading={loading}
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
          getRowId={(r) => r.category}
        />
      </div>
    </div>
  );
}
