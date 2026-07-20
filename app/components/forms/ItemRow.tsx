export function ItemRow({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{name}</span>
      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Item</span>
    </div>
  );
}
