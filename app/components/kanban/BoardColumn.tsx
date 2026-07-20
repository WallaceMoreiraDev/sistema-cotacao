export function BoardColumn({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</h3>
    </div>
  );
}
