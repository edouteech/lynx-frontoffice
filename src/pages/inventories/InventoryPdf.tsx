import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Inventory, InventoryItem } from '../../types/api'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    color: '#111827',
  },

  // header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1D4ED8', marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#6B7280' },
  badgeApplied: {
    backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3, fontSize: 8, fontFamily: 'Helvetica-Bold',
  },
  badgeDraft: {
    backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3, fontSize: 8, fontFamily: 'Helvetica-Bold',
  },

  // meta row
  metaRow: {
    flexDirection: 'row', gap: 24, marginBottom: 20,
    backgroundColor: '#F9FAFB', borderRadius: 6, padding: 10,
  },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 7, color: '#9CA3AF', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 2 },
  metaValue: { fontSize: 9, color: '#111827' },

  // divider
  divider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 12 },

  // table
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#1D4ED8',
    borderRadius: 4, paddingVertical: 6, paddingHorizontal: 4, marginBottom: 1,
  },
  thText: { color: '#ffffff', fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  row: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowAlt: { backgroundColor: '#F9FAFB' },

  // column widths
  colArticle:  { flex: 3 },
  colCat:      { flex: 1.5 },
  colNum:      { flex: 1, textAlign: 'right' },

  // cell styles
  productName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
  productSub:  { fontSize: 7, color: '#9CA3AF', marginTop: 1 },
  cellText:    { fontSize: 9, color: '#374151' },
  diffPos:     { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#059669' },
  diffNeg:     { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#DC2626' },
  diffZero:    { fontSize: 9, color: '#6B7280' },
  dimText:     { fontSize: 9, color: '#D1D5DB' },

  // totals
  totalsRow: {
    flexDirection: 'row', borderTopWidth: 2, borderTopColor: '#1D4ED8',
    paddingTop: 6, paddingHorizontal: 4, marginTop: 4,
  },
  totalLabel: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6B7280', textTransform: 'uppercase' },
  totalValue: { flex: 1, textAlign: 'right', fontSize: 9, fontFamily: 'Helvetica-Bold' },

  // note
  noteBox: {
    marginTop: 16, padding: 10, backgroundColor: '#F9FAFB',
    borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#3B82F6',
  },
  noteLabel: { fontSize: 7, color: '#6B7280', fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  noteText: { fontSize: 9, color: '#374151' },

  // signatures
  sigSection: { marginTop: 40 },
  sigTitle: { fontSize: 9, color: '#6B7280', marginBottom: 16 },
  sigRow: { flexDirection: 'row', gap: 32 },
  sigBox: { flex: 1 },
  sigLabel: { fontSize: 7, color: '#9CA3AF', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 4 },
  sigLine: { height: 1, backgroundColor: '#111827', marginTop: 40 },

  // footer
  footer: {
    position: 'absolute', bottom: 24, left: 36, right: 36,
    flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 6,
  },
  footerText: { fontSize: 7, color: '#9CA3AF' },
})

function fmt(n: number, decimals = 3) {
  return n.toLocaleString('fr-FR', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
    useGrouping: false,
  })
}
function DiffText({ diff }: { diff: number | null }) {
  if (diff === null) return <Text style={s.dimText}>—</Text>
  if (diff === 0)    return <Text style={s.diffZero}>0</Text>
  const label = (diff > 0 ? '+' : '') + fmt(diff)
  return <Text style={diff > 0 ? s.diffPos : s.diffNeg}>{label}</Text>
}

interface Props {
  inventory: Inventory
}

export default function InventoryPdf({ inventory }: Props) {
  const items = inventory.items ?? []

  const dateStr = new Date(inventory.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const appliedStr = inventory.applied_at
    ? new Date(inventory.applied_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  // total cost diff
  const totalCostDiff = items.reduce((sum, item) => {
    if (item.difference == null || item.purchase_price == null) return sum
    return sum + item.difference * item.purchase_price
  }, 0)

  const filledCount = items.filter(i => i.actual_quantity != null).length

  return (
    <Document title={`Inventaire — ${inventory.store?.name ?? ''}`} author="Lynx">
      <Page size="A4" style={s.page}>

        {/* ── header ── */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>Inventaire — {inventory.store?.name ?? ''}</Text>
            <Text style={s.subtitle}>
              {inventory.type === 'full' ? 'Inventaire complet' : 'Inventaire partiel'} · Créé le {dateStr}
            </Text>
          </View>
        </View>

        {/* ── meta ── */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Articles</Text>
            <Text style={s.metaValue}>{inventory.items_count}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Comptés</Text>
            <Text style={s.metaValue}>{filledCount} / {inventory.items_count}</Text>
          </View>
          {appliedStr && (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Appliqué le</Text>
              <Text style={s.metaValue}>{appliedStr}</Text>
            </View>
          )}
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Magasin</Text>
            <Text style={s.metaValue}>{inventory.store?.name ?? '—'}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── table header ── */}
        <View style={s.tableHeader}>
          <View style={s.colArticle}><Text style={s.thText}>Article</Text></View>
          <View style={s.colCat}><Text style={s.thText}>Catégorie</Text></View>
          <View style={s.colNum}><Text style={s.thText}>Qté att.</Text></View>
          <View style={s.colNum}><Text style={s.thText}>Qté réelle</Text></View>
          <View style={s.colNum}><Text style={s.thText}>Diff.</Text></View>
          <View style={s.colNum}><Text style={s.thText}>Coût unit.</Text></View>
          <View style={s.colNum}><Text style={s.thText}>Diff. prix</Text></View>
        </View>

        {/* ── rows ── */}
        {items.map((item: InventoryItem, idx: number) => {
          const costDiff = item.difference != null && item.purchase_price != null
            ? item.difference * item.purchase_price
            : null
          return (
            <View key={item.id} style={[s.row, idx % 2 === 1 ? s.rowAlt : {}]} wrap={false}>
              <View style={s.colArticle}>
                <Text style={s.productName}>{item.product_name}</Text>
                {item.product_category ? <Text style={s.productSub}>{item.product_category}</Text> : null}
              </View>
              <View style={s.colCat}>
                <Text style={s.cellText}>{item.product_category ?? '—'}</Text>
              </View>
              <View style={s.colNum}>
                <Text style={s.cellText}>{fmt(item.expected_quantity)}</Text>
              </View>
              <View style={s.colNum}>
                {item.actual_quantity != null
                  ? <Text style={s.cellText}>{fmt(item.actual_quantity)}</Text>
                  : <Text style={s.dimText}>—</Text>}
              </View>
              <View style={s.colNum}>
                <DiffText diff={item.difference} />
              </View>
              <View style={s.colNum}>
                {item.purchase_price != null
                  ? <Text style={s.cellText}>{fmt(item.purchase_price, 0)}</Text>
                  : <Text style={s.dimText}>—</Text>}
              </View>
              <View style={s.colNum}>
                {costDiff == null
                  ? <Text style={s.dimText}>—</Text>
                  : costDiff === 0
                    ? <Text style={s.diffZero}>0</Text>
                    : <Text style={costDiff > 0 ? s.diffPos : s.diffNeg}>
                        {costDiff > 0 ? '+' : ''}{fmt(costDiff, 0)}
                      </Text>}
              </View>
            </View>
          )
        })}

        {/* ── totals ── */}
        <View style={s.totalsRow}>
          <Text style={[s.totalLabel, { flex: 5 }]}>Total diff. prix</Text>
          <View style={s.colNum}>
            <Text style={[s.totalValue, { color: totalCostDiff >= 0 ? '#059669' : '#DC2626' }]}>
              {totalCostDiff >= 0 ? '+' : ''}{fmt(totalCostDiff, 0)}
            </Text>
          </View>
        </View>

        {/* ── note ── */}
        {inventory.note ? (
          <View style={s.noteBox}>
            <Text style={s.noteLabel}>Note</Text>
            <Text style={s.noteText}>{inventory.note}</Text>
          </View>
        ) : null}

        {/* ── signatures ── */}
        <View style={s.sigSection}>
          <Text style={s.sigTitle}>Signatures</Text>
          <View style={s.sigRow}>
            {['', '', ''].map(label => (
              <View key={label} style={s.sigBox}>
                <Text style={s.sigLabel}>{label}</Text>
                <View style={s.sigLine} />
              </View>
            ))}
          </View>
        </View>

        {/* ── footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Lynx — Inventaire {inventory.id}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
