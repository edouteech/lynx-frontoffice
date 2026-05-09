export default function LoadingScreen({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EFF6FF]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#3B82F6] border-t-transparent" />
        <p className="text-sm font-medium text-gray-600">{label}</p>
      </div>
    </div>
  )
}
