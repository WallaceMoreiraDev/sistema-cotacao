'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, AlertOctagon } from 'lucide-react';

export function AdminLogsTabs() {
  const pathname = usePathname();
  
  const tabs = [
    {
      name: 'Monitoramento de Acessos',
      href: '/admin/logs',
      icon: ShieldCheck,
      current: pathname === '/admin/logs'
    },
    {
      name: 'Erros do Sistema',
      href: '/admin/logs/erros',
      icon: AlertOctagon,
      current: pathname === '/admin/logs/erros'
    }
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${tab.current
                  ? 'border-[#F7C00C] text-slate-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              <Icon
                className={`
                  -ml-0.5 mr-2 h-5 w-5
                  ${tab.current ? 'text-[#F7C00C]' : 'text-gray-400 group-hover:text-gray-500'}
                `}
                aria-hidden="true"
              />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
