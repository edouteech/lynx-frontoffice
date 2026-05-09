import { useMemo, useState, useEffect } from "react";
import { UserRound, Printer, Store, Filter, RotateCcw } from "lucide-react";
import DataTable, { type Column } from "../../components/DataTable";
import { DateRangePicker } from "../../components/DateRangePicker";
import { fetchSalesByItem } from "../../api/salesByItem";
import { fetchUsers } from "../../api/users";
import { fetchStores } from "../../api/stores";

type Row = {
  article: string;
  qty: number;
  cost: number;
  reductions: number;
  amountHT: number;
  amountTTC: number;
  profit: number;
  margin_percent: number;
  employeeId: string;
  storeId: string;
  soldAt: string;
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

function toDateTimeLocalValue(d: Date, time: string = "00:00") {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`;
}

function mapApiToRow(item: any): Row {
  return {
    article: item.product,
    qty: item.quantity_sold,
    cost: item.total_cost,
    reductions: item.discount_amount,
    amountHT: item.revenue_ht,
    amountTTC: item.revenue_net,
    profit: item.profit,
    margin_percent: item.margin_percent,
    employeeId: "all",
    storeId: "all",
    soldAt: new Date().toISOString(),
  };
}

function SimpleTable({
  title,
  data,
  loading,
}: {
  title: string;
  data: Row[];
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-400 bg-gray-50 px-5 py-4">
        <h2 className="text-sm font-semibold text-[#2563EB]">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-5 py-3 font-medium">Produit</th>
              <th className="px-5 py-3 font-medium text-right">Quantités</th>
              <th className="px-5 py-3 font-medium text-right">
                Chiffre d'affaires
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-gray-400">
                  Chargement...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-gray-400">
                  Aucune donnée
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={index}
                  className="border-t border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-md bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                      {item.article}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right text-gray-700">
                    {new Intl.NumberFormat("fr-FR", {
                      maximumFractionDigits: 2,
                    }).format(item.qty)}
                  </td>

                  <td className="px-5 py-4 text-right font-medium text-gray-900">
                    {formatFcfa(item.amountTTC)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SalesByItemsPage() {
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

  const [employeeId, setEmployeeId] = useState<string>("all");
  const [storeId, setStoreId] = useState<string>("all");
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

  const [appliedEmployeeId, setAppliedEmployeeId] = useState<string>("all");
  const [appliedStoreId, setAppliedStoreId] = useState<string>("all");
  const [appliedFrom, setAppliedFrom] = useState(from);
  const [appliedTo, setAppliedTo] = useState(to);

  const [rows, setRows] = useState<Row[]>([]);
  const [topArticles, setTopArticles] = useState<Row[]>([]);
  const [flopArticles, setFlopArticles] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "Tous les employés" },
  ]);

  const [stores, setStores] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "Tous les magasins" },
  ]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetchSalesByItem({
          start_date: appliedFrom,
          end_date: appliedTo,
          store_id:
            appliedStoreId !== "all" ? Number(appliedStoreId) : undefined,
          employee_id:
            appliedEmployeeId !== "all" ? Number(appliedEmployeeId) : undefined,
        });

        setRows(res.data.map(mapApiToRow));
        setTopArticles(res.top_selling.map(mapApiToRow));
        setFlopArticles(res.least_selling.map(mapApiToRow));
      } catch (e) {
        console.error(e);
        setRows([]);
        setTopArticles([]);
        setFlopArticles([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
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

  const filteredRows = useMemo(() => rows, [rows]);

  const columns: Column<Row>[] = useMemo(
    () => [
      { key: "article", label: "Articles", sortable: true },
      {
        key: "qty",
        label: "Quantité vendue",
        sortable: true,
        align: "right",
        render: (v) =>
          new Intl.NumberFormat("fr-FR", {
            maximumFractionDigits: 2,
          }).format(Number(v ?? 0)),
      },
      {
        key: "cost",
        label: "coût",
        sortable: true,
        align: "right",
        render: (v) => formatFcfa(Number(v ?? 0)),
      },
      {
        key: "reductions",
        label: "Reductions",
        sortable: true,
        align: "right",
        render: (v) => formatFcfa(Number(v ?? 0)),
      },
      {
        key: "amountHT",
        label: "Montants HT",
        sortable: true,
        align: "right",
        render: (v) => formatFcfa(Number(v ?? 0)),
      },
      {
        key: "amountTTC",
        label: "Montants TTC",
        sortable: true,
        align: "right",
        render: (v) => formatFcfa(Number(v ?? 0)),
      },
      {
        key: "profit",
        label: "Profit",
        sortable: true,
        align: "right",
        render: (v) => formatFcfa(Number(v ?? 0)),
      },
      {
        key: "margin_percent",
        label: "Marge %",
        sortable: true,
        align: "right",
        render: (v) =>
          new Intl.NumberFormat("fr-FR", {
            maximumFractionDigits: 2,
          }).format(Number(v ?? 0)) + " %",
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">
          Ventes par articles
        </h1>
      </header>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">
              Les employés
            </div>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SimpleTable
          title="Top 5 articles"
          data={topArticles}
          loading={loading}
        />
        <SimpleTable
          title="Flop 5 articles"
          data={flopArticles}
          loading={loading}
        />
      </div>

      <div className="mt-6">
        <DataTable<Row>
          data={filteredRows}
          columns={columns}
          title="Les chiffres d’affaires par articles"
          searchable
          searchPlaceholder="Recherche…"
          exportFilename="ventes-par-articles"
          emptyMessage="aucune donnée disponible"
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
          getRowId={(r) => r.article}
        />
      </div>
    </div>
  );
}
