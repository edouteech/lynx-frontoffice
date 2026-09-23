import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type ExportCell = string | number | boolean | null | undefined

function asText(v: ExportCell): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non'
  return String(v)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function exportToCsv(args: {
  filename: string
  headers: string[]
  rows: ExportCell[][]
}) {
  const lines = [
    args.headers.map((h) => `"${String(h).replaceAll('"', '""')}"`).join(','),
    ...args.rows.map((r) =>
      r
        .map((c) => `"${asText(c).replaceAll('"', '""')}"`)
        .join(',')
    ),
  ]
  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  downloadBlob(blob, args.filename.endsWith('.csv') ? args.filename : `${args.filename}.csv`)
}

export function exportToXlsx(args: {
  filename: string
  headers: string[]
  rows: ExportCell[][]
  sheetName?: string
}) {
  const data = [args.headers, ...args.rows.map((r) => r.map(asText))]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, args.sheetName ?? 'Export')
  XLSX.writeFile(wb, args.filename.endsWith('.xlsx') ? args.filename : `${args.filename}.xlsx`)
}

export function exportToPdf(args: {
  filename: string
  title?: string
  headers: string[]
  rows: ExportCell[][]
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  if (args.title) {
    doc.setFontSize(14)
    doc.text(args.title, 40, 40)
  }
  autoTable(doc, {
    head: [args.headers],
    body: args.rows.map((r) => r.map(asText)),
    startY: args.title ? 60 : 40,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [48, 65, 105] }, // #304169
  })
  doc.save(args.filename.endsWith('.pdf') ? args.filename : `${args.filename}.pdf`)
}

export function printTable(args: {
  title?: string
  headers: string[]
  rows: ExportCell[][]
  organizationName?: string
}) {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) return

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${args.title ?? 'Impression Tableau'}</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          @page { size: A4 landscape; margin: 15mm; }
          body { margin: 0; padding: 10px; color: #1e293b; background: white; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #304169; padding-bottom: 12px; }
          .title { font-size: 18px; font-weight: 800; color: #1e293b; text-transform: uppercase; margin: 0 0 4px 0; }
          .org { font-size: 13px; font-weight: 600; color: #64748b; }
          .date { font-size: 11px; color: #64748b; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th { background-color: #304169 !important; color: #ffffff !important; text-align: left; padding: 8px 10px; font-weight: 700; border: 1px solid #4A5D8A; text-transform: uppercase; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          td { padding: 7px 10px; border: 1px solid #e2e8f0; color: #334155; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${args.title ?? 'Tableau des Données'}</h1>
            ${args.organizationName ? `<div class="org">${args.organizationName}</div>` : ''}
          </div>
          <div class="date">
            Date d'édition : <strong>${dateStr}</strong><br>
            Nombre de lignes : <strong>${args.rows.length}</strong>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              ${args.headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${args.rows.map(r => `
              <tr>
                ${r.map(c => `<td>${c === null || c === undefined ? '—' : String(c)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <div>Document généré par Lynx</div>
          <div>Imprimé depuis le module Rapports</div>
        </div>
      </body>
    </html>
  `)
  doc.close()

  iframe.contentWindow?.focus()
  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => iframe.remove(), 60000)
  }, 300)
}

