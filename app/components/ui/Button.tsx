export function Button({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <button className={`rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white ${className}`}>
      {children}
    </button>
  );
}
