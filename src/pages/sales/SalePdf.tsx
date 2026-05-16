import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Organization, Sale } from '../../types/api'

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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#1D4ED8', marginBottom: 2 },
  invoiceNum: { fontSize: 9, color: '#6B7280', marginBottom: 2 },
  invoiceDate: { fontSize: 9, color: '#6B7280' },

  // parties (entreprise / client)
  partiesRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  partyBox: { flex: 1, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 6 },
  partyLabel: { fontSize: 7, color: '#9CA3AF', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 4 },
  partyName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 3 },
  partyLine: { fontSize: 8, color: '#374151', marginBottom: 1 },
  partyMuted: { fontSize: 7, color: '#9CA3AF' },

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

  // columns
  colArticle: { flex: 4 },
  colNum: { flex: 1, textAlign: 'right' },

  // cells
  productName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
  productSub: { fontSize: 7, color: '#9CA3AF', marginTop: 1 },
  cellText: { fontSize: 9, color: '#374151' },

  // financial summary
  financialBox: { marginTop: 16, alignItems: 'flex-end' },
  finRow: { flexDirection: 'row', gap: 48, marginBottom: 3 },
  finLabel: { fontSize: 8, color: '#6B7280', width: 130, textAlign: 'right' },
  finValue: { fontSize: 8, color: '#374151', width: 80, textAlign: 'right' },
  finTotal: { borderTopWidth: 2, borderTopColor: '#1D4ED8', paddingTop: 4, marginTop: 4 },
  finTotalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', width: 130, textAlign: 'right' },
  finTotalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1D4ED8', width: 80, textAlign: 'right' },

  // payment info
  paymentBox: {
    marginTop: 14, flexDirection: 'row', gap: 20,
    padding: 8, backgroundColor: '#EFF6FF', borderRadius: 6,
  },
  paymentLabel: { fontSize: 7, color: '#9CA3AF', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  paymentValue: { fontSize: 8, color: '#1D4ED8' },

  // note
  noteBox: {
    marginTop: 12, padding: 10, backgroundColor: '#F9FAFB',
    borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#3B82F6',
  },
  noteLabel: { fontSize: 7, color: '#6B7280', fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  noteText: { fontSize: 9, color: '#374151' },

  // footer
  footer: {
    position: 'absolute', bottom: 24, left: 36, right: 36,
    borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 6,
    alignItems: 'center',
  },
  footerText: { fontSize: 7, color: '#9CA3AF', textAlign: 'center' },
})

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0, useGrouping: true })
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  sale: Sale
  organization: Organization | null
}

