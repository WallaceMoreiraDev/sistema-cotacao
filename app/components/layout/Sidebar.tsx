export function Sidebar() {
  return (
    <aside className="w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Navegação</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        <li>Dashboard</li>
        <li>Novo Protocolo</li>
        <li>Protocolos</li>
      </ul>
    </aside>
  );
}
