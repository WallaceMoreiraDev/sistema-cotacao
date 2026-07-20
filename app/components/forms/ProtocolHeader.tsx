export function ProtocolHeader({ clientName }: { clientName: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">Cliente</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-900">{clientName}</h2>
    </div>
  );
}
