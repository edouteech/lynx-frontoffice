import { Document, Page, StyleSheet, Text, View, Image } from '@react-pdf/renderer'
import type { Organization, Sale } from '../../types/api'
import type { ReceiptSetting } from '../../types/receiptSetting'
import { resolveBackendUrl } from '../../lib/url'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 0,
    paddingBottom: 48,
    paddingHorizontal: 0,
    color: '#1E293B',
  },

  // header
  headerBlock: { backgroundColor: '#F3F6FA', padding: 36, marginBottom: 36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#1E293B', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  invoiceDate: { fontSize: 10, color: '#64748B', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 6 },
  invoiceNum: { fontSize: 10, color: '#64748B', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 6 },
  storeName: { fontSize: 10, color: '#64748B', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },

  contentWrapper: { paddingHorizontal: 36 },

  // parties (entreprise / client)
  partiesRow: { flexDirection: 'row', gap: 36, marginBottom: 36 },
  partyCol: { flex: 1 },
  partyHeaderContainer: { borderBottomWidth: 1.5, borderBottomColor: '#1E293B', marginBottom: 12, paddingBottom: 4 },
  partyHeaderContainerRight: { borderBottomWidth: 1.5, borderBottomColor: '#1E293B', marginBottom: 12, paddingBottom: 4, alignItems: 'flex-end' },
  partyLabel: { fontSize: 10, color: '#1E293B', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1 },
  
  partyTextRow: { flexDirection: 'row', marginBottom: 5 },
  partyLineLabel: { fontSize: 10, color: '#1E293B', fontFamily: 'Helvetica-Bold' },
  partyLineValue: { fontSize: 10, color: '#475569' },
  
  partyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1E293B', marginBottom: 8 },
  partyMuted: { fontSize: 10, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'right' },
  
  // table
  tableBox: { marginBottom: 36 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#304169' },
  thCol: { paddingVertical: 10, paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: '#4A5D8A' },
  thColLast: { paddingVertical: 10, paddingHorizontal: 10 },
  thText: { color: '#ffffff', fontSize: 10, fontFamily: 'Helvetica-Bold' },
  thTextCenter: { color: '#ffffff', fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  thTextRight: { color: '#ffffff', fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tdCol: { paddingVertical: 10, paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: '#E2E8F0', justifyContent: 'center' },
  tdColLast: { paddingVertical: 10, paddingHorizontal: 10, justifyContent: 'center' },

  // columns sizing
  colArticle: { flex: 4 },
  colPrice: { flex: 2 },
  colQty: { width: 50 },
  colTotal: { flex: 2 },

  // cells
  productName: { fontSize: 10, color: '#1E293B' },
  productSub: { fontSize: 9, color: '#64748B', marginTop: 2 },
  cellTextCenter: { fontSize: 10, color: '#475569', textAlign: 'center' },
  cellTextRightBold: { fontSize: 10, color: '#1E293B', fontFamily: 'Helvetica-Bold', textAlign: 'right' },

  // financial summary
  financialContainer: { alignItems: 'flex-end', marginBottom: 36 },
  financialBox: { width: 260, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E2E8F0', padding: 16 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  finLabel: { fontSize: 10, color: '#475569', fontFamily: 'Helvetica-Bold' },
  finValue: { fontSize: 10, color: '#475569', fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  finTotalContainer: { borderBottomWidth: 1.5, borderBottomColor: '#1E293B', paddingBottom: 10, marginBottom: 10 },
  finNetRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  finNetLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1E293B', textTransform: 'uppercase', letterSpacing: 0.5 },
  finNetValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1E293B', textAlign: 'right' },

  // footer info
  footerInfoBorder: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16 },
  paymentRow: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  paymentTextRow: { flexDirection: 'row' },
  paymentLabel: { fontSize: 10, color: '#1E293B', fontFamily: 'Helvetica-Bold' },
  paymentValue: { fontSize: 10, color: '#475569' },

  noteBox: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginBottom: 16 },
  noteText: { fontSize: 10, color: '#475569', fontStyle: 'italic' },

  // footer
  footer: {
    position: 'absolute', bottom: 24, left: 36, right: 36,
    borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12,
    alignItems: 'center',
  },
  footerText: { fontSize: 9, color: '#94A3B8', textAlign: 'center' },
})

function fmt(n: number, decimals = 0): string {
  const sign = n < 0 ? '-' : ''
  const [intPart, decPart] = Math.abs(n).toFixed(decimals).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const trimmed = decPart ? decPart.replace(/0+$/, '') : ''
  return sign + grouped + (trimmed ? ',' + trimmed : '')
}

function fmtDateOnly(d: string | null | undefined) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface Props {
  sale: Sale
  organization: Organization | null
  receiptSetting?: ReceiptSetting | null
}

export default function SalePdf({ sale, organization, receiptSetting }: Props) {
  const items = sale.items ?? []
  const invoiceNumber = sale.invoice_number ?? `FAC-${String(sale.id).padStart(6, '0')}`

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const discountAmount = subtotal * ((sale.discount_percentage ?? 0) / 100)
  const extraFees = sale.extra_fees ?? 0
  const netAPayer = subtotal - discountAmount + extraFees

  const saleDateTime = sale.sale_date ?? sale.created_at

  const logoUrl = receiptSetting?.printed_receipt_logo
    ? resolveBackendUrl(receiptSetting.printed_receipt_logo)
    : organization?.logo
      ? resolveBackendUrl(organization.logo)
      : null
  
  return (
    <Document title={invoiceNumber} author={organization?.name ?? 'Lynx'}>
      <Page size="A4" style={s.page}>

        {/* ── header ── */}
        <View style={s.headerBlock}>
          <View>
            <Text style={s.title}>FACTURE</Text>
            <Text style={s.invoiceDate}>DATE : {fmtDateOnly(saleDateTime)}</Text>
            <Text style={s.invoiceNum}>FACTURE N° : {invoiceNumber}</Text>
            {sale.store && (
              <Text style={s.storeName}>MAGASIN : {sale.store.name}</Text>
            )}
          </View>

          {logoUrl ? (
            <Image
              src={logoUrl}
              style={{ width: 120, height: 60, objectFit: 'contain' }}
            />
          ) : null}
        </View>

        <View style={s.contentWrapper}>
          {/* ── parties entreprise / client ── */}
          <View style={s.partiesRow}>
            {/* Entreprise */}
            <View style={s.partyCol}>
              <View style={s.partyHeaderContainer}>
                <Text style={s.partyLabel}>Entreprise</Text>
              </View>
              <Text style={s.partyName}>{organization?.name ?? '—'}</Text>
              {organization?.tax_id && (
                <View style={s.partyTextRow}><Text style={s.partyLineLabel}>IFU : </Text><Text style={s.partyLineValue}>{organization.tax_id}</Text></View>
              )}
              {organization?.company_registration_number && (
                <View style={s.partyTextRow}><Text style={s.partyLineLabel}>RCCM : </Text><Text style={s.partyLineValue}>{organization.company_registration_number}</Text></View>
              )}
              {organization?.phone && (
                <View style={s.partyTextRow}><Text style={s.partyLineLabel}>Téléphone : </Text><Text style={s.partyLineValue}>{organization.phone}</Text></View>
              )}
              {organization?.address && (
                <View style={s.partyTextRow}><Text style={s.partyLineLabel}>Adresse : </Text><Text style={s.partyLineValue}>{organization.address}</Text></View>
              )}
              {sale.seller_name && (
                <View style={s.partyTextRow}><Text style={s.partyLineLabel}>Vendeur : </Text><Text style={s.partyLineValue}>{sale.seller_name}</Text></View>
              )}
            </View>

            {/* Client */}
            <View style={s.partyCol}>
              <View style={s.partyHeaderContainerRight}>
                <Text style={s.partyLabel}>Client</Text>
              </View>
              {sale.customer_name ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.partyName, { textAlign: 'right' }]}>{sale.customer_name}</Text>
                  {sale.customer_phone && (
                    <View style={s.partyTextRow}><Text style={s.partyLineLabel}>Téléphone : </Text><Text style={s.partyLineValue}>{sale.customer_phone}</Text></View>
                  )}
                  {sale.customer_email && (
                    <View style={s.partyTextRow}><Text style={s.partyLineLabel}>E-mail : </Text><Text style={s.partyLineValue}>{sale.customer_email}</Text></View>
                  )}
                  {sale.customer_tax_id && (
                    <View style={s.partyTextRow}><Text style={s.partyLineLabel}>NIF : </Text><Text style={s.partyLineValue}>{sale.customer_tax_id}</Text></View>
                  )}
                </View>
              ) : (
                <Text style={s.partyMuted}>Client anonyme</Text>
              )}
            </View>
          </View>

          {/* ── table ── */}
          <View style={s.tableBox}>
            <View style={s.tableHeader}>
              <View style={[s.thCol, s.colArticle]}><Text style={s.thText}>Description</Text></View>
              <View style={[s.thCol, s.colPrice]}><Text style={s.thTextCenter}>Prix Unitaire TTC</Text></View>
              <View style={[s.thCol, s.colQty]}><Text style={s.thTextCenter}>Qté</Text></View>
              <View style={[s.thColLast, s.colTotal]}><Text style={s.thTextRight}>Total TTC</Text></View>
            </View>

            {items.map((item, idx) => (
              <View key={item.id} style={s.row} wrap={false}>
                <View style={[s.tdCol, s.colArticle]}>
                  <Text style={s.productName}>{item.product_name}</Text>
                  {(item.product_category || item.product_sku) && (
                    <Text style={s.productSub}>
                      {[item.product_category, item.product_sku].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <View style={[s.tdCol, s.colPrice]}>
                  <Text style={s.cellTextCenter}>{fmt(item.unit_price)} XOF</Text>
                </View>
                <View style={[s.tdCol, s.colQty]}>
                  <Text style={s.cellTextCenter}>{item.quantity}</Text>
                </View>
                <View style={[s.tdColLast, s.colTotal]}>
                  <Text style={s.cellTextRightBold}>{fmt(item.quantity * item.unit_price)} XOF</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── financial summary ── */}
          <View style={s.financialContainer}>
            <View style={s.financialBox}>
              {discountAmount > 0 && (
                <View style={s.finRow}>
                  <Text style={s.finLabel}>Remise ({sale.discount_percentage}%)</Text>
                  <Text style={s.finValue}>−{fmt(discountAmount)} XOF</Text>
                </View>
              )}
              {extraFees > 0 && (
                <View style={s.finRow}>
                  <Text style={s.finLabel}>Frais supplémentaires</Text>
                  <Text style={s.finValue}>+{fmt(extraFees)} XOF</Text>
                </View>
              )}
              <View style={s.finTotalContainer}>
                <View style={s.finRow}>
                  <Text style={[s.finLabel, { textTransform: 'uppercase' }]}>Total</Text>
                  <Text style={s.finValue}>{fmt(netAPayer)} XOF</Text>
                </View>
              </View>
              <View style={s.finNetRow}>
                <Text style={s.finNetLabel}>NET À PAYER</Text>
                <Text style={s.finNetValue}>{fmt(netAPayer)} XOF</Text>
              </View>
            </View>
          </View>

          {/* ── footer info ── */}
          <View style={s.footerInfoBorder}>
            {(sale.payment_method || sale.cash_register) && (
              <View style={s.paymentRow}>
                {sale.payment_method && (
                  <View style={s.paymentTextRow}>
                    <Text style={s.paymentLabel}>Paiement : </Text>
                    <Text style={s.paymentValue}>{sale.payment_method.name}</Text>
                  </View>
                )}
                {sale.cash_register && (
                  <View style={s.paymentTextRow}>
                    <Text style={s.paymentLabel}>Caisse : </Text>
                    <Text style={s.paymentValue}>{sale.cash_register.name}</Text>
                  </View>
                )}
              </View>
            )}

            {sale.note && (
              <View style={s.noteBox}>
                <Text style={s.noteText}>{sale.note}</Text>
              </View>
            )}
          </View>
        </View>

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
