'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  TrendingUp,
  Users,
  Scale,
} from 'lucide-react';

export default function ReportsPage() {
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  const handleExportCsv = async (type: 'purchases' | 'customers') => {
    setDownloadingType(type);
    try {
      window.location.href = `/api/reports/export?type=${type}`;
    } finally {
      setTimeout(() => setDownloadingType(null), 1000);
    }
  };

  const reports = [
    {
      id: 'purchases',
      title: 'Full Sales & Transactions Report',
      description: 'Contains complete transaction log with invoice numbers, customer phone numbers, weights, subtotals, loyalty discounts, payment methods, and timestamps.',
      icon: TrendingUp,
      type: 'purchases' as const,
      format: 'CSV Export',
    },
    {
      id: 'customers',
      title: 'Customer Directory & Loyalty Status',
      description: 'Contains all customer profiles, unique phone numbers, total purchases count, total weight purchased, lifetime spend, and current loyalty milestone status.',
      icon: Users,
      type: 'customers' as const,
      format: 'CSV Export',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-neutral-900 flex items-center gap-2">
          <FileSpreadsheet className="w-7 h-7 text-neutral-900" />
          <span>Financial Reports & Data Export</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Download detailed sales journals, weight volume summaries, customer directories, and tax audit records in standard CSV format.
        </p>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((rep) => {
          const Icon = rep.icon;
          return (
            <div
              key={rep.id}
              className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">{rep.title}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{rep.description}</p>
              </div>

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase">
                  {rep.format}
                </span>
                <button
                  onClick={() => handleExportCsv(rep.type)}
                  disabled={downloadingType === rep.type}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingType === rep.type ? 'Preparing...' : 'Download CSV'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
