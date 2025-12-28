
import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  Clock, Users, FileCheck, AlertCircle, TrendingUp, 
  ArrowUpRight, ArrowDownRight, Globe, ShieldCheck, Landmark
} from 'lucide-react';
import { COMPANY_LOGO, COMPANY_NAME } from '../constants';
import { Invoice, Client, Branch, Payment } from '../types';

interface DashboardProps {
  invoices: Invoice[];
  clients: Client[];
  branches: Branch[];
  payments: Payment[];
  onRecordPayment: (payment: Payment) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ invoices, clients, branches, payments }) => {
  // Metric Calculations based on active props (which are zeroed out if FY closed)
  const mtdRevenue = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const totalTaxCollected = invoices.reduce((acc, inv) => acc + (inv.taxAmount || 0), 0);
  const receivableCount = invoices.filter(inv => inv.status === 'Posted').length;
  // Note: Previous logic summed total revenue for "Receivables", keeping it for consistency as "Total Value of Posted"
  const receivableValue = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);

  // Dynamic Chart Data Calculation
  const chartData = React.useMemo(() => {
      // If no invoices (e.g. fresh year), show flat zero line
      if (invoices.length === 0) {
          return [
            { name: 'Start', revenue: 0, expenses: 0 },
            { name: 'End', revenue: 0, expenses: 0 },
          ];
      }

      const monthMap = new Map<string, number>();
      const today = new Date();
      // Initialize a few months back if needed, or just map existing data
      
      invoices.forEach(inv => {
          const date = new Date(inv.date);
          const month = date.toLocaleString('default', { month: 'short' });
          monthMap.set(month, (monthMap.get(month) || 0) + (inv.grandTotal || 0));
      });

      const data = Array.from(monthMap.entries()).map(([name, val]) => ({
          name,
          revenue: val,
          expenses: val * 0.6 // Simulated expense ratio
      }));
      
      // Add previous point for better visual if only one month exists
      if (data.length === 1) {
          data.unshift({ name: 'Prev', revenue: 0, expenses: 0 });
      } else if (data.length === 0) {
          // Fallback if loop didn't produce data
          return [
            { name: 'Start', revenue: 0, expenses: 0 },
            { name: 'End', revenue: 0, expenses: 0 },
          ];
      }
      
      return data;
  }, [invoices]);

  const pieData = branches.map(b => ({
    name: b.name.split('-')[1]?.trim() || b.name,
    value: invoices.filter(inv => inv.branchId === b.id).reduce((acc, inv) => acc + (inv.grandTotal || 0), 0) || 0
  }));
  
  // If pie data is all zero, show a placeholder to avoid empty chart glitch
  const isPieEmpty = pieData.every(d => d.value === 0);
  const displayPieData = isPieEmpty ? [{ name: 'No Data', value: 1 }] : pieData;
  const PIE_COLORS = isPieEmpty ? ['#e2e8f0'] : ['#0854a0', '#10b981', '#f59e0b', '#ef4444'];

  const COLORS = ['#0854a0', '#10b981', '#f59e0b', '#ef4444'];

  const colorVariants: Record<string, { bg: string; text: string; bgSoft: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', bgSoft: 'bg-blue-50' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', bgSoft: 'bg-amber-50' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bgSoft: 'bg-emerald-50' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', bgSoft: 'bg-rose-50' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', bgSoft: 'bg-purple-50' },
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Premium Header Branding */}
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-gray-200">
        <div className="flex items-center space-x-6">
          <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
            <img src={COMPANY_LOGO} alt="VEDARTHA" className="h-16 object-contain" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-3xl font-[900] text-[#003366] tracking-tighter uppercase leading-none">
              {COMPANY_NAME}
            </h2>
            <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-[0.25em] mt-2 ml-1">
              Cloud Dashboards
            </p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <div className="bg-white px-5 py-2.5 rounded-2xl border border-gray-200 shadow-sm flex items-center space-x-3">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
            </div>
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Firebase Connected</span>
          </div>
          <div className="bg-[#003366] px-5 py-2.5 rounded-2xl shadow-lg shadow-blue-100 flex items-center space-x-2 text-white">
            <Globe size={14} />
            <span className="text-[11px] font-bold uppercase tracking-wider">Global Instance</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Revenue (MTD)', value: `₹ ${(mtdRevenue || 0).toLocaleString('en-IN')}`, trend: invoices.length > 0 ? '+ Active' : 'No Data', icon: TrendingUp, color: 'blue', sub: 'vs Previous Period' },
          { label: 'Tax Collected', value: `₹ ${(totalTaxCollected || 0).toLocaleString('en-IN')}`, trend: 'GST/TDS', icon: Landmark, color: 'purple', sub: 'Liability Accrued' },
          { label: 'Receivables', value: `₹ ${(receivableValue || 0).toLocaleString('en-IN')}`, trend: receivableCount.toString(), icon: Clock, color: 'amber', sub: 'Open Vouchers' },
          { label: 'Partner Network', value: clients.length.toString(), trend: 'Verified', icon: Users, color: 'emerald', sub: 'Active Entities' },
        ].map((stat, idx) => {
          const styles = colorVariants[stat.color] || colorVariants.blue;
          return (
            <div key={idx} className="bg-white p-7 rounded-[28px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 ${styles.bgSoft} rounded-full opacity-40 group-hover:scale-150 transition-transform duration-700`}></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${styles.bg} ${styles.text} group-hover:bg-[#003366] group-hover:text-white transition-all`}>
                    <stat.icon size={20} />
                  </div>
                  {idx === 0 && invoices.length > 0 && <ArrowUpRight size={18} className="text-emerald-500" />}
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">{stat.label}</p>
                <h3 className="text-2xl font-black text-[#003366] tracking-tighter">{stat.value}</h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${idx === 3 ? 'text-blue-500' : 'text-emerald-500'}`}>
                    {stat.trend}
                  </span>
                  <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">{stat.sub}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytical Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Analytics Hub */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-[0.2em]">Financial Performance Matrix</h3>
              <p className="text-[10px] font-bold text-gray-400 mt-1">Cross-Dimensional Revenue Analytics</p>
            </div>
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
              {['Quarterly', 'Monthly', 'Daily'].map((t) => (
                <button key={t} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${t === 'Monthly' ? 'bg-white text-[#003366] shadow-sm' : 'text-gray-400'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0854a0" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0854a0" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  axisLine={false} 
                  tickLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `₹${val/1000}k`} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    padding: '16px'
                  }}
                  cursor={{ stroke: '#0854a0', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0854a0" strokeWidth={5} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-50 flex items-center space-x-8 text-[10px] font-black uppercase tracking-widest">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#0854a0] mr-2"></div>
              <span className="text-gray-600">Gross Sales</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#ef4444] mr-2 border-2 border-dashed border-white"></div>
              <span className="text-gray-600">Operating Cost</span>
            </div>
          </div>
        </div>

        {/* Strategic Allocation */}
        <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center">
          <div className="w-full mb-10 text-center">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-[0.2em]">Regional Breakdown</h3>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Entity Contribution Index</p>
          </div>
          
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={displayPieData} 
                  innerRadius={75} 
                  outerRadius={100} 
                  paddingAngle={isPieEmpty ? 0 : 8} 
                  dataKey="value"
                  stroke="none"
                >
                  {displayPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
              <span className="text-xl font-black text-[#003366]">{isPieEmpty ? '0%' : '100%'}</span>
            </div>
          </div>

          <div className="mt-10 w-full space-y-4">
            {isPieEmpty ? (
                <div className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">No Active Transaction Data</div>
            ) : (
                pieData.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-3 rounded-2xl transition-all border border-transparent hover:border-gray-100">
                    <div className="flex items-center">
                    <div className="w-4 h-4 rounded-lg mr-4 shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="text-[11px] font-black text-gray-600 uppercase tracking-tight">{item.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                    <span className="text-[11px] font-black text-[#003366]">₹ {(item.value || 0).toLocaleString('en-IN')}</span>
                    <span className="text-[8px] font-bold text-gray-300 uppercase">Settled</span>
                    </div>
                </div>
                ))
            )}
          </div>

          <button className="mt-auto w-full py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-[#003366] hover:bg-[#003366] hover:text-white transition-all">
            Full Unit Audit
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
