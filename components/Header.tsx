
import React from 'react';
import { Bell, Search, Globe, LogOut, Menu } from 'lucide-react';
import { Branch } from '../types';

interface HeaderProps {
  branches: Branch[];
  activeBranchId: string;
  onBranchChange: (id: string) => void;
  title: string;
  onLogout: () => void;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ branches, activeBranchId, onBranchChange, title, onLogout, onToggleSidebar }) => {
  const activeBranch = branches.find(b => b.id === activeBranchId);

  return (
    <header className="bg-white h-14 border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center space-x-4">
        {/* Hamburger Menu - Visible on Mobile */}
        <button 
          onClick={onToggleSidebar}
          className="md:hidden text-gray-500 hover:text-[#0854a0] transition-colors"
        >
          <Menu size={24} />
        </button>

        <h2 className="text-lg font-semibold text-gray-800 truncate max-w-[150px] md:max-w-none">{title}</h2>
        <div className="hidden md:block h-4 w-[1px] bg-gray-300"></div>
        <div className="hidden md:flex items-center space-x-2">
          <Globe size={16} className="text-blue-500" />
          <select 
            value={activeBranchId}
            onChange={(e) => onBranchChange(e.target.value)}
            className="text-xs font-medium text-gray-600 bg-gray-50 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-3 md:space-x-6">
        <div className="relative group hidden sm:block">
          <Search size={18} className="text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search transactions..." 
            className="pl-9 pr-4 py-1.5 bg-gray-100 border-none rounded-full text-xs w-32 md:w-64 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all outline-none"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="text-gray-500 hover:text-blue-600 relative">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-[8px] text-white w-3.5 h-3.5 flex items-center justify-center rounded-full font-bold">3</span>
          </button>
          <div className="h-6 w-[1px] bg-gray-200"></div>
          <button 
            onClick={onLogout}
            className="flex items-center space-x-2 text-gray-600 hover:text-red-600 text-xs font-medium transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
