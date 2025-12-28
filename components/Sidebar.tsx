import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  GitBranch, 
  Wallet, 
  Settings as SettingsIcon,
  ChevronRight,
  Receipt,
  ScanLine,
  X,
  Bell,
  Banknote
} from 'lucide-react';
import { Module, UserRole } from '../types';
import { LOGO_DARK_BG } from '../constants';

interface SidebarProps {
  activeModule: Module;
  onModuleChange: (module: Module) => void;
  isOpen?: boolean;
  onClose?: () => void;
  userRole?: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({ activeModule, onModuleChange, isOpen = false, onClose, userRole }) => {
  
  // ROLE BASED ACCESS CONTROL CONFIGURATION
  // Admin: All Access
  // Branch Manager: Operational + Accounts + Notifications. No System Settings or Branch Config.
  // Accountant: Operational Only (Invoices, Payments, Clients, Scanner). No Financial Reports (Accounts).
  
  const menuItems = [
    { 
        id: 'Dashboard' as Module, 
        icon: LayoutDashboard, 
        label: 'Dashboards', 
        roles: [UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.ACCOUNTANT] 
    },
    { 
        id: 'Notifications' as Module, 
        icon: Bell, 
        label: 'Notifications', 
        roles: [UserRole.ADMIN, UserRole.BRANCH_MANAGER] 
    },
    { 
        id: 'Invoices' as Module, 
        icon: FileText, 
        label: 'Create Invoice', 
        roles: [UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.ACCOUNTANT] 
    },
    { 
        id: 'Payments' as Module, 
        icon: Receipt, 
        label: 'Payment Receipt', 
        roles: [UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.ACCOUNTANT] 
    },
    { 
        id: 'Clients' as Module, 
        icon: Users, 
        label: 'Clients', 
        roles: [UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.ACCOUNTANT] 
    },
    { 
        id: 'Payroll' as Module, 
        icon: Banknote, 
        label: 'Payroll & HR', 
        roles: [UserRole.ADMIN, UserRole.BRANCH_MANAGER] 
    },
    { 
        id: 'Branches' as Module, 
        icon: GitBranch, 
        label: 'Branches', 
        roles: [UserRole.ADMIN] // Strictly Admin
    },
    { 
        id: 'Accounts' as Module, 
        icon: Wallet, 
        label: 'Financial Ledger', 
        roles: [UserRole.ADMIN, UserRole.BRANCH_MANAGER] // Managers can see ledger, Accountants cannot
    },
    { 
        id: 'Scanner' as Module, 
        icon: ScanLine, 
        label: 'Secure Scanner', 
        roles: [UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.ACCOUNTANT] 
    },
    { 
        id: 'Settings' as Module, 
        icon: SettingsIcon, 
        label: 'System Config', 
        roles: [UserRole.ADMIN] // Strictly Admin
    },
  ];

  const filteredItems = menuItems.filter(item => 
    !userRole || item.roles.includes(userRole)
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#1c2d3d] text-white shadow-2xl flex flex-col border-r border-black/10
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 flex-shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-white/5 bg-[#14212c] flex items-center justify-between">
          <div className="flex flex-col items-center flex-1">
             <img src={LOGO_DARK_BG} alt="VEDARTHA" className="h-14 object-contain" />
          </div>
          {/* Close button only visible on mobile */}
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 mt-6 overflow-y-auto custom-scrollbar">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onModuleChange(item.id)}
              className={`w-full flex items-center px-6 py-4 transition-all duration-300 group relative ${
                activeModule === item.id 
                  ? 'bg-[#0854a0] text-white' 
                  : 'text-gray-400 hover:bg-[#2c3e50] hover:text-white'
              }`}
            >
              {activeModule === item.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400"></div>}
              <item.icon size={18} className={`${activeModule === item.id ? 'text-blue-300' : 'text-gray-500 group-hover:text-blue-400'} transition-colors`} />
              <span className="ml-4 font-semibold text-[13px]">{item.label}</span>
              {activeModule === item.id && <ChevronRight size={14} className="ml-auto opacity-40" />}
              
              {/* Badge for Notifications */}
              {item.id === 'Notifications' && (
                  <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 bg-[#14212c]">
          <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="w-9 h-9 rounded-lg bg-[#0854a0] flex items-center justify-center font-bold text-xs text-white shadow-lg shadow-black/20">
              {userRole ? userRole.substring(0, 2).toUpperCase() : 'AL'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-bold truncate">{userRole || 'Administrator'}</p>
              <p className="text-[9px] text-blue-400 font-medium opacity-60">System Access</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;