import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  Activity,
  Target,
  Sparkles,
  Users,
  Mail,
  BookOpen,
  Coins,
  FileText,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Zap,
} from 'lucide-react';

export type PortalView =
  | 'dashboard'
  | 'si'
  | 'targets'
  | 'ai'
  | 'participants'
  | 'email'
  | 'resources'
  | 'budget'
  | 'developer';

export interface NavItemConfig {
  id: PortalView;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'analytics' | 'operations' | 'system';
  adminOnly?: boolean;
  accent?: 'violet';
}

export const PORTAL_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Dash',
    description: 'Executive cohort metrics & live performance overview',
    icon: LayoutDashboard,
    group: 'analytics',
  },
  {
    id: 'si',
    label: 'Summary Intelligence',
    shortLabel: 'SI',
    description: 'Cohort capacity, lead owner targets & source attribution',
    icon: Activity,
    group: 'analytics',
  },
  {
    id: 'targets',
    label: 'Targets & ROI',
    shortLabel: 'Targets',
    description: 'Program goal tracking, counselor targets & cohort returns',
    icon: Target,
    group: 'analytics',
  },
  {
    id: 'ai',
    label: 'AI Insights',
    shortLabel: 'AI',
    description: 'Automated intelligence & cohort pattern analysis',
    icon: Sparkles,
    group: 'analytics',
    accent: 'violet',
  },
  {
    id: 'participants',
    label: 'Participants',
    shortLabel: 'People',
    description: 'Participant roster, batches & client partner records',
    icon: Users,
    group: 'operations',
  },
  {
    id: 'email',
    label: 'Welcome Email',
    shortLabel: 'Email',
    description: 'Single & bulk participant onboarding dispatch',
    icon: Mail,
    group: 'operations',
  },
  {
    id: 'resources',
    label: 'Resources',
    shortLabel: 'Resources',
    description: 'Session templates, brochures & calendar invites',
    icon: BookOpen,
    group: 'operations',
  },
  {
    id: 'budget',
    label: 'Budget & Spend',
    shortLabel: 'Budget',
    description: 'Marketing channel budgets & monthly spend allocation',
    icon: Coins,
    group: 'operations',
  },
  {
    id: 'developer',
    label: 'Developer Config',
    shortLabel: 'Dev',
    description: 'Course dates, timings, Zoom meeting & calendar setup',
    icon: FileText,
    group: 'system',
    adminOnly: true,
  },
];

interface SidebarProps {
  currentView: PortalView;
  onSelectView: (view: PortalView) => void;
  isAdmin: boolean;
  currentUser: string;
  participantsCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenQuickActions: () => void;
  onLogout: () => void;
}

const GROUP_LABELS: Record<'analytics' | 'operations' | 'system', string> = {
  analytics: 'Intelligence',
  operations: 'Operations',
  system: 'System',
};

