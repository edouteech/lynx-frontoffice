import React, { useMemo, useState } from "react";
import { Filter, Wallet, CreditCard, Landmark, Receipt, RotateCcw } from "lucide-react";
import SummaryTable, { type SummaryColumn } from "../../components/SummaryTable";
import { DateRangePicker } from "../../components/DateRangePicker";

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

/* ================= TYPES ================= */

interface DetailedSummary {
  agency: string;
  total_alu: number;
  total_access: number;
  total_vitres: number;
  ventes_magasin: number;
  total_vente: number;
  cheq_banq: number;
  momo: number;
  depenses: number;
  comm_a_prendre: number;
  solde_espece: number;
  rowType?: 'normal' | 'subtotal' | 'partner' | 'grandtotal';
}

/* ================= MOCK DATA ================= */

const MOCK_DATA: DetailedSummary[] = [
  { agency: "BELIER", total_alu: 15644300, total_access: 712850, total_vitres: 0, ventes_magasin: 0, total_vente: 16357150, cheq_banq: 0, momo: 3523250, depenses: 0, comm_a_prendre: 416959, solde_espece: 12401941, rowType: 'normal' },
  { agency: "GODOMEY", total_alu: 14438200, total_access: 0, total_vitres: 867300, ventes_magasin: 0, total_vente: 15305500, cheq_banq: 0, momo: 0, depenses: 0, comm_a_prendre: 768767, solde_espece: 14536733, rowType: 'normal' },
  { agency: "KPONDEHOU", total_alu: 13132700, total_access: 951300, total_vitres: 0, ventes_magasin: 0, total_vente: 14084000, cheq_banq: 0, momo: 1972500, depenses: 0, comm_a_prendre: 632183, solde_espece: 11342717, rowType: 'normal' },
  { agency: "AITCHEDJI", total_alu: 9931250, total_access: 648350, total_vitres: 1891600, ventes_magasin: 0, total_vente: 12471200, cheq_banq: 0, momo: 6928400, depenses: 0, comm_a_prendre: 330663, solde_espece: 5212137, rowType: 'normal' },
  { agency: "COCOCODJI", total_alu: 8555150, total_access: 792000, total_vitres: 852775, ventes_magasin: 0, total_vente: 10199925, cheq_banq: 0, momo: 1557550, depenses: 0, comm_a_prendre: 231170, solde_espece: 8411205, rowType: 'normal' },
  { agency: "AKASSATO", total_alu: 9015500, total_access: 572300, total_vitres: 566600, ventes_magasin: 0, total_vente: 10154400, cheq_banq: 0, momo: 4190150, depenses: 0, comm_a_prendre: 450906, solde_espece: 5513344, rowType: 'normal' },
  { agency: "PORTO2", total_alu: 8717650, total_access: 772298, total_vitres: 444305, ventes_magasin: 0, total_vente: 9934253, cheq_banq: 0, momo: 996850, depenses: 0, comm_a_prendre: 336184, solde_espece: 8601219, rowType: 'normal' },
  { agency: "PORTO1", total_alu: 7985800, total_access: 497100, total_vitres: 1409500, ventes_magasin: 0, total_vente: 9892400, cheq_banq: 0, momo: 1096150, depenses: 0, comm_a_prendre: 291900, solde_espece: 8504350, rowType: 'normal' },
  { agency: "PARAKOU", total_alu: 8043964, total_access: 0, total_vitres: 1379637, ventes_magasin: 0, total_vente: 9423601, cheq_banq: 0, momo: 9423601, depenses: 0, comm_a_prendre: 0, solde_espece: 0, rowType: 'normal' },
  { agency: "DEKOUNGBE", total_alu: 8294100, total_access: 471500, total_vitres: 262400, ventes_magasin: 0, total_vente: 9028000, cheq_banq: 0, momo: 0, depenses: 0, comm_a_prendre: 382821, solde_espece: 8645179, rowType: 'normal' },
  { agency: "MISSERETE", total_alu: 6320250, total_access: 685300, total_vitres: 1379600, ventes_magasin: 0, total_vente: 8385150, cheq_banq: 0, momo: 1539450, depenses: 0, comm_a_prendre: 281400, solde_espece: 6564300, rowType: 'normal' },
  { agency: "BOHICON", total_alu: 6315200, total_access: 545700, total_vitres: 1333150, ventes_magasin: 0, total_vente: 8194050, cheq_banq: 7887817, momo: 0, depenses: 0, comm_a_prendre: 306233, solde_espece: 0, rowType: 'normal' },
  { agency: "JERICHO", total_alu: 7307250, total_access: 681600, total_vitres: 0, ventes_magasin: 0, total_vente: 7988850, cheq_banq: 273500, momo: 1124000, depenses: 0, comm_a_prendre: 249927, solde_espece: 6133423, rowType: 'normal' },
  { agency: "ALLADA", total_alu: 2289250, total_access: 524950, total_vitres: 877000, ventes_magasin: 0, total_vente: 3691200, cheq_banq: 3235953, momo: 343500, depenses: 0, comm_a_prendre: 111747, solde_espece: 0, rowType: 'normal' },
  { agency: "DJREGBE", total_alu: 2141350, total_access: 248400, total_vitres: 260400, ventes_magasin: 0, total_vente: 2650150, cheq_banq: 0, momo: 495100, depenses: 0, comm_a_prendre: 285356, solde_espece: 1869694, rowType: 'normal' },
  { agency: "REV YEMODE", total_alu: 850000, total_access: 0, total_vitres: 0, ventes_magasin: 0, total_vente: 850000, cheq_banq: 850000, momo: 0, depenses: 0, comm_a_prendre: 0, solde_espece: 0, rowType: 'normal' },
  { agency: "REV GANIOU", total_alu: 0, total_access: 0, total_vitres: 0, ventes_magasin: 0, total_vente: 0, cheq_banq: 0, momo: 0, depenses: 0, comm_a_prendre: 0, solde_espece: 0, rowType: 'normal' },
  { agency: "MASTER", total_alu: 0, total_access: 456500, total_vitres: 0, ventes_magasin: 0, total_vente: 456500, cheq_banq: 0, momo: 0, depenses: 0, comm_a_prendre: 0, solde_espece: 426500, rowType: 'normal' },
  { agency: "SAMUEL VERRES", total_alu: 0, total_access: 0, total_vitres: 0, ventes_magasin: 0, total_vente: 0, cheq_banq: 0, momo: 0, depenses: 0, comm_a_prendre: 0, solde_espece: 0, rowType: 'normal' },
  { agency: "ABDOUL VERRES", total_alu: 0, total_access: 0, total_vitres: 430550, ventes_magasin: 0, total_vente: 430550, cheq_banq: 0, momo: 0, depenses: 0, comm_a_prendre: 0, solde_espece: 430550, rowType: 'normal' },
  { agency: "NESTOR VERRES", total_alu: 0, total_access: 0, total_vitres: 810100, ventes_magasin: 0, total_vente: 810100, cheq_banq: 0, momo: 0, depenses: 0, comm_a_prendre: 0, solde_espece: 810100, rowType: 'normal' },
  { agency: "ETS CTEMAV", total_alu: 2000000, total_access: 0, total_vitres: 0, ventes_magasin: 0, total_vente: 2000000, cheq_banq: 0, momo: 0, depenses: 0, comm_a_prendre: 0, solde_espece: 2000000, rowType: 'normal' },
  { agency: "TOTAL", total_alu: 128981914, total_access: 8560148, total_vitres: 12764917, ventes_magasin: 0, total_vente: 152306979, cheq_banq: 12247270, momo: 33190501, depenses: 17761951, comm_a_prendre: 5076216, solde_espece: 103403392, rowType: 'grandtotal' },
];

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

  const defaultCommission = "7";

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [commission, setCommission] = useState(defaultCommission);

  const hasFilters = from !== defaultFrom || to !== defaultTo || commission !== defaultCommission;

  const handleClearFilters = () => {
    setFrom(defaultFrom);
    setTo(defaultTo);
    setCommission(defaultCommission);
  };

  /* Calculations for KPIs */
  const totalSales = useMemo(() => MOCK_DATA.find(r => r.rowType === 'grandtotal')?.total_vente ?? 0, []);
  const totalCash = useMemo(() => MOCK_DATA.find(r => r.rowType === 'grandtotal')?.solde_espece ?? 0, []);
  const totalMomo = useMemo(() => MOCK_DATA.find(r => r.rowType === 'grandtotal')?.momo ?? 0, []);
  const totalExpenses = useMemo(() => MOCK_DATA.find(r => r.rowType === 'grandtotal')?.depenses ?? 0, []);

  const columns: SummaryColumn<DetailedSummary>[] = useMemo(
    () => [
      {
        key: "agency",
        label: "AGENCES",
        render: (v, item) => (
          <span className={`font-bold tracking-tight ${item.rowType === 'partner' ? 'text-indigo-600' : 'text-slate-800'}`}>
            {String(v)}
          </span>
        ),
      },
      {
        key: "total_alu",
        label: "TOTAL ALU",
        align: "right",
        render: (v) => v ? formatNumber(Number(v)) : '',
      },
      {
        key: "total_access",
        label: "TOTAL ACCESS",
        align: "right",
        render: (v) => v ? formatNumber(Number(v)) : '',
      },
      {
        key: "total_vitres",
        label: "TOTAL VITRES",
        align: "right",
        render: (v) => v ? formatNumber(Number(v)) : '',
      },
      {
        key: "total_vente",
        label: "TOTAL VENTE",
        align: "right",
        render: (v) => <span className="font-black text-red-600">{formatNumber(Number(v))}</span>,
      },
      {
        key: "cheq_banq",
        label: "CHEQ/BANQ",
        align: "right",
        render: (v) => v ? formatNumber(Number(v)) : '',
      },
      {
        key: "momo",
        label: "MOMO",
        align: "right",
        render: (v) => <span className="font-bold text-emerald-700">{v ? formatNumber(Number(v)) : ''}</span>,
      },
      {
        key: "solde_espece",
        label: "ESPECE",
        align: "right",
        render: (v) => <span className="font-black text-blue-800">{formatNumber(Number(v))}</span>,
      },
      {
        key: "depenses",
        label: "DEPENSES",
        align: "right",
        render: (v) => <span className="text-red-500">{v ? formatNumber(Number(v)) : ''}</span>,
      },
      {
        key: "comm_a_prendre",
        label: "COMM A PRENDRE",
        align: "right",
        render: (v) => v ? formatNumber(Number(v)) : '',
      },
    ],
    [],
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

          <div className="w-full lg:w-35">
            <div className="mb-1 text-xs font-semibold text-gray-600">Taux de Commission</div>
            <select
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm outline-none transition-colors hover:bg-gray-50 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
            >
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}%
                </option>
              ))}
            </select>
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
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/20 hover:bg-[#2563EB] active:scale-95 transition-all">
              <Filter className="h-4 w-4" />
              Filtrer
            </button>
          </div>
        </div>
      </div>

      {/* ================= KPI CARDS ================= */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Ventes"
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
          data={MOCK_DATA}
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
    </div>
  );
}
