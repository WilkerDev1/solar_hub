'use client';

import React, { useState } from 'react';
import { Briefcase, Mail, Phone, ShieldCheck } from 'lucide-react';
import { RequirePermission } from '@/core/auth/AuthContext';

interface Client {
  id: string;
  name: string;
  industry: string;
  contactName: string;
  email: string;
  phone: string;
  annualConsumption: string;
  contractStatus: 'firmado' | 'en_negociacion' | 'cancelado';
}

export default function ClientsModule() {
  const [clients] = useState<Client[]>([
    { id: '1', name: 'Agrícola Valle Central Ltda.', industry: 'Agricultura / Frutícola', contactName: 'Ricardo Soto', email: 'ricardo@vallecentral.cl', phone: '+56 9 8888 7777', annualConsumption: '450 MWh/año', contractStatus: 'firmado' },
    { id: '2', name: 'Minera del Norte S.A.', industry: 'Minería / Extracción', contactName: 'Patricia Morales', email: 'pmorales@mineradelnorte.cl', phone: '+56 9 9999 1111', annualConsumption: '2,400 MWh/año', contractStatus: 'en_negociacion' },
    { id: '3', name: 'Centro Distribución Retail Santiago', industry: 'Logística / Retail', contactName: 'Felipe Reyes', email: 'freyes@distribucionretail.com', phone: '+56 9 4444 3333', annualConsumption: '850 MWh/año', contractStatus: 'firmado' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Directorio de Clientes (CRM)</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Registro de clientes industriales, consumos estimados y firma de contratos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clients.map((client) => (
          <div key={client.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-base">{client.name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{client.industry}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                client.contractStatus === 'firmado' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              }`}>
                {client.contractStatus.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-zinc-400" />
                <span>Contacto: <strong>{client.contactName}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-zinc-400" />
                <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-zinc-400" />
                <span>{client.phone}</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-850 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 mt-2">
                <span className="text-xs">Consumo Proyectado:</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{client.annualConsumption}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
