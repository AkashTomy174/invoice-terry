'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Phone,
  Gift,
  ShoppingBag,
  History,
  FileText,
  UserPlus,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import { Customer, Purchase } from '@/lib/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPurchases, setCustomerPurchases] = useState<Purchase[]>([]);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);

  // New Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCustomer = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setIsLoadingPurchases(true);
    try {
      const res = await fetch(`/api/customers/${cust.phone}`);
      const data = await res.json();
      if (data.success) {
        setCustomerPurchases(data.purchases || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPurchases(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!newPhone || newPhone.replace(/\D/g, '').length < 10) {
      setAddError('Please enter a valid 10-digit phone number');
      return;
    }
    if (!newName.trim()) {
      setAddError('Customer name is required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newPhone, name: newName, address: newAddress }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create customer');
      }
      setShowAddModal(false);
      setNewPhone('');
      setNewName('');
      setNewAddress('');
      fetchCustomers();
      handleSelectCustomer(data.customer);
    } catch (err: any) {
      setAddError(err.message || 'Error creating customer');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-neutral-900" />
            <span>Customer Directory & Loyalty Management</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Search customers by phone number, inspect purchase history, and manage 5-visit loyalty rewards.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by phone number, name, or customer ID..."
          className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black text-sm outline-hidden shadow-xs"
        />
      </div>

      {/* Main Grid: Customers List & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer List (7 columns) */}
        <div className="lg:col-span-7 space-y-3">
          {isLoading ? (
            <div className="bg-white p-8 rounded-xl border border-neutral-200 text-center text-xs text-neutral-500">
              Loading customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-neutral-200 text-center space-y-2">
              <p className="text-sm font-semibold text-neutral-800">No customers found</p>
              <p className="text-xs text-neutral-500">
                Try searching with a different phone number or add a new customer.
              </p>
            </div>
          ) : (
            customers.map((cust) => {
              const isSelected = selectedCustomer?.id === cust.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => handleSelectCustomer(cust)}
                  className={`bg-white rounded-xl p-4 border transition-all cursor-pointer hover:shadow-md ${
                    isSelected ? 'border-black ring-1 ring-black bg-neutral-50/50' : 'border-neutral-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-neutral-900">{cust.name}</h3>
                        {cust.loyalty_reward_unlocked && (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                            ★ REWARD UNLOCKED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3" /> {cust.phone}
                        </span>
                        {cust.address && <span>&bull; {cust.address}</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-neutral-900 block font-mono">
                        ₹{cust.total_amount_spent.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {cust.total_purchases} orders ({(cust.total_weight_grams / 1000).toFixed(2)}kg)
                      </span>
                    </div>
                  </div>

                  {/* Loyalty Progress Bar Mini */}
                  <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-neutral-600 flex items-center gap-1">
                      <Gift className="w-3 h-3 text-neutral-500" />
                      Loyalty: {cust.loyalty_count}/5 Purchases
                    </span>
                    <div className="w-32 bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          cust.loyalty_reward_unlocked ? 'bg-amber-500' : 'bg-black'
                        }`}
                        style={{ width: `${Math.min(100, (cust.loyalty_count / 5) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detailed Customer Card & History (5 columns) */}
        <div className="lg:col-span-5">
          {selectedCustomer ? (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-5 sticky top-20 shadow-xs">
              {/* Profile Card */}
              <div className="border-b border-neutral-100 pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-neutral-900">{selectedCustomer.name}</h2>
                  <Link
                    href={`/?phone=${selectedCustomer.phone}`}
                    className="inline-flex items-center gap-1 text-xs font-bold bg-black text-white px-3 py-1.5 rounded-md hover:bg-neutral-800 transition-colors"
                  >
                    <span>Create Bill</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">Phone: {selectedCustomer.phone}</p>
                {selectedCustomer.address && (
                  <p className="text-xs text-neutral-600 mt-1">Address: {selectedCustomer.address}</p>
                )}
              </div>

              {/* Stats Tiles */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Orders</span>
                  <span className="text-sm font-black text-neutral-900">{selectedCustomer.total_purchases}</span>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total Weight</span>
                  <span className="text-sm font-black text-neutral-900">
                    {(selectedCustomer.total_weight_grams / 1000).toFixed(2)}kg
                  </span>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total Spent</span>
                  <span className="text-sm font-black text-neutral-900">
                    ₹{selectedCustomer.total_amount_spent.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Loyalty Reward Status Detail */}
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  selectedCustomer.loyalty_reward_unlocked
                    ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-amber-600" />
                    5-Purchase Loyalty Program
                  </span>
                  <span className="font-mono">
                    {selectedCustomer.loyalty_reward_unlocked ? 'UNLOCKED (50% OFF 1KG)' : `${selectedCustomer.loyalty_count}/5`}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {selectedCustomer.loyalty_reward_unlocked
                    ? 'Customer is eligible for 50% discount on 1000g (1 KG) on their next purchase of 1 KG or more!'
                    : `Completed ${selectedCustomer.loyalty_count} purchases. ${
                        5 - selectedCustomer.loyalty_count
                      } more purchase(s) required to unlock 50% OFF on 1 KG reward.`}
                </p>
              </div>

              {/* Purchase History Timeline */}
              <div>
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>Purchase History</span>
                </h4>

                {isLoadingPurchases ? (
                  <p className="text-xs text-neutral-400 py-4 text-center">Loading purchases...</p>
                ) : customerPurchases.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-4 text-center">No purchases recorded yet</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {customerPurchases.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-lg border border-neutral-200 bg-neutral-50/50 flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="font-bold text-neutral-900 font-mono">{p.invoice_number}</div>
                          <div className="text-[10px] text-neutral-500">
                            {new Date(p.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            &bull; {p.weight_grams}g &bull; {p.payment_method}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-neutral-900 font-mono block">
                            ₹{p.final_amount.toFixed(2)}
                          </span>
                          {p.loyalty_applied && (
                            <span className="text-[10px] text-emerald-700 font-bold block">
                              ₹{p.discount_amount.toFixed(2)} (50% Off 1KG)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-400 text-xs">
              Select a customer from the list to view their purchase history and loyalty profile.
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-neutral-900">Add New Customer</h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Phone Number (WhatsApp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 7736723917"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Address / City (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Calicut"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              {addError && <p className="text-xs text-rose-600 font-medium">{addError}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border rounded-lg text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-neutral-800 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
