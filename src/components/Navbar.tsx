'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  Users,
  LayoutDashboard,
  Receipt,
  MessageSquare,
  FileSpreadsheet,
  Settings,
  Sparkles,
  LogIn,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'STAFF';
}

export default function Navbar() {
  const pathname = usePathname();
  const [whatsappMode, setWhatsappMode] = useState<'DEMO' | 'PRODUCTION'>('DEMO');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setWhatsappMode(data.settings.whatsapp_mode);
      }
    } catch {}
  };

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated) {
        setCurrentUser(data.user);
      }
    } catch {}
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
    checkAuth();
  }, []);

  // Close the mobile menu whenever the route changes (e.g. a nav link was
  // tapped). There's no prop-driven equivalent without remounting the whole
  // menu subtree on every navigation, so this stays an effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleToggleMode = async () => {
    const nextMode = whatsappMode === 'DEMO' ? 'PRODUCTION' : 'DEMO';
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_mode: nextMode }),
      });
      const data = await res.json();
      if (data.success) {
        setWhatsappMode(nextMode);
      }
    } catch {}
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    window.location.reload();
  };

  const isAdminUser = currentUser?.role === 'ADMIN';

  const navItems = [
    { label: 'POS Billing', href: '/', icon: ShoppingBag },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Invoices', href: '/invoices', icon: Receipt },
    { label: 'WhatsApp', href: '/whatsapp', icon: MessageSquare },
    { label: 'Reports', href: '/reports', icon: FileSpreadsheet },
    // Admin-only: store rate, WhatsApp credentials, etc.
    ...(isAdminUser ? [{ label: 'Settings', href: '/settings', icon: Settings }] : []),
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="bg-black text-white border-b border-neutral-800 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5 group">
                <Image
                  src="/logo.png"
                  alt="Terry Women"
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full object-contain border border-emerald-900/60 shadow-xs group-hover:scale-105 transition-transform"
                />
                <span className="text-xl sm:text-2xl font-black tracking-widest text-white group-hover:text-neutral-300 transition-colors uppercase">
                  TERRY
                </span>
                <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 tracking-wider uppercase">
                  WOMEN
                </span>
              </Link>
            </div>

            {/* Desktop Navigation Links (Visible on Tablet/Desktop) */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-neutral-800 text-white shadow-inner font-semibold'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Controls: Mode Toggle, Auth, and Mobile Hamburger */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* WhatsApp Mode Toggle (changing it is a Settings write, so admin-only) */}
              <button
                onClick={isAdminUser ? handleToggleMode : undefined}
                disabled={!isAdminUser}
                title={
                  isAdminUser
                    ? 'Click to toggle between Demo & Production WhatsApp mode'
                    : 'WhatsApp mode (admin-only setting)'
                }
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all border ${
                  whatsappMode === 'DEMO'
                    ? 'bg-amber-950/70 text-amber-300 border-amber-700/60'
                    : 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                } ${isAdminUser ? 'hover:brightness-110 cursor-pointer' : 'opacity-70 cursor-default'}`}
              >
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>WA: {whatsappMode}</span>
              </button>

              {/* Desktop Auth Status */}
              <div className="hidden sm:flex items-center gap-2">
                {currentUser ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-300">{currentUser.name}</span>
                    <button
                      onClick={handleLogout}
                      title="Logout"
                      className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs font-semibold transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Login</span>
                  </Link>
                )}
              </div>

              {/* Mobile Hamburger Menu Button (Visible only on Mobile) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors focus:outline-hidden"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-800 bg-neutral-950 px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2 duration-150">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-neutral-800 text-white'
                        : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-neutral-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Auth Button */}
            <div className="pt-3 border-t border-neutral-800 mt-2">
              {currentUser ? (
                <div className="flex items-center justify-between px-3 py-2 bg-neutral-900 rounded-lg text-xs">
                  <span className="text-neutral-300">Logged in: <strong>{currentUser.name}</strong></span>
                  <button
                    onClick={handleLogout}
                    className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-neutral-800 text-white rounded-lg text-xs font-bold"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Admin Login</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar (Thumb Friendly POS Navigation) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-t border-neutral-800 text-white px-2 py-1.5 flex justify-around items-center no-print">
        {[
          { label: 'Billing', href: '/', icon: ShoppingBag },
          { label: 'Customers', href: '/customers', icon: Users },
          { label: 'Invoices', href: '/invoices', icon: Receipt },
          { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          isAdminUser
            ? { label: 'Settings', href: '/settings', icon: Settings }
            : { label: 'Reports', href: '/reports', icon: FileSpreadsheet },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-bold transition-all ${
                isActive ? 'text-white bg-neutral-800/80' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
