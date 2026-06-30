import { useState } from 'react'
import Modal from '../../components/Modal'
import { createCustomerTransaction } from '../../api/customer'
import { getApiErrorMessage } from '../../lib/apiError'
import Swal from 'sweetalert2'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

interface Props {
  open: boolean
  customerId: number
  type: 'deposit' | 'withdrawal'
  onClose: () => void
  onSuccess: () => void
}

export function CustomerTransactionModal({ open, customerId, type, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDeposit = type === 'deposit'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Veuillez entrer un montant valide supérieur à 0.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await createCustomerTransaction(customerId, {
        type,
        amount: Number(amount),
        description: description || undefined,
      })
      Swal.fire({
        title: 'Succès',
        text: isDeposit ? 'Dépôt effectué avec succès.' : 'Retrait effectué avec succès.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      })
      onSuccess()
      onClose()
      setAmount('')
      setDescription('')
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isDeposit ? 'Faire un dépôt' : 'Faire un retrait'}
      subtitle={isDeposit ? 'Ajouter des fonds au compte du client.' : 'Retirer des fonds du compte du client.'}
      preventClose={loading}
      maxWidthClassName="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="amount" className="mb-1 block text-sm font-medium text-gray-700">
            Montant (CFA) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              {isDeposit ? (
                <ArrowDownRight className="h-5 w-5 text-emerald-500" />
              ) : (
                <ArrowUpRight className="h-5 w-5 text-red-500" />
              )}
            </div>
            <input
              type="number"
              id="amount"
              min="1"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              placeholder="Ex: 5000"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
            Motif / Description <span className="text-gray-400 font-normal">(Optionnel)</span>
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            placeholder="Ex: Paiement d'avance pour commande..."
          />
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 ${
              isDeposit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? 'Traitement...' : 'Confirmer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