export default function Sidebar({
  currentView,
  onSelectView,
  isAdmin,
  currentUser,
  participantsCount,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenQuickActions,
  onLogout,
}: SidebarProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggleCollapse();
      } else if (e.key === 'Escape' && isMobileOpen) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleCollapse, isMobileOpen, onCloseMobile]);

  const visibleItems = PORTAL_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const groups: ('analytics' | 'operations' | 'system')[] = isAdmin
    ? ['analytics', 'operations', 'system']
    : ['analytics', 'operations'];

  const displayName = isAdmin
    ? 'Admin'
    : currentUser.includes('@')
    ? currentUser.split('@')[0]
    : currentUser || 'Member';
  const roleLabel = isAdmin ? 'Administrator' : 'Client Partner';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const handleNavClick = (view: PortalView) => {
    onSelectView(view);
    onCloseMobile();
  };

  const renderNavContent = (compact: boolean) => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div
        className={`h-16 flex items-center border-b border-slate-200/80 shrink-0 ${
          compact ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        {!compact ? (
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
              E
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap truncate leading-tight">
                Erickson India
              </p>
              <p className="text-[11px] font-medium text-slate-500 whitespace-nowrap truncate leading-tight">
                Welcome Portal
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand sidebar (Ctrl+B)"
            className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            E
          </button>
        )}

        {!compact && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar (Ctrl+B)"
            aria-label="Collapse sidebar"
            className="hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}

        {/* Mobile drawer close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Expand Toggle Row when Collapsed on Desktop */}
      {compact && (
        <div className="hidden lg:flex justify-center pt-3 pb-1 px-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand sidebar (Ctrl+B)"
            aria-label="Expand sidebar"
            className="w-10 h-9 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Action Launcher inside Mobile / Collapsed convenience */}
      <div className={`px-3 pt-3 ${compact ? 'flex justify-center' : ''}`}>
        <button
          type="button"
          onClick={() => {
            onOpenQuickActions();
            onCloseMobile();
          }}
          title="Quick Actions (Ctrl+K)"
          className={`flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
            compact ? 'w-10 h-10 p-0' : 'w-full py-2.5 px-3.5'
          }`}
        >
          <Zap className="w-4 h-4 shrink-0" />
          {!compact && <span className="whitespace-nowrap">Quick Actions</span>}
        </button>
      </div>

      {/* Scrollable Navigation Groups */}
      <nav aria-label="Portal Navigation" className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-5">
        {groups.map((groupKey) => {
          const groupItems = visibleItems.filter((item) => item.group === groupKey);
          if (groupItems.length === 0) return null;

          return (
            <div key={groupKey} className="space-y-1">
              {!compact ? (
                <div className="px-2.5 pb-1 text-[11px] font-semibold text-slate-400 tracking-wide">
                  {GROUP_LABELS[groupKey]}
                </div>
              ) : (
                <div className="h-px bg-slate-200/70 mx-2 my-2" aria-hidden="true" />
              )}

              {groupItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                const isViolet = item.accent === 'violet';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    title={compact ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full min-h-[40px] flex items-center rounded-xl text-[13px] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      compact ? 'justify-center px-2 py-2' : 'justify-between px-3 py-2'
                    } ${
                      isActive
                        ? isViolet
                          ? 'bg-violet-50 text-violet-700 font-semibold border border-violet-200/70'
                          : 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/70'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-[18px] h-[18px] shrink-0 ${
                          isActive
                            ? isViolet
                              ? 'text-violet-600'
                              : 'text-blue-600'
                            : isViolet
                            ? 'text-violet-500'
                            : 'text-slate-400'
                        }`}
                      />
                      {!compact && <span className="whitespace-nowrap truncate">{item.label}</span>}
                    </span>

                    {!compact && item.id === 'participants' && participantsCount > 0 && (
                      <span
                        className={`text-[11px] font-mono tabular-nums ml-2 shrink-0 ${
                          isActive ? 'text-blue-600 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {participantsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Account Footer */}
      <div className="border-t border-slate-200/80 p-3 space-y-2 shrink-0 bg-slate-50/50">
        {!compact ? (
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
              {avatarInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
              <p className="text-[11px] text-slate-500 truncate">{roleLabel}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1" title={`${displayName} · ${roleLabel}`}>
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
              {avatarInitial}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onLogout}
          title={compact ? 'Log Out' : undefined}
          className={`w-full min-h-[40px] flex items-center rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
            compact ? 'justify-center px-2 py-2' : 'gap-2.5 px-3 py-2'
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!compact && <span className="whitespace-nowrap">Log Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-slate-200/80 lg:sticky lg:top-0 lg:h-screen shrink-0 z-30 transition-[width] duration-200 ease-out ${
          isCollapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {renderNavContent(isCollapsed)}
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={onCloseMobile}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-950/35 backdrop-blur-[2px]"
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full border-r border-slate-200 shadow-2xl flex flex-col z-10">
            {renderNavContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}