export default function SalePdf({ sale, organization }: Props) {
  const items = sale.items ?? []
  const invoiceNumber = `FAC-${String(sale.id).padStart(6, '0')}`

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const discountAmount = subtotal * ((sale.discount_percentage ?? 0) / 100)
  const extraFees = sale.extra_fees ?? 0
  const netAPayer = subtotal - discountAmount + extraFees

  const saleDateTime = sale.sale_date ?? sale.created_at

  return (
    <Document title={invoiceNumber} author={organization?.name ?? 'Lynx'}>
      <Page size="A4" style={s.page}>

        {/* ── header ── */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>FACTURE</Text>
            <Text style={s.invoiceNum}>N° {invoiceNumber}</Text>
            <Text style={s.invoiceDate}>Date : {fmtDateTime(saleDateTime)}</Text>
            {sale.store && (
              <Text style={[s.invoiceDate, { marginTop: 2 }]}>Magasin : {sale.store.name}</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 7, color: '#9CA3AF', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 4 }}>
              Confirmée
            </Text>
            <View style={{ backgroundColor: '#D1FAE5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#065F46' }}>✓ Payée</Text>
            </View>
          </View>
        </View>

        {/* ── parties entreprise / client ── */}
        <View style={s.partiesRow}>
          {/* Entreprise */}
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Entreprise</Text>
            <Text style={s.partyName}>{organization?.name ?? '—'}</Text>
            {organization?.tax_id && (
              <Text style={s.partyLine}>IFU : {organization.tax_id}</Text>
            )}
            {organization?.company_registration_number && (
              <Text style={s.partyLine}>RCCM : {organization.company_registration_number}</Text>
            )}
            {organization?.phone && (
              <Text style={s.partyLine}>Tél. : {organization.phone}</Text>
            )}
            {organization?.address && (
              <Text style={s.partyMuted}>{organization.address}</Text>
            )}
          </View>

          {/* Client */}
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Client</Text>
            {sale.customer_name ? (
              <>
                <Text style={s.partyName}>{sale.customer_name}</Text>
                {sale.customer_phone && (
                  <Text style={s.partyLine}>Tél. : {sale.customer_phone}</Text>
                )}
                {sale.customer_email && (
                  <Text style={s.partyLine}>{sale.customer_email}</Text>
                )}
                {sale.customer_tax_id && (
                  <Text style={s.partyLine}>NIF : {sale.customer_tax_id}</Text>
                )}
              </>
            ) : (
              <Text style={s.partyMuted}>Client anonyme</Text>
            )}
          </View>
        </View>

        <View style={s.divider} />

        {/* ── table header ── */}
        <View style={s.tableHeader}>
          <View style={s.colArticle}><Text style={s.thText}>Description</Text></View>
          <View style={s.colNum}><Text style={s.thText}>Prix unit. TTC</Text></View>
          <View style={s.colNum}><Text style={s.thText}>Qté</Text></View>
          <View style={s.colNum}><Text style={s.thText}>Total TTC</Text></View>
        </View>

        {/* ── rows ── */}
        {items.map((item, idx) => (
          <View key={item.id} style={[s.row, idx % 2 === 1 ? s.rowAlt : {}]} wrap={false}>
            <View style={s.colArticle}>
              <Text style={s.productName}>{item.product_name}</Text>
              {(item.product_category || item.product_sku) && (
                <Text style={s.productSub}>
                  {[item.product_category, item.product_sku].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
            <View style={s.colNum}>
              <Text style={s.cellText}>{fmt(item.unit_price)} XOF</Text>
            </View>
            <View style={s.colNum}>
              <Text style={s.cellText}>{item.quantity}</Text>
            </View>
            <View style={s.colNum}>
              <Text style={s.cellText}>{fmt(item.quantity * item.unit_price)} XOF</Text>
            </View>
          </View>
        ))}

        {/* ── financial summary ── */}
        <View style={s.financialBox}>
          <View style={s.finRow}>
            <Text style={s.finLabel}>Sous-total</Text>
            <Text style={s.finValue}>{fmt(subtotal)} XOF</Text>
          </View>
          {discountAmount > 0 && (
            <View style={s.finRow}>
              <Text style={s.finLabel}>Remise ({sale.discount_percentage}%)</Text>
              <Text style={[s.finValue, { color: '#DC2626' }]}>−{fmt(discountAmount)} XOF</Text>
            </View>
          )}
          {extraFees > 0 && (
            <View style={s.finRow}>
              <Text style={s.finLabel}>Frais supplémentaires</Text>
              <Text style={s.finValue}>+{fmt(extraFees)} XOF</Text>
            </View>
          )}
          <View style={[s.finRow, s.finTotal]}>
            <Text style={s.finTotalLabel}>NET À PAYER</Text>
            <Text style={s.finTotalValue}>{fmt(netAPayer)} XOF</Text>
          </View>
        </View>

        {/* ── payment info ── */}
        {(sale.payment_method || sale.cash_register) && (
          <View style={s.paymentBox}>
            {sale.payment_method && (
              <View>
                <Text style={s.paymentLabel}>Moyen de paiement</Text>
                <Text style={s.paymentValue}>{sale.payment_method.name}</Text>
              </View>
            )}
            {sale.cash_register && (
              <View>
                <Text style={s.paymentLabel}>Caisse</Text>
                <Text style={s.paymentValue}>{sale.cash_register.name}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── note ── */}
        {sale.note && (
          <View style={s.noteBox}>
            <Text style={s.noteLabel}>Note</Text>
            <Text style={s.noteText}>{sale.note}</Text>
          </View>
        )}

        {/* ── footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Facture générée par Lynx, solutions de gestion de caisse, facturation et stock.
          </Text>
          <Text style={s.footerText}>Plus de détails sur lynx-solution.com</Text>
        </View>

      </Page>
    </Document>
  )
}
