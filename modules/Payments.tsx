
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, PlusCircle, CheckCircle2, Clock, Printer, X, Download, Eye, Search, MessageCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Invoice, Payment, Branch } from '../types';
import { COMPANY_LOGO, COMPANY_NAME, INITIAL_BRANCHES, generateSecureQR } from '../constants';

interface PaymentsProps {
  invoices: Invoice[];
  payments: Payment[];
  branches: Branch[];
  onRecordPayment: (payment: Payment) => void;
}

const Payments: React.FC<PaymentsProps> = ({ invoices, payments, branches, onRecordPayment }) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'Bank Transfer' | 'Cash' | 'Cheque'>('Bank Transfer');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Fallback to initial if branches prop is empty (though App passes it)
  const activeBranches = branches.length > 0 ? branches : INITIAL_BRANCHES;

  const filteredPayments = useMemo(() => {
    return payments.filter(pay => 
      pay.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pay.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pay.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [payments, searchTerm]);

  const getBranchForPayment = (payment: Payment): Branch => {
    const inv = invoices.find(i => i.id === payment.invoiceId);
    return activeBranches.find(b => b.id === inv?.branchId) || activeBranches[0];
  };

  const handleRecord = () => {
    const inv = invoices.find(i => i.id === selectedInvoiceId);
    if (!inv) return alert("Please select a valid invoice.");
    if (!payAmount || Number(payAmount) <= 0) return alert("Please enter a valid payment amount.");
    
    const newPayment: Payment = {
      id: `RCPT-${Date.now().toString().slice(-8)}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      amount: Number(payAmount),
      date: payDate,
      method: payMethod,
      reference: payRef
    };

    onRecordPayment(newPayment);
    setSelectedInvoiceId('');
    setPayAmount('');
    setPayRef('');
    setViewingPayment(newPayment);
  };

  const executePrintAndShare = (shouldShareWhatsApp: boolean) => {
    if (!viewingPayment) return;

    // 1. Change Title for Filename
    const originalTitle = document.title;
    document.title = `${viewingPayment.id}_Receipt`;

    setIsPrinting(true);
    
    // 2. Delay to allow render, then Print
    setTimeout(() => {
      window.print();
      
      // 3. Restore Title & Clean up
      setIsPrinting(false);
      document.title = originalTitle;

      // 4. Open WhatsApp if requested (after print dialog interaction)
      if (shouldShareWhatsApp) {
         const text = `Dear ${viewingPayment.clientName},%0A%0APlease find attached Payment Receipt *${viewingPayment.id}* for Invoice ${viewingPayment.invoiceNumber}.%0A%0A*Amount Paid:* ₹ ${(viewingPayment.amount || 0).toLocaleString('en-IN')}%0A*Reference:* ${viewingPayment.reference || 'N/A'}%0A%0ARegards,%0A${COMPANY_NAME}`;
         // Small delay to ensure browser focus returns or handles the new tab correctly
         setTimeout(() => {
             window.open(`https://wa.me/?text=${text}`, '_blank');
         }, 1000);
      }
    }, 500);
  };

  const handlePrint = () => {
    executePrintAndShare(false);
  };

  const handleWhatsAppShare = () => {
    executePrintAndShare(true);
  };

  const ReceiptDocument = ({ payment }: { payment: Payment }) => {
    const branch = getBranchForPayment(payment);
    const inv = invoices.find(i => i.id === payment.invoiceId);

    const signatureHash = useMemo(() => {
        const raw = `${payment.id}|${payment.amount}|${payment.date}|${payment.reference}|VEDARTHA_SECURE`;
        return btoa(raw).slice(-12).toUpperCase();
    }, [payment]);

    const qrValue = generateSecureQR({
        type: 'RCPT',
        id: payment.id,
        invoiceNumber: payment.invoiceNumber,
        amount: payment.amount,
        date: payment.date,
        clientName: payment.clientName,
        reference: payment.reference,
        method: payment.method
    });

    return (
      <div className="bg-white w-[210mm] min-h-[297mm] p-[20mm] text-[#000000] font-sans flex flex-col relative print:p-[15mm]">
        {/* Header - Sentence Case & Pure Black */}
        <div className="flex justify-between items-start mb-12">
          <div className="w-1/3">
            <img src={COMPANY_LOGO} alt="Logo" className="h-12 object-contain" />
          </div>
          <div className="w-1/3 text-center">
            <h1 className="text-[20px] font-bold inline-block leading-none pb-1">Payment receipt</h1>
          </div>
          <div className="w-1/3 text-right text-[10px] font-medium">
            <p className="mb-1">Receipt id: <span className="text-[12px] font-bold">{payment.id}</span></p>
            <p>{new Date(payment.date).toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* Address Blocks */}
        <div className="grid grid-cols-2 gap-x-20 mb-10 text-[11px] leading-relaxed">
          <div className="space-y-6">
            <div>
              <p className="font-bold mb-1 text-[9px]">Received from</p>
              <div className="border-l-2 border-[#000000] pl-3 space-y-1">
                <p className="text-[13px] font-bold">{payment.clientName}</p>
                <p>Gstin: {inv?.clientGstin || 'Not provided'}</p>
              </div>
            </div>
            <div className="pl-3 opacity-80">
              <p>{branch.address.line1}</p>
              <p>{branch.address.city}, {branch.address.state}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="font-bold mb-1 text-[9px]">Issued by</p>
              <div className="border-l-2 border-[#000000] pl-3 space-y-1">
                <p className="text-[12px] font-bold">{branch.name}</p>
                <p>Gstin: {branch.gstin}</p>
                <p>Pan: {branch.pan}</p>
              </div>
            </div>
            <div className="pl-3 opacity-80">
              <p>Email: {branch.email}</p>
              <p>Contact: {branch.contact}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex justify-between items-end border-b-2 border-[#000000] pb-2 text-[#000000]">
          <div className="text-[14px] font-bold">System copy</div>
          <div className="text-[10px] font-bold">Currency: Inr</div>
        </div>

        {/* Transaction Table */}
        <div className="flex-1">
          <table className="w-full text-[11px] border-collapse text-[#000000]">
            <thead>
              <tr className="border-b-2 border-[#000000] text-left font-bold">
                <th className="py-2 w-16 font-bold">Sr no</th>
                <th className="py-2 font-bold">Description of transaction</th>
                <th className="py-2 text-center w-32 font-bold">Channel</th>
                <th className="py-2 text-right w-36 font-bold">Value cleared</th>
              </tr>
            </thead>
            <tbody className="divide-y border-b-2 border-[#000000]">
              <tr className="align-top">
                <td className="py-6 font-medium">10</td>
                <td className="py-6 space-y-2">
                  <p className="font-bold text-[12px]">Settlement of invoice: {payment.invoiceNumber}</p>
                  <div className="font-medium text-[10px] opacity-60 italic">
                    Acknowledgment of funds received via {payment.method}. Reference: {payment.reference || 'N/A'}.
                  </div>
                </td>
                <td className="py-6 text-center">{payment.method}</td>
                <td className="py-6 text-right font-bold text-[14px]">₹ {(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals & Signature */}
        <div className="mt-auto pt-10 text-[#000000]">
          <div className="flex justify-between items-start">
            <div className="w-1/2 flex items-center space-x-8">
               <div className="p-1 border border-[#000000]">
                  <QRCode value={qrValue} size={150} level="M" fgColor="#000000" />
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] font-bold uppercase">Digital signature</p>
                  <p className="text-[10px] font-mono break-all font-medium">{signatureHash}</p>
               </div>
            </div>
            <div className="w-1/3 text-right space-y-3">
              <div className="flex justify-between text-[11px] border-b border-black pb-1 font-medium">
                <span>Gross value</span>
                <span>{(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[18px] font-bold border-b-4 border-double border-black pb-1">
                <span>Net amount</span>
                <span>₹ {(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="mt-16 border-t border-black pt-4 flex justify-between items-end text-[9px] font-medium text-black">
             <div className="space-y-1">
                <p className="font-bold">{COMPANY_NAME}</p>
                <p>Enterprise system log: {payment.id}</p>
                <p className="italic opacity-60">This is a system generated document.</p>
             </div>
             <div className="text-right">
                <p>Doc ref: Rcpt/fin/001</p>
                <p>Page 01/01</p>
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {isPrinting && viewingPayment && createPortal(<ReceiptDocument payment={viewingPayment} />, document.getElementById('print-portal')!)}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Panel */}
        <div className="bg-white p-10 rounded-[32px] border border-gray-200 shadow-sm h-fit">
          <div className="flex items-center space-x-4 mb-10">
            <div className="p-3 bg-blue-50 text-[#0854a0] rounded-2xl">
              <Receipt size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800 tracking-tight">Clearance terminal</h3>
              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Record inbound settlements</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 ml-1">Invoice selection</label>
              <select className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-xs font-bold outline-none" value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)}>
                <option value="">Choose invoice #</option>
                {invoices.filter(i => i.status !== 'Cancelled').map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.invoiceNumber} - {inv.clientName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 ml-1">Receipt date</label>
              <input type="date" className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-xs font-bold outline-none" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 ml-1">Amount (Inr)</label>
              <input type="number" className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-xs font-bold outline-none" placeholder="0.00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 ml-1">Payment method</label>
              <select className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-xs font-bold outline-none" value={payMethod} onChange={(e) => setPayMethod(e.target.value as any)}>
                <option value="Bank Transfer">Bank Transfer (Neft/Rtgs)</option>
                <option value="Cash">Cash Receipt</option>
                <option value="Cheque">Bank Instrument (Cheque)</option>
              </select>
            </div>
            {/* Added Reference ID Input */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-[11px] font-bold text-gray-500 ml-1">Payment Reference / UTR</label>
              <input 
                type="text" 
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-xs font-bold outline-none" 
                placeholder="Enter Transaction ID, Cheque Number, etc." 
                value={payRef} 
                onChange={(e) => setPayRef(e.target.value)} 
              />
            </div>
          </div>
          
          <button onClick={handleRecord} className="w-full mt-10 h-14 bg-[#0854a0] text-white rounded-2xl text-xs font-bold shadow-xl shadow-blue-100 hover:bg-[#064280] transition-all flex items-center justify-center space-x-3">
            <PlusCircle size={18} />
            <span>Generate Official Receipt</span>
          </button>
        </div>

        {/* Ledger Panel */}
        <div className="bg-white p-10 rounded-[32px] border border-gray-200 shadow-sm flex flex-col min-h-[500px]">
          <div className="flex flex-col space-y-6 mb-10">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-800 tracking-tight">Receipt register</h3>
              <span className="text-[9px] font-bold text-gray-400 uppercase bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">Live ledger</span>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search client or doc id..." className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-white border-b border-gray-100 text-gray-400 font-bold">
                <tr>
                  <th className="py-4">Voucher</th>
                  <th className="py-4">Invoice</th>
                  <th className="py-4 text-right">Settled</th>
                  <th className="py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPayments.map(pay => (
                  <tr key={pay.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="py-5">
                       <div className="flex flex-col">
                          <span className="font-mono font-bold text-[#0854a0]">{pay.id}</span>
                          <span className="text-[10px] font-medium text-gray-400 truncate max-w-[120px]">{pay.clientName}</span>
                       </div>
                    </td>
                    <td className="py-5 font-bold text-gray-600">{pay.invoiceNumber}</td>
                    <td className="py-5 text-right font-bold text-emerald-600">₹ {(pay.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-5 text-right">
                       <button onClick={() => setViewingPayment(pay)} className="p-2 text-blue-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"><Eye size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewingPayment && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-8 backdrop-blur-sm no-print">
          <div className="flex flex-col items-center space-y-4 max-h-screen overflow-y-auto w-full py-10">
            <div className="flex space-x-4 mb-4 bg-white/10 p-4 rounded-3xl border border-white/10 backdrop-blur-md sticky top-0">
               {/* Added WhatsApp Button */}
              <button onClick={handleWhatsAppShare} className="flex items-center px-6 py-3 bg-green-600 text-white rounded-xl text-[11px] font-bold shadow-2xl transition-all hover:bg-green-500">
                <MessageCircle size={18} className="mr-3" /> WhatsApp
              </button>
              <button onClick={handlePrint} className="flex items-center px-8 py-3 bg-[#0854a0] text-white rounded-xl text-[11px] font-bold shadow-2xl transition-all">
                <Printer size={18} className="mr-3" /> Execute print (A4 black)
              </button>
              <button onClick={() => setViewingPayment(null)} className="flex items-center px-6 py-3 bg-white text-gray-800 rounded-xl text-[11px] font-bold shadow-2xl transition-all">
                <X size={18} className="mr-3" /> Exit terminal
              </button>
            </div>
            <div className="shadow-2xl">
              <ReceiptDocument payment={viewingPayment} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
