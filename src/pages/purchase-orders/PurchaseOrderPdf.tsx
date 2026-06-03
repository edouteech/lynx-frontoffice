import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import type { PurchaseOrder } from '../../types/api'

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
  badgeBox: { alignItems: 'flex-end', gap: 4 },
  badge: {
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
    fontSize: 8, fontFamily: 'Helvetica-Bold',
  },
  badgeSubmitted:   { backgroundColor: '#EDE9FE', color: '#6D28D9' },
  badgeConfirmed:   { backgroundColor: '#E0E7FF', color: '#3730A3' },
  badgeValidated:   { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  badgePartial:     { backgroundColor: '#FEF3C7', color: '#92400E' },
  badgeCompleted:   { backgroundColor: '#D1FAE5', color: '#065F46' },
  badgeCentral:     { backgroundColor: '#E0E7FF', color: '#3730A3', marginTop: 3 },

  // meta row
  metaRow: {
    flexDirection: 'row', gap: 16, marginBottom: 20,
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
  colArticle: { flex: 3 },
  colNum:     { flex: 1, textAlign: 'right' },

  // cell styles
  productName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
  productSub:  { fontSize: 7, color: '#9CA3AF', marginTop: 1 },
  cellText:    { fontSize: 9, color: '#374151' },
  dimText:     { fontSize: 9, color: '#D1D5DB' },
  greenText:   { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#059669' },
  amberText:   { fontSize: 9, color: '#D97706' },

  // financial summary
  financialBox: {
    marginTop: 16, alignItems: 'flex-end',
  },
  finRow: { flexDirection: 'row', gap: 48, marginBottom: 3 },
  finLabel: { fontSize: 8, color: '#6B7280', width: 120, textAlign: 'right' },
  finValue: { fontSize: 8, color: '#374151', width: 80, textAlign: 'right' },
  finTotal: { borderTopWidth: 1, borderTopColor: '#1D4ED8', paddingTop: 4, marginTop: 2 },
  finTotalLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827', width: 120, textAlign: 'right' },
  finTotalValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827', width: 80, textAlign: 'right' },

  // note
  noteBox: {
    marginTop: 16, padding: 10, backgroundColor: '#F9FAFB',
    borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#3B82F6',
  },
  noteLabel: { fontSize: 7, color: '#6B7280', fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  noteText:  { fontSize: 9, color: '#374151' },

  // signatures
  sigSection: { marginTop: 40 },
  sigTitle:   { fontSize: 9, color: '#6B7280', marginBottom: 16 },
  sigRow:     { flexDirection: 'row', gap: 32 },
  sigBox:     { flex: 1 },
  sigLabel:   { fontSize: 7, color: '#9CA3AF', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 4 },
  sigLine:    { height: 1, backgroundColor: '#111827', marginTop: 40 },

  // footer
  footer: {
    position: 'absolute', bottom: 24, left: 36, right: 36,
    borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 6,
    alignItems: 'center',
  },
  footerText: { fontSize: 7, color: '#9CA3AF', textAlign: 'center' },
})

const STATUS_LABELS: Record<string, string> = {
  submitted:          'Soumise',
  confirmed:          'Confirmée (centrale)',
  validated:          'Validée',
  partially_received: 'Partiellement reçue',
  completed:          'Terminée',
}

const STATUS_BADGE_STYLE: Record<string, Style> = {
  submitted:          s.badgeSubmitted,
  confirmed:          s.badgeConfirmed,
  validated:          s.badgeValidated,
  partially_received: s.badgePartial,
  completed:          s.badgeCompleted,
}

function fmt(n: number, decimals = 2): string {
  const sign = n < 0 ? '-' : ''
  const [intPart, decPart] = Math.abs(n).toFixed(decimals).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const trimmed = decPart ? decPart.replace(/0+$/, '') : ''
  return sign + grouped + (trimmed ? ',' + trimmed : '')
}

interface Props {
  order: PurchaseOrder
}

export default function PurchaseOrderPdf({ order }: Props) {
  const items = order.items ?? []
  const isCentral = order.purchasing_center_id !== null && order.purchasing_center_id !== undefined

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0)
  const discountAmount = subtotal * ((order.discount_percentage ?? 0) / 100)
  const total = subtotal - discountAmount + (order.extra_fees ?? 0)

  const orderDateStr = order.order_date
    ? new Date(order.order_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'
  const expectedDateStr = order.expected_date
    ? new Date(order.expected_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  const statusLabel = STATUS_LABELS[order.status] ?? order.status
  const statusBadgeStyle = STATUS_BADGE_STYLE[order.status] ?? s.badgeValidated

  const sourceLabel = isCentral ? order.purchasing_center?.name : order.supplier?.name

  return (
    <Document
      title={`Commande #${String(order.id).padStart(4, '0')}`}
      author="Lynx"
    >
      <Page size="A4" style={s.page}>

        {/* ── header ── */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>
              {isCentral ? 'Commande centrale' : 'Bon de commande'} #{String(order.id).padStart(4, '0')}
            </Text>
            <Text style={s.subtitle}>
              {isCentral ? `Centrale : ${sourceLabel ?? '—'}` : `Fournisseur : ${sourceLabel ?? '—'}`}
              {' · '}
              Magasin : {order.store?.name ?? '—'}
            </Text>
          </View>
          <View style={s.badgeBox}>
            <Text style={[s.badge, statusBadgeStyle]}>{statusLabel}</Text>
            {isCentral && (
              <Text style={[s.badge, s.badgeCentral]}>Centrale d'achat</Text>
            )}
          </View>
        </View>

        {/* ── meta ── */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>{isCentral ? 'Centrale d\'achat' : 'Fournisseur'}</Text>
            <Text style={s.metaValue}>{sourceLabel ?? '—'}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Magasin dest.</Text>
            <Text style={s.metaValue}>{order.store?.name ?? '—'}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Date commande</Text>
            <Text style={s.metaValue}>{orderDateStr}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Date prévue</Text>
            <Text style={s.metaValue}>{expectedDateStr}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Articles</Text>
            <Text style={s.metaValue}>{items.length}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── table header ── */}
        <View style={s.tableHeader}>
          <View style={s.colArticle}><Text style={s.thText}>Article</Text></View>
          <View style={s.colNum}><Text style={s.thText}>Commandé</Text></View>
          <View style={s.colNum}><Text style={s.thText}>Livré</Text></View>
          <View style={s.colNum}><Text style={s.thText}>Restant</Text></View>
          <View style={s.colNum}><Text style={s.thText}>P.U.</Text></View>
          <View style={s.colNum}><Text style={s.thText}>Total</Text></View>
        </View>

        {/* ── rows ── */}
        {items.map((item, idx) => {
          const isFullyReceived = item.remaining_quantity <= 0
          return (
            <View key={item.id} style={[s.row, idx % 2 === 1 ? s.rowAlt : {}]} wrap={false}>
              <View style={s.colArticle}>
                <Text style={s.productName}>{item.product_name}</Text>
                {item.product_category
                  ? <Text style={s.productSub}>{item.product_category}{item.product_sku ? ` · ${item.product_sku}` : ''}</Text>
                  : item.product_sku
                    ? <Text style={s.productSub}>{item.product_sku}</Text>
                    : null}
              </View>
              <View style={s.colNum}>
                <Text style={s.cellText}>{fmt(item.quantity)}</Text>
              </View>
              <View style={s.colNum}>
                <Text style={item.received_quantity > 0 ? s.greenText : s.dimText}>
                  {fmt(item.received_quantity)}
                </Text>
              </View>
              <View style={s.colNum}>
                {isFullyReceived
                  ? <Text style={s.greenText}>✓</Text>
                  : <Text style={s.amberText}>{fmt(item.remaining_quantity)}</Text>}
              </View>
              <View style={s.colNum}>
                <Text style={s.cellText}>{fmt(item.unit_cost)}</Text>
              </View>
              <View style={s.colNum}>
                <Text style={s.cellText}>{fmt(item.total)}</Text>
              </View>
            </View>
          )
        })}

        {/* ── financial summary ── */}
        <View style={s.financialBox}>
          <View style={s.finRow}>
            <Text style={s.finLabel}>Sous-total</Text>
            <Text style={s.finValue}>{fmt(subtotal)}</Text>
          </View>
          {(order.discount_percentage ?? 0) > 0 && (
            <View style={s.finRow}>
              <Text style={s.finLabel}>Remise ({order.discount_percentage}%)</Text>
              <Text style={[s.finValue, { color: '#DC2626' }]}>−{fmt(discountAmount)}</Text>
            </View>
          )}
          {(order.extra_fees ?? 0) > 0 && (
            <View style={s.finRow}>
              <Text style={s.finLabel}>Frais supplémentaires</Text>
              <Text style={s.finValue}>+{fmt(order.extra_fees ?? 0)}</Text>
            </View>
          )}
          <View style={[s.finRow, s.finTotal]}>
            <Text style={s.finTotalLabel}>Total</Text>
            <Text style={s.finTotalValue}>{fmt(total)}</Text>
          </View>
        </View>

        {/* ── note ── */}
        {order.note ? (
          <View style={s.noteBox}>
            <Text style={s.noteLabel}>Note</Text>
            <Text style={s.noteText}>{order.note}</Text>
          </View>
        ) : null}

        {/* ── signatures ── */}
        <View style={s.sigSection}>
          <Text style={s.sigTitle}>Signatures</Text>
          <View style={s.sigRow}>
            {[0, 1, 2].map(i => (
              <View key={i} style={s.sigBox}>
                <View style={s.sigLine} />
              </View>
            ))}
          </View>
        </View>

        {/* ── footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Commande générée par Lynx, solutions de gestion de caisse, facturation et stock.
          </Text>
          <Text style={s.footerText}>Plus de détails sur lynx-solution.com</Text>
        </View>

      </Page>
    </Document>
  )
}
