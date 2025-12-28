
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowUpRight, 
  ArrowDownRight,
  Download, 
  Printer, 
  Search,
  Calendar,
  BarChart3
} from 'lucide-react';
import { Invoice, Payment, Client } from '../types';
import { COMPANY_NAME, COMPANY_LOGO } from '../constants';

interface AccountsProps {
  invoices: Invoice[];
  payments: Payment[];
  clients: Client[];
}

const Accounts: React.FC<AccountsProps> = ({ invoices, payments, clients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<'Current' | 'Previous'>('Current');
  const [reportView, setReportView] = useState<'Whole Year' | 'Monthly'>('Whole Year');

  // Helper to determine FY of a date
  // FY starts April 1st.
  // 2024-03-31 is FY 2023-24. 2024-04-01 is FY 2024-25.
  const getFiscalYearLabel = (dateStr: string) => {
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = d.getMonth(); // 0-11
      const fyStartYear = month >= 3 ? year : year - 1;
      return `${fyStartYear}-${fyStartYear+1}`;
  };

  const currentFYLabel = useMemo(() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const fyStartYear = month >= 3 ? year : year - 1;
      return `${fyStartYear}-${fyStartYear+1}`;
  }, []);

  const previousFYLabel = useMemo(() => {
      const parts = currentFYLabel.split('-');
      const start = parseInt(parts[0]) - 1;
      return `${start}-${start+1}`;
  }, [currentFYLabel]);

  // Filter Data by FY
  const filteredData = useMemo(() => {
      const targetLabel = selectedFiscalYear === 'Current' ? currentFYLabel : previousFYLabel;
      
      const fyInvoices = invoices.filter(i => getFiscalYearLabel(i.date) === targetLabel);
      const fyPayments = payments.filter(p => getFiscalYearLabel(p.date) === targetLabel);
      
      return { invoices: fyInvoices, payments: fyPayments };
  }, [invoices, payments, selectedFiscalYear, currentFYLabel, previousFYLabel]);

  const prevYearData = useMemo(() => {
      const compareLabel = previousFYLabel; 
      const fyInvoices = invoices.filter(i => getFiscalYearLabel(i.date) === compareLabel);
      
      return { 
          revenue: fyInvoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0),
          tax: fyInvoices.reduce((acc, i) => acc + (i.taxAmount || 0), 0),
          clients: 0 
      };
  }, [invoices, previousFYLabel]);


  // KPIs
  const totalRevenue = filteredData.invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const totalTax = filteredData.invoices.reduce((acc, inv) => acc + (inv.taxAmount || 0), 0);
  const totalClients = clients.length; 

  const revGrowth = prevYearData.revenue > 0 ? ((totalRevenue - prevYearData.revenue) / prevYearData.revenue) * 100 : 100;

  // Monthly Data Aggregation
  const monthlyData = useMemo(() => {
     const monthStats: { [key: string]: { revenue: number, tax: number, collected: number, monthSort: number } } = {};
     
     // Initialize all months to 0 for a complete FY view might be nice, but dynamic is fine too.
     
     filteredData.invoices.forEach(inv => {
         const d = new Date(inv.date);
         const key = d.toLocaleString('default', { month: 'long', year: 'numeric' });
         if (!monthStats[key]) monthStats[key] = { revenue: 0, tax: 0, collected: 0, monthSort: d.getTime() };
         monthStats[key].revenue += (inv.grandTotal || 0);
         monthStats[key].tax += (inv.taxAmount || 0);
     });

     filteredData.payments.forEach(pay => {
         const d = new Date(pay.date);
         const key = d.toLocaleString('default', { month: 'long', year: 'numeric' });
         if (!monthStats[key]) monthStats[key] = { revenue: 0, tax: 0, collected: 0, monthSort: d.getTime() };
         monthStats[key].collected += (pay.amount || 0);
     });

     return Object.entries(monthStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => a.monthSort - b.monthSort);
  }, [filteredData]);

  // Ledger Entries (Transaction Level)
  const ledgerEntries = useMemo(() => {
    const entries = [
      ...filteredData.invoices.map(inv => ({
        id: inv.id,
        date: inv.date,
        docRef: inv.invoiceNumber,
        description: `Invoice to ${inv.clientName}`,
        amount: inv.grandTotal || 0, 
        type: 'INVOICE'
      })),
      ...filteredData.payments.map(pay => ({
        id: pay.id,
        date: pay.date,
        docRef: pay.id,
        description: `Payment Received (CR) - ${pay.method}`,
        amount: pay.amount || 0,
        type: 'PAYMENT'
      }))
    ];

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = 0;
    return entries.map(entry => {
      if (entry.type === 'INVOICE') balance += entry.amount;
      else balance -= entry.amount;
      return { ...entry, balance };
    }).reverse();
  }, [filteredData]);

  const displayEntries = ledgerEntries.filter(entry => 
    entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    entry.docRef.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Financial_Statement_${selectedFiscalYear}`;
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      document.title = originalTitle;
    }, 500);
  };

  const StatementDocument = () => (
    <div className="bg-white w-[210mm] min-h-[297mm] p-[15mm] text-[#000000] font-sans flex flex-col relative print:p-[15mm]">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-black">
            <div className="flex items-center space-x-4">
                <img src={COMPANY_LOGO} className="h-12 object-contain" />
                <div>
                    <h1 className="text-xl font-bold uppercase">{COMPANY_NAME}</h1>
                    <p className="text-[10px]">Financial Ledger</p>
                </div>
            </div>
            <div className="text-right text-[10px]">
                <p>Date: {new Date().toLocaleDateString()}</p>
                <p>FY: {selectedFiscalYear === 'Current' ? currentFYLabel : previousFYLabel}</p>
                <p>View: {reportView}</p>
            </div>
        </div>

        {/* Content */}
        {reportView === 'Whole Year' ? (
            <table className="w-full text-[10px] border-collapse">
                <thead>
                    <tr className="border-b-2 border-black font-bold uppercase">
                        <th className="py-2 text-left w-24">Date</th>
                        <th className="py-2 text-left w-32">Ref No.</th>
                        <th className="py-2 text-left">Details</th>
                        <th className="py-2 text-right w-24">Amount</th>
                        <th className="py-2 text-right w-24">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    {[...displayEntries].reverse().map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-200">
                            <td className="py-2">{new Date(entry.date).toLocaleDateString()}</td>
                            <td className="py-2 font-mono">{entry.docRef}</td>
                            <td className="py-2">{entry.description}</td>
                            <td className="py-2 text-right font-medium">
                                {entry.type === 'PAYMENT' ? (
                                    <span className="text-black">({entry.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})})</span>
                                ) : (
                                    <span>{entry.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                )}
                            </td>
                            <td className="py-2 text-right font-bold">{entry.balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        ) : (
            <table className="w-full text-[10px] border-collapse">
                <thead>
                    <tr className="border-b-2 border-black font-bold uppercase">
                        <th className="py-2 text-left">Month</th>
                        <th className="py-2 text-right">Revenue (Gross)</th>
                        <th className="py-2 text-right">Tax Collected</th>
                        <th className="py-2 text-right">Payments Recd.</th>
                        <th className="py-2 text-right">Net Cashflow</th>
                    </tr>
                </thead>
                <tbody>
                    {monthlyData.map((m) => (
                        <tr key={m.name} className="border-b border-gray-200">
                            <td className="py-2 font-bold uppercase">{m.name}</td>
                            <td className="py-2 text-right">₹ {m.revenue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            <td className="py-2 text-right">₹ {m.tax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            <td className="py-2 text-right font-medium">₹ {m.collected.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            <td className="py-2 text-right font-bold">₹ {(m.collected - m.revenue).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        </tr>
                    ))}
                    <tr className="border-t-2 border-black font-bold text-[11px]">
                        <td className="py-4">TOTALS</td>
                        <td className="py-4 text-right">₹ {totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        <td className="py-4 text-right">₹ {totalTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        <td className="py-4 text-right">₹ {monthlyData.reduce((acc, m) => acc + m.collected, 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        <td className="py-4 text-right"></td>
                    </tr>
                </tbody>
            </table>
        )}

        {/* Footer */}
        <div className="mt-auto pt-8 border-t border-black text-[9px] text-center">
            <p>Computer generated statement.</p>
            <p>{COMPANY_NAME} | {selectedFiscalYear === 'Current' ? currentFYLabel : previousFYLabel}</p>
        </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isPrinting && createPortal(<StatementDocument />, document.getElementById('print-portal')!)}

      {/* Top Ledger Cards - Custom KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { 
              label: 'Total Revenue', 
              value: `₹ ${totalRevenue.toLocaleString('en-IN')}`, 
              icon: ArrowUpRight, 
              color: 'emerald',
              sub: `${revGrowth.toFixed(1)}% vs Prev Year`
          },
          { 
              label: 'Total Tax Collected', 
              value: `₹ ${totalTax.toLocaleString('en-IN')}`, 
              icon: ArrowUpRight, 
              color: 'blue',
              sub: 'Fiscal Liability'
          },
          { 
              label: 'Total Clients Added', 
              value: totalClients.toString(), 
              icon: ArrowUpRight, 
              color: 'amber',
              sub: 'Active Partner Network'
          },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{item.value}</h3>
              <p className={`text-[10px] font-bold mt-1 ${item.sub.includes('-') ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {item.sub}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${item.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : item.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'} group-hover:scale-110 transition-transform`}>
              <item.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* Reports Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Financial Year</label>
            <div className="flex items-center space-x-2">
                <Calendar size={14} className="text-gray-400" />
                <select 
                    className="text-[11px] border-none bg-gray-50 px-3 py-1.5 font-black uppercase rounded outline-none cursor-pointer text-[#0854a0]"
                    value={selectedFiscalYear}
                    onChange={(e) => setSelectedFiscalYear(e.target.value as 'Current' | 'Previous')}
                >
                    <option value="Current">Current FY ({currentFYLabel})</option>
                    <option value="Previous">Previous FY ({previousFYLabel})</option>
                </select>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-gray-200"></div>
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Report View</label>
            <select 
                className="text-[11px] border-none bg-gray-50 px-3 py-1.5 font-black uppercase rounded outline-none cursor-pointer"
                value={reportView}
                onChange={(e) => setReportView(e.target.value as 'Whole Year' | 'Monthly')}
            >
              <option value="Whole Year">Whole Year Report</option>
              <option value="Monthly">Monthly Breakdown</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-2">
          <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">
            <Download size={14} className="mr-2" /> Export
          </button>
          <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-[#0854a0] text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#064280] shadow-lg shadow-blue-100 transition-all">
            <Printer size={14} className="mr-2" /> Print Reports
          </button>
        </div>
      </div>

      {/* Conditional Rendering: Ledger Table OR Monthly Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-black text-gray-800 text-[11px] uppercase tracking-widest flex items-center">
            {reportView === 'Whole Year' ? 'Statement of Accounts' : 'Monthly Financial Summary'}
            <span className="ml-3 bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[9px]">
                {reportView === 'Whole Year' ? `${displayEntries.length} RECORDS` : `${monthlyData.length} MONTHS`}
            </span>
          </h3>
          {reportView === 'Whole Year' && (
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Filter Ledger..." 
                    className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] outline-none w-48 font-bold focus:ring-2 focus:ring-blue-50" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          )}
        </div>

        {reportView === 'Whole Year' ? (
            <table className="w-full text-left text-[11px]">
            <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase font-black tracking-widest border-b border-gray-100">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Ref No.</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Balance</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-bold">
                {displayEntries.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center uppercase tracking-[0.3em] font-black text-gray-300">No Entries for {selectedFiscalYear} FY</td></tr>
                ) : (
                displayEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-6 py-4 text-gray-500">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-mono text-gray-400">{entry.docRef}</td>
                    <td className="px-6 py-4 text-gray-700 uppercase tracking-tight">
                        {entry.description}
                    </td>
                    <td className={`px-6 py-4 text-right ${entry.type === 'PAYMENT' ? 'text-emerald-600' : 'text-gray-800'}`}>
                        {entry.type === 'PAYMENT' ? (
                            <span>(CR) {entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        ) : (
                            <span>₹ {entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-[#0854a0]">
                        ₹ {entry.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>
        ) : (
            <table className="w-full text-left text-[11px]">
            <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase font-black tracking-widest border-b border-gray-100">
                <th className="px-6 py-4">Month</th>
                <th className="px-6 py-4 text-right">Revenue (Gross)</th>
                <th className="px-6 py-4 text-right">Tax Collected</th>
                <th className="px-6 py-4 text-right">Payments Recd.</th>
                <th className="px-6 py-4 text-right">Net Cashflow</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-bold">
                {monthlyData.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center uppercase tracking-[0.3em] font-black text-gray-300">No Data for {selectedFiscalYear} FY</td></tr>
                ) : (
                monthlyData.map((m) => (
                    <tr key={m.name} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-6 py-4 font-black uppercase text-gray-800">{m.name}</td>
                    <td className="px-6 py-4 text-right text-gray-600">₹ {m.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right text-blue-600">₹ {m.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right text-emerald-600">₹ {m.collected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className={`px-6 py-4 text-right font-black ${m.collected - m.revenue >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        ₹ {(m.collected - m.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>
        )}
      </div>
    </div>
  );
};

export default Accounts;
