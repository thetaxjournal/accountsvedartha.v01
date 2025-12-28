
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, Receipt, Download, Clock, CheckCircle2, AlertCircle, LogOut, Printer, X, ScanLine, MessageCircle, Send, Mail, Ticket, Star, ThumbsUp, ArrowLeft, Plus, Ban
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Invoice, Payment, Client, Branch, AppNotification } from '../types';
import { LOGO_DARK_BG, COMPANY_NAME, INITIAL_BRANCHES, generateSecureQR, COMPANY_LOGO, APP_CONFIG } from '../constants';
import Scanner from './Scanner';

interface ClientPortalProps {
  user: any;
  clientData: Client | undefined;
  invoices: Invoice[];
  payments: Payment[];
  branches: Branch[];
  notifications?: AppNotification[]; 
  onPayInvoice?: (invoiceId: string, amount: number) => Promise<Payment | undefined>;
  onLogout: () => void;
  onSendMessage: (subject: string, message: string, generatedTicketNumber: string) => Promise<void>;
  onFeedback: (ticketId: string, rating: number, feedback: string) => Promise<void>;
  onRevokeTicket: (ticketId: string) => Promise<void>;
}

const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    return '';
  };

  let str = '';
  const crores = Math.floor(num / 10000000);
  num %= 10000000;
  const lakhs = Math.floor(num / 100000);
  num %= 100000;
  const thousands = Math.floor(num / 1000);
  num %= 1000;
  const remaining = Math.floor(num);

  if (crores > 0) str += convert(crores) + ' crore ';
  if (lakhs > 0) str += convert(lakhs) + ' lakh ';
  if (thousands > 0) str += convert(thousands) + ' thousand ';
  if (remaining > 0) str += (str !== '' ? '' : '') + convert(remaining);

  return 'Rupees ' + str.trim() + ' only';
};

const ClientPortal: React.FC<ClientPortalProps> = ({ user, clientData, invoices, payments, branches, notifications = [], onLogout, onSendMessage, onFeedback, onRevokeTicket }) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'scanner' | 'tickets'>('invoices');
  const [viewingReceipt, setViewingReceipt] = useState<Payment | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null); // New State for Invoice
  const [viewingTicket, setViewingTicket] = useState<AppNotification | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Message State
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  
  // Ticket View Mode: 'list' (History), 'new' (Form), 'success' (Post-submit)
  const [ticketMode, setTicketMode] = useState<'list' | 'new' | 'success'>('list');
  const [lastSubmittedTicket, setLastSubmittedTicket] = useState<AppNotification | null>(null);

  // Feedback State
  const [feedbackTicketId, setFeedbackTicketId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  // Fallback to initial if branches prop is empty
  const activeBranches = branches.length > 0 ? branches : INITIAL_BRANCHES;

  // Filter for this specific client and Sort by Date Descending
  const myInvoices = useMemo(() => {
    return invoices
      .filter(inv => inv.clientId === user.clientId)
      .sort((a,b) => {
         const dateA = new Date(a.date).getTime();
         const dateB = new Date(b.date).getTime();
         if (dateB !== dateA) return dateB - dateA;
         return b.id.localeCompare(a.id);
      });
  }, [invoices, user.clientId]);

  const myPayments = useMemo(() => {
    return payments
      .filter(pay => pay.invoiceNumber.startsWith('VED') && myInvoices.some(inv => inv.id === pay.invoiceId))
      .sort((a,b) => {
         const dateA = new Date(a.date).getTime();
         const dateB = new Date(b.date).getTime();
         if (dateB !== dateA) return dateB - dateA;
         return b.id.localeCompare(a.id);
      });
  }, [payments, myInvoices]);

  const myTickets = useMemo(() => {
    return notifications
      .filter(n => n.status !== 'Revoked') // Hide revoked tickets from main view
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notifications]);

  // Determine effective ticket mode (Force 'new' if no history)
  const effectiveTicketMode = myTickets.length === 0 && ticketMode === 'list' ? 'new' : ticketMode;

  const handlePrint = (shouldShareWhatsApp: boolean = false) => {
    if (!viewingReceipt && !viewingInvoice) return;

    const originalTitle = document.title;
    
    if (viewingInvoice) {
        document.title = `${viewingInvoice.invoiceNumber}_Tax_Invoice`;
    } else if (viewingReceipt) {
        document.title = `${viewingReceipt.id}_Receipt`;
    }
    
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      document.title = originalTitle;

      if (shouldShareWhatsApp) {
         let text = '';
         if (viewingReceipt) {
             text = `Dear Team,%0A%0AI have downloaded the Receipt *${viewingReceipt.id}* for Invoice ${viewingReceipt.invoiceNumber}.%0A%0A*Amount:* ₹ ${(viewingReceipt.amount || 0).toLocaleString('en-IN')}%0A%0AThanks.`;
         } else if (viewingInvoice) {
             text = `Dear Team,%0A%0AI have downloaded the Invoice *${viewingInvoice.invoiceNumber}*.%0A%0A*Amount:* ₹ ${(viewingInvoice.grandTotal || 0).toLocaleString('en-IN')}%0A%0AThanks.`;
         }
         setTimeout(() => {
             window.open(`https://wa.me/?text=${text}`, '_blank');
         }, 1000);
      }
    }, 500);
  };

  const handleTicketPrint = (ticketOverride?: AppNotification) => {
      const ticketToPrint = ticketOverride || viewingTicket;
      if (!ticketToPrint) return;
      
      // If called with an override (from list), set it as viewing so portal renders correct data
      if (ticketOverride) setViewingTicket(ticketOverride);

      const originalTitle = document.title;
      document.title = `${ticketToPrint.ticketNumber || 'TKT'}_Details`;
      setIsPrinting(true);
      setTimeout(() => {
          window.print();
          setIsPrinting(false);
          document.title = originalTitle;
          // Only clear if it was an override, if we are in success view ('viewingTicket' matches) keep it
          if (ticketOverride) setViewingTicket(null);
      }, 500);
  };

  const handleSend = async () => {
     if(!msgSubject || !msgBody) return alert("Please fill subject and message.");
     setMsgSending(true);
     
     // Generate Ticket Number on Client Side for immediate PDF availability
     const generatedTicketNumber = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
     const timestamp = new Date().toISOString();

     await onSendMessage(msgSubject, msgBody, generatedTicketNumber);
     
     const ticketObj: any = {
         id: 'NEW', 
         date: timestamp,
         subject: msgSubject,
         message: msgBody,
         ticketNumber: generatedTicketNumber,
         clientId: user.clientId,
         clientName: user.displayName,
         branchId: '', 
         status: 'Open'
     };

     setMsgSending(false);
     setMsgSubject('');
     setMsgBody('');
     
     setLastSubmittedTicket(ticketObj);
     setViewingTicket(ticketObj); // Prepare for potential print
     setTicketMode('success');
  };

  const submitFeedback = async () => {
      if (!feedbackTicketId || rating === 0) return;
      await onFeedback(feedbackTicketId, rating, feedbackText);
      setFeedbackTicketId(null);
      setRating(0);
      setFeedbackText('');
  };

  const totalOutstanding = myInvoices.filter(i => i.status === 'Posted').reduce((acc, i) => acc + (i.grandTotal || 0), 0);
  const lastPayment = myPayments.length > 0 ? myPayments[0] : null;

  const InvoiceDocument = ({ invoice }: { invoice: Invoice }) => {
    const activeBranch = activeBranches.find(b => b.id === invoice.branchId) || activeBranches[0];
    const selectedClient = clientData; // Use prop or invoice metadata if undefined

    // Fallback if clientData is somehow undefined but invoice exists
    const clientName = invoice.clientName;
    const clientGstin = invoice.clientGstin;

    const placeOfSupply = invoice.placeOfSupply || activeBranch.address.state;
    const isInterState = activeBranch.address.state.trim().toLowerCase() !== placeOfSupply.trim().toLowerCase();

    // Branch specific bank details
    const bankName = activeBranch?.bankDetails?.bankName || APP_CONFIG.bankDetails?.bankName || 'N/A';
    const bankAddress = activeBranch?.bankDetails?.branchName || APP_CONFIG.bankDetails?.branchName || 'N/A';
    const bankAccount = activeBranch?.bankDetails?.accountNumber || APP_CONFIG.bankDetails?.accountNumber || 'N/A';
    const bankIfsc = activeBranch?.bankDetails?.ifscCode || APP_CONFIG.bankDetails?.ifscCode || 'N/A';
    
    return (
    <div className="flex flex-col text-[#000000]">
      {/* PAGE 1: MAIN INVOICE (A4) */}
      <div 
        id="invoice-render-p1" 
        className="bg-white w-[210mm] min-h-[297mm] p-[15mm] relative text-[#000000] font-sans overflow-hidden flex flex-col"
        style={{ pageBreakAfter: 'always' }}
      >
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4 shrink-0">
          <div className="flex flex-col">
            <img src={COMPANY_LOGO} alt="Logo" className="h-[50px] object-contain mb-1" />
          </div>
          <div className="text-right text-[10px] leading-[1.3] text-[#000000] max-w-[340px] font-medium">
            <p className="font-bold">{activeBranch?.name}</p>
            <p>{activeBranch?.address.line1}, {activeBranch?.address.line2}</p>
            <p>{activeBranch?.address.city} - {activeBranch?.address.pincode}</p>
            <p>{activeBranch?.address.state}, India</p>
            <p className="mt-1">Tel : {activeBranch?.contact}</p>
          </div>
        </div>

        <div className="border-b-[1.5px] border-[#000000] mb-3 pb-1 shrink-0">
          <h1 className="text-[16px] font-bold tracking-tight">Tax invoice - Original for recipient</h1>
        </div>

        <div className="grid grid-cols-2 gap-x-12 mb-8 text-[11px] leading-[1.4] shrink-0">
          <div className="space-y-[2px]">
            <div className="flex items-start"><span className="w-32 font-bold shrink-0">Invoice no.</span><span className="w-4 shrink-0 text-center">:</span><span className="font-bold">{invoice.invoiceNumber}</span></div>
            <div className="flex items-start pt-2"><span className="w-32 font-bold shrink-0">Kind attn.</span><span className="w-4 shrink-0 text-center">:</span><span className="font-medium">{invoice.kindAttn}</span></div>
            <div className="flex items-start pt-1">
              <span className="w-32 font-bold shrink-0">Mailing address</span>
              <span className="w-4 shrink-0 text-center">:</span>
              <div className="flex-1 font-medium leading-[1.3]">
                {clientName}<br/>
                {selectedClient?.billingAddress.line1 || 'Address on file'}, {selectedClient?.billingAddress.line2},<br/>
                {selectedClient?.billingAddress.city} {selectedClient?.billingAddress.pincode}, {selectedClient?.billingAddress.state}, India.
              </div>
            </div>
          </div>
          <div className="space-y-[2px]">
            <div className="flex items-start"><span className="w-32 font-bold shrink-0">Date</span><span className="w-4 shrink-0 text-center">:</span><span className="font-medium">{new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
            <div className="flex items-start pt-2"><span className="w-32 font-bold shrink-0">Client name</span><span className="w-4 shrink-0 text-center">:</span><span className="font-bold">{clientName}</span></div>
            <div className="flex items-start pt-1">
              <span className="w-32 font-bold shrink-0">Address</span>
              <span className="w-4 shrink-0 text-center">:</span>
              <div className="flex-1 font-medium leading-[1.3]">
                 {selectedClient?.billingAddress.line1 || 'Address on file'}, {selectedClient?.billingAddress.line2},<br/>
                 {selectedClient?.billingAddress.city} {selectedClient?.billingAddress.pincode}, {selectedClient?.billingAddress.state}, India.
              </div>
            </div>
            <div className="flex items-start pt-1"><span className="w-32 font-bold shrink-0">Place of supply</span><span className="w-4 shrink-0 text-center">:</span><span>{placeOfSupply}</span></div>
            <div className="flex items-start pt-1"><span className="w-32 font-bold shrink-0">Gstin/Unique id</span><span className="w-4 shrink-0 text-center">:</span><span className="font-bold tracking-tight">{clientGstin}</span></div>
          </div>
        </div>

        <div className="border-t-[1.5px] border-b-[1.5px] border-[#000000] shrink-0 mt-2">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-[#000000] font-bold text-[#000000]">
                <th className="text-left py-1.5 pl-1 font-bold">Particulars</th>
                <th className="text-right py-1.5 pr-1 w-40 font-bold">Amount (Inr)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} className="align-top border-b border-black/10 last:border-0 text-[#000000]">
                  <td className="py-3 pl-1 pr-6 whitespace-pre-wrap leading-relaxed font-medium">
                    <div className="flex items-start">
                      <span className="w-8 shrink-0">{i+1}.</span>
                      <div className="flex-1">{item.description}</div>
                    </div>
                  </td>
                  <td className="py-3 text-right pr-1 font-bold">{(item.rate * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4 text-[11px] shrink-0 text-[#000000]">
          <div className="w-72 space-y-1">
            <div className="flex justify-between items-center"><span className="font-bold">Amount</span><span className="w-36 flex justify-between"><span>:</span><span>{(invoice.subTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
            
            {isInterState ? (
                <div className="flex justify-between items-center"><span className="font-bold">IGST @ 18.00 %</span><span className="w-36 flex justify-between"><span>:</span><span>{(invoice.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
            ) : (
                <>
                    <div className="flex justify-between items-center"><span className="font-bold">CGST @ 9.00 %</span><span className="w-36 flex justify-between"><span>:</span><span>{((invoice.taxAmount || 0)/2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
                    <div className="flex justify-between items-center"><span className="font-bold">SGST @ 9.00 %</span><span className="w-36 flex justify-between"><span>:</span><span>{((invoice.taxAmount || 0)/2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
                </>
            )}

            <div className="h-[1px] bg-[#000000] my-1"></div>
            <div className="flex justify-between font-bold text-[14px]">
              <span className="font-bold">Gross amount</span>
              <span className="w-36 flex justify-between">
                <span>:</span>
                <span className="font-bold">{(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
            <div className="h-[0.5px] bg-[#000000] mt-0.5"></div>
          </div>
        </div>

        <div className="mt-4 text-[11px] font-bold text-[#000000] shrink-0">
          {numberToWords(invoice.grandTotal || 0)}
        </div>

        <div className="mt-6 border-t-[1.5px] border-b-[1.5px] border-[#000000] py-3 grid grid-cols-2 gap-x-12 text-[10px] leading-[1.4] text-[#000000] shrink-0">
          <div className="space-y-1">
            <div className="flex"><span className="w-36 font-bold">Pan number</span><span className="w-4 text-center">:</span><span className="font-bold">{activeBranch?.pan}</span></div>
            <div className="flex"><span className="w-36 font-bold align-top">Hsn code & description</span><span className="w-4 text-center align-top">:</span>
              <span className="flex-1 font-medium leading-tight">{invoice.items[0]?.hsnCode}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex"><span className="w-44 font-bold">Gstin of supplier</span><span className="w-4 text-center">:</span><span className="font-bold">{activeBranch?.gstin}</span></div>
            <div className="flex"><span className="w-44 font-bold align-top">Principal place of business</span><span className="w-4 text-center align-top">:</span>
              <div className="flex-1 font-medium leading-tight">
                {activeBranch?.address.line1}, {activeBranch?.address.city} Urban, {activeBranch?.address.state} - {activeBranch?.address.pincode}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col pt-8">
          <div className="flex justify-between items-end mb-6">
            <div className="shrink-0">
              <QRCode 
                value={generateSecureQR({
                    type: 'INV',
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    clientName: clientName,
                    clientGstin: clientGstin,
                    date: invoice.date,
                    grandTotal: invoice.grandTotal,
                    status: invoice.status
                })} 
                size={160} 
                level="M" 
                fgColor="#000000" 
              />
            </div>

            <div className="text-right flex flex-col items-end">
              <p className="text-[10px] font-bold text-[#000000] mb-1">For Vedartha International Limited</p>
              <div className="text-right space-y-1">
                 <div className="relative w-64 h-16 border-b border-dotted border-[#000000]"></div>
                 <div className="pt-2">
                   <p className="text-[11px] font-bold">Authorized signatory</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-4 border-t border-black/10 text-[#000000]">
            <div className="text-[9px] font-medium leading-tight opacity-70">
              <p>Branch office: {activeBranch?.address.line1}, {activeBranch?.address.city}, {activeBranch?.address.state} - {activeBranch?.address.pincode}</p>
              <p className="italic text-[8.5px] mt-1">{activeBranch?.name} is part of Vedartha International Limited Group.</p>
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 2 */}
      <div 
        id="invoice-render-p2" 
        className="bg-white w-[210mm] min-h-[297mm] p-[15mm] relative text-[#000000] font-sans overflow-hidden flex flex-col"
        style={{ pageBreakBefore: 'always' }}
      >
        <div className="flex justify-between items-start mb-8 shrink-0">
          <div className="flex flex-col">
            <img src={COMPANY_LOGO} alt="Logo" className="h-[50px] object-contain mb-1" />
          </div>
          <div className="text-right text-[10px] leading-[1.3] text-[#000000] max-w-[340px] font-medium">
            <p className="font-bold">{activeBranch?.name}</p>
            <p>{activeBranch?.address.line1}</p>
            <p>{activeBranch?.address.city} - {activeBranch?.address.pincode}</p>
          </div>
        </div>

        <div className="border-b-[1.5px] border-[#000000] mb-4 pb-1 shrink-0">
          <h1 className="text-[16px] font-bold tracking-tight">Tax invoice - Terms & conditions</h1>
        </div>

        <div className="border border-[#000000] p-3 grid grid-cols-2 text-[11px] font-bold mb-10 text-[#000000]">
          <div className="flex"><span className="w-24">Invoice no.</span><span className="px-2">:</span><span>{invoice.invoiceNumber}</span></div>
          <div className="flex"><span className="w-24">Date</span><span className="px-2">:</span><span>{new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
        </div>

        <div className="space-y-6 text-[11px] leading-[1.7] text-[#000000] text-justify">
          <p>
            a) This bill is payable by electronic transfer/ dd/ cheque in favor of <span className="font-bold">{activeBranch?.name}</span>. Please make payment within 15 days of receipt of this invoice.
          </p>
          <div className="space-y-1">
            <p>b) Bank details : <span className="font-bold">{bankName}, {bankAddress}</span></p>
            <p className="font-bold border-l-2 border-[#000000] pl-4 py-2 mt-2 bg-gray-50/50">
              Account number: {bankAccount}, Rtgs ifsc code: {bankIfsc}
            </p>
          </div>
          <p>
            c) For payment made by electronic fund transfer, please send details to <span className="font-bold underline">receipt@vedartha.com</span> quoting invoice number <span className="font-bold">{invoice.invoiceNumber}</span>.
          </p>
        </div>

        <div className="mt-auto flex flex-col pt-6 border-t border-black/10">
          <div className="text-[9px] font-medium opacity-70">
             <p>Branch office: {activeBranch?.address.line1}, {activeBranch?.address.city}, {activeBranch?.address.state} - {activeBranch?.address.pincode}</p>
          </div>
          <div className="flex justify-end mt-2">
            <span className="text-[10px] font-medium">Page 2</span>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const TicketDocument = ({ ticket }: { ticket: AppNotification }) => {
      return (
        <div className="bg-white w-[210mm] min-h-[297mm] p-[20mm] text-[#000000] font-sans flex flex-col relative print:p-[15mm]">
            <div className="flex justify-between items-start mb-12">
                <div className="w-1/3">
                    {/* Updated to use COMPANY_LOGO for consistency with invoices */}
                    <img src={COMPANY_LOGO} alt="Logo" className="h-14 object-contain" />
                </div>
                <div className="w-1/3 text-center">
                    <h1 className="text-[20px] font-bold inline-block leading-none pb-1">Support Ticket</h1>
                </div>
                <div className="w-1/3 text-right text-[10px] font-medium">
                    <p className="mb-1">Ticket #: <span className="text-[14px] font-bold">{ticket.ticketNumber}</span></p>
                    <p>{new Date(ticket.date).toLocaleString('en-GB')}</p>
                </div>
            </div>

            <div className="mb-10 grid grid-cols-2 gap-10 border-b-2 border-black pb-6">
                <div>
                    <p className="text-[9px] font-bold uppercase mb-1">Client Details</p>
                    <p className="font-bold text-[12px]">{user.displayName}</p>
                    <p className="text-[10px]">ID: {user.clientId}</p>
                    <p className="text-[10px]">{user.email}</p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-bold uppercase mb-1">Issued To</p>
                    <p className="font-bold text-[12px]">{COMPANY_NAME}</p>
                    <p className="text-[10px]">Support Department</p>
                </div>
            </div>

            <div className="flex-1 space-y-8">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 border-b border-black/20 pb-1">Subject</p>
                    <div className="text-[14px] font-bold">
                        {ticket.subject}
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 border-b border-black/20 pb-1">Description of Issue</p>
                    <div className="text-[12px] whitespace-pre-wrap leading-relaxed">
                        {ticket.message}
                    </div>
                </div>
                
                {ticket.adminResponse && (
                    <div className="mt-8 border-t-2 border-black pt-6">
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#0854a0]">Official Response</p>
                        <div className="bg-gray-50 p-4 border-l-4 border-[#0854a0] text-[11px] font-medium leading-relaxed">
                            {ticket.adminResponse}
                        </div>
                        <div className="text-right text-[9px] mt-2 font-bold opacity-60">
                            Responded on: {ticket.responseDate ? new Date(ticket.responseDate).toLocaleString('en-GB') : 'N/A'}
                        </div>
                    </div>
                )}

                <div className="mt-8">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 border-b border-black/20 pb-1">Status</p>
                    <div className="text-[12px] font-bold uppercase">
                        {ticket.status === 'Closed' ? 'Resolved & Closed' : ticket.status}
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-8 border-t-2 border-black flex justify-between items-end">
                <div className="text-[9px]">
                    <p className="font-bold">Official Acknowledgement</p>
                    <p>This document serves as proof of your support request.</p>
                </div>
                <div className="text-right text-[9px]">
                    <p>Generated via Client Portal</p>
                    <p>{new Date().toISOString()}</p>
                </div>
            </div>
        </div>
      );
  };

  const ReceiptDocument = ({ payment }: { payment: Payment }) => {
    const inv = invoices.find(i => i.id === payment.invoiceId);
    const branch = activeBranches.find(b => b.id === inv?.branchId) || activeBranches[0];

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
            <img src={LOGO_DARK_BG} alt="Logo" className="h-14 object-contain invert brightness-0" />
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
    <div className="min-h-screen bg-[#f3f4f7] font-sans">
      {/* Hidden Portal for Print */}
      {isPrinting && viewingReceipt && createPortal(<ReceiptDocument payment={viewingReceipt} />, document.getElementById('print-portal')!)}
      {isPrinting && viewingInvoice && createPortal(<InvoiceDocument invoice={viewingInvoice} />, document.getElementById('print-portal')!)}
      {isPrinting && viewingTicket && createPortal(<TicketDocument ticket={viewingTicket} />, document.getElementById('print-portal')!)}

      {/* Client Header */}
      <header className="bg-[#1c2d3d] text-white py-4 px-4 md:px-8 shadow-lg">
         <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
               <img src={LOGO_DARK_BG} alt="Logo" className="h-10 md:h-14 object-contain" />
               <div className="h-8 w-[1px] bg-white/20 hidden md:block"></div>
               <div>
                  <h1 className="text-sm md:text-lg font-bold tracking-tight">Client Portal</h1>
                  <p className="text-[10px] text-gray-400 font-medium hidden md:block">Welcome, {user.displayName}</p>
                  <p className="text-[10px] text-blue-300 font-mono mt-0.5 hidden md:block">ID: {user.clientId}</p>
               </div>
            </div>
            <button onClick={onLogout} className="flex items-center text-xs font-bold bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-all">
               <LogOut size={14} className="mr-2" /> <span className="hidden md:inline">Sign Out</span>
            </button>
         </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
         {/* Stats Cards */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Outstanding Balance</p>
               <h2 className="text-3xl font-black text-[#0854a0] mt-2">₹ {totalOutstanding.toLocaleString('en-IN')}</h2>
               <div className="mt-4 flex items-center text-xs font-bold text-amber-600">
                  <AlertCircle size={14} className="mr-1" /> Action Required
               </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hidden md:block">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Payment</p>
               <h2 className="text-3xl font-black text-emerald-600 mt-2">
                  {lastPayment ? `₹ ${(lastPayment.amount || 0).toLocaleString('en-IN')}` : '---'}
               </h2>
               <p className="mt-4 text-xs font-bold text-gray-500">
                  {lastPayment ? `On ${new Date(lastPayment.date).toLocaleDateString()}` : 'No history'}
               </p>
            </div>
            <div className="bg-[#0854a0] p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
               <div className="relative z-10">
                  <h3 className="font-bold text-lg">Need Assistance?</h3>
                  <p className="text-xs text-blue-100 mt-1">Contact your relationship manager for billing queries.</p>
                  <button onClick={() => setActiveTab('tickets')} className="mt-6 bg-white text-[#0854a0] px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-colors">
                     Raise a Ticket
                  </button>
               </div>
            </div>
         </div>

         {/* Main Content Area */}
         <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
            <div className="flex border-b border-gray-100 overflow-x-auto custom-scrollbar">
               <button 
                  onClick={() => setActiveTab('invoices')}
                  className={`flex-1 min-w-[150px] py-5 text-center text-sm font-bold border-b-2 transition-all shrink-0 ${activeTab === 'invoices' ? 'border-[#0854a0] text-[#0854a0] bg-blue-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
               >
                  Invoices & Due Items
               </button>
               <button 
                  onClick={() => setActiveTab('payments')}
                  className={`flex-1 min-w-[150px] py-5 text-center text-sm font-bold border-b-2 transition-all shrink-0 ${activeTab === 'payments' ? 'border-[#0854a0] text-[#0854a0] bg-blue-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
               >
                  Payment History & Receipts
               </button>
               <button 
                  onClick={() => setActiveTab('scanner')}
                  className={`flex-1 min-w-[150px] py-5 text-center text-sm font-bold border-b-2 transition-all shrink-0 ${activeTab === 'scanner' ? 'border-[#0854a0] text-[#0854a0] bg-blue-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
               >
                  <ScanLine size={16} className="inline mr-2" /> Verify Documents
               </button>
               <button 
                  onClick={() => setActiveTab('tickets')}
                  className={`flex-1 min-w-[150px] py-5 text-center text-sm font-bold border-b-2 transition-all shrink-0 ${activeTab === 'tickets' ? 'border-[#0854a0] text-[#0854a0] bg-blue-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
               >
                  <Ticket size={16} className="inline mr-2" /> Support Tickets
               </button>
            </div>

            <div className="p-4 md:p-8">
               {activeTab === 'invoices' && (
                  <div className="space-y-4">
                     {myInvoices.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">No invoices found.</div>
                     ) : (
                        myInvoices.map(inv => (
                           <div key={inv.id} className="border border-gray-100 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between hover:shadow-md transition-all group gap-4">
                              {/* Mobile Optimized View */}
                              <div className="flex md:hidden justify-between items-start w-full">
                                  <div>
                                      <h4 className="font-bold text-gray-900 text-lg">{inv.invoiceNumber}</h4>
                                      <p className="text-xs text-gray-500 mt-1">Due: {new Date(inv.date).toLocaleDateString()}</p>
                                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase mt-2 inline-block ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                          {inv.status}
                                      </span>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-lg font-black text-gray-900">₹ {(inv.grandTotal || 0).toLocaleString('en-IN')}</p>
                                      <button 
                                        onClick={() => setViewingInvoice(inv)}
                                        className="text-[#0854a0] bg-blue-50 p-2 rounded-lg mt-2 inline-block"
                                      >
                                        <Download size={20} />
                                      </button>
                                  </div>
                              </div>

                              {/* Desktop View */}
                              <div className="hidden md:flex items-center space-x-6">
                                 <div className={`p-4 rounded-xl ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                    <FileText size={24} />
                                 </div>
                                 <div>
                                    <div className="flex items-center space-x-3">
                                       <h4 className="font-bold text-gray-900">{inv.invoiceNumber}</h4>
                                       <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                          {inv.status}
                                       </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Due Date: {new Date(inv.date).toLocaleDateString()}</p>
                                 </div>
                              </div>
                              <div className="hidden md:flex items-center justify-between md:justify-end md:space-x-8 w-full md:w-auto">
                                 <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Amount</p>
                                    <p className="text-lg font-black text-gray-900">₹ {(inv.grandTotal || 0).toLocaleString('en-IN')}</p>
                                 </div>
                                 <div className="flex space-x-2">
                                     <button 
                                        onClick={() => setViewingInvoice(inv)}
                                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                        title="Download Invoice PDF"
                                     >
                                        <Download size={20} />
                                     </button>
                                 </div>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               )}

               {activeTab === 'payments' && (
                  <div className="space-y-4">
                     {myPayments.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">No payment history found.</div>
                     ) : (
                        myPayments.map(pay => (
                           <div key={pay.id} className="border border-gray-100 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between hover:shadow-md transition-all gap-4">
                              {/* Mobile Optimized View */}
                              <div className="flex md:hidden justify-between items-start w-full">
                                  <div>
                                      <h4 className="font-bold text-gray-900 text-sm break-all">{pay.id}</h4>
                                      <p className="text-xs text-gray-500 mt-1">{pay.method}</p>
                                      <p className="text-[10px] text-gray-400 mt-1">{new Date(pay.date).toLocaleDateString()}</p>
                                  </div>
                                  <div className="text-right pl-4">
                                      <p className="text-lg font-black text-gray-900">₹ {(pay.amount || 0).toLocaleString('en-IN')}</p>
                                      <button onClick={() => setViewingReceipt(pay)} className="text-blue-600 bg-blue-50 p-2 rounded-lg mt-2 inline-block">
                                        <Download size={18} />
                                      </button>
                                  </div>
                              </div>

                              {/* Desktop View */}
                              <div className="hidden md:flex items-center space-x-6">
                                 <div className="p-4 rounded-xl bg-purple-50 text-purple-600">
                                    <Receipt size={24} />
                                 </div>
                                 <div>
                                    <h4 className="font-bold text-gray-900">{pay.id}</h4>
                                    <p className="text-xs text-gray-500 mt-1">Paid via {pay.method} on {pay.date}</p>
                                 </div>
                              </div>
                              <div className="hidden md:flex items-center justify-between md:justify-end md:space-x-8 w-full md:w-auto">
                                 <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Amount Paid</p>
                                    <p className="text-lg font-black text-gray-900">₹ {(pay.amount || 0).toLocaleString('en-IN')}</p>
                                 </div>
                                 <button onClick={() => setViewingReceipt(pay)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Download Receipt">
                                    <Download size={20} />
                                 </button>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               )}

               {activeTab === 'scanner' && (
                  <div className="py-8">
                     <Scanner invoices={invoices} payments={payments} />
                  </div>
               )}
               
               {/* Tickets logic remains same */}
               {activeTab === 'tickets' && (
                   <div className="max-w-5xl mx-auto py-4">
                       {/* 1. Ticket List View */}
                       {effectiveTicketMode === 'list' && (
                           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-800 tracking-tight">Support Tickets</h3>
                                        <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-widest">History & Status</p>
                                    </div>
                                    <button 
                                        onClick={() => setTicketMode('new')}
                                        className="flex items-center px-4 md:px-8 py-3 bg-[#0854a0] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#064280] shadow-xl shadow-blue-100 transition-all active:scale-95"
                                    >
                                        <Plus size={16} className="mr-2" /> <span className="hidden md:inline">Raise New Ticket</span> <span className="md:hidden">New</span>
                                    </button>
                                </div>
                                {/* ... rest of ticket list ... */}
                                <div className="grid gap-4">
                                    {myTickets.map(ticket => (
                                        <div key={ticket.id} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <span className="bg-blue-50 text-[#0854a0] text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">
                                                        {ticket.ticketNumber || 'TKT-000'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400">
                                                        {new Date(ticket.date).toLocaleDateString()}
                                                    </span>
                                                    <div className={`flex items-center ${ticket.status === 'Closed' ? 'text-emerald-600' : 'text-amber-500'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${ticket.status === 'Closed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest">{ticket.status}</span>
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-base text-gray-800 mb-1">{ticket.subject}</h4>
                                                <p className="text-xs text-gray-500 line-clamp-1 max-w-xl">{ticket.message}</p>
                                                {/* Show response snippet in list if resolved */}
                                                {ticket.adminResponse && (
                                                    <div className="mt-2 p-3 bg-blue-50/50 rounded-lg border border-blue-50">
                                                        <p className="text-[10px] font-black text-[#0854a0] uppercase tracking-widest mb-1">Response</p>
                                                        <p className="text-[11px] text-gray-700 font-medium">{ticket.adminResponse}</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center space-x-4 justify-end">
                                                {ticket.status === 'Closed' && !ticket.rating && (
                                                    <button 
                                                        onClick={() => setFeedbackTicketId(ticket.id)}
                                                        className="text-[10px] font-bold text-[#0854a0] hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors flex items-center"
                                                    >
                                                        <Star size={12} className="mr-1" /> Rate Support
                                                    </button>
                                                )}
                                                {ticket.rating && (
                                                    <div className="flex text-amber-400">
                                                        {[...Array(ticket.rating)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                                                    </div>
                                                )}
                                                {ticket.status === 'Open' && (
                                                    <button 
                                                        onClick={() => onRevokeTicket(ticket.id)}
                                                        className="text-[10px] font-bold text-rose-500 hover:text-white hover:bg-rose-500 px-3 py-2 rounded-lg transition-colors border border-rose-100"
                                                        title="Revoke Ticket"
                                                    >
                                                        Revoke
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleTicketPrint(ticket)}
                                                    className="p-3 bg-gray-50 text-gray-600 hover:text-[#0854a0] hover:bg-blue-50 rounded-xl transition-all"
                                                    title="Download Ticket PDF"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                           </div>
                       )}

                       {/* 2. New Ticket Form */}
                       {effectiveTicketMode === 'new' && (
                           <div className="max-w-2xl mx-auto bg-white p-10 rounded-[32px] shadow-sm border border-gray-200 animate-in zoom-in-95 duration-300">
                               <div className="mb-8 flex items-center justify-between">
                                   <div>
                                       <h3 className="text-xl font-black text-gray-800 tracking-tight">Compose Ticket</h3>
                                       <p className="text-xs text-gray-400 font-bold mt-1">Describe your issue in detail</p>
                                   </div>
                                   {myTickets.length > 0 && (
                                       <button 
                                           onClick={() => setTicketMode('list')}
                                           className="p-3 text-gray-400 hover:bg-gray-50 rounded-full transition-all"
                                       >
                                           <X size={20} />
                                       </button>
                                   )}
                               </div>

                               <div className="space-y-6">
                                   <div className="space-y-2">
                                       <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject</label>
                                       <input 
                                          type="text" 
                                          className="w-full border-2 border-gray-100 rounded-2xl px-6 py-4 font-bold text-sm focus:border-[#0854a0] outline-none transition-all"
                                          placeholder="e.g. Invoice #1234 Discrepancy"
                                          value={msgSubject}
                                          onChange={(e) => setMsgSubject(e.target.value)}
                                       />
                                   </div>
                                   <div className="space-y-2">
                                       <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Detailed Description</label>
                                       <textarea 
                                          className="w-full border-2 border-gray-100 rounded-2xl px-6 py-4 font-medium text-sm focus:border-[#0854a0] outline-none min-h-[180px] resize-none transition-all"
                                          placeholder="Please provide specific details..."
                                          value={msgBody}
                                          onChange={(e) => setMsgBody(e.target.value)}
                                       />
                                   </div>
                                   <div className="flex gap-4 pt-4">
                                       {myTickets.length > 0 && (
                                           <button 
                                                onClick={() => setTicketMode('list')}
                                                className="flex-1 py-4 border-2 border-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all"
                                           >
                                                Cancel
                                           </button>
                                       )}
                                       <button 
                                            onClick={handleSend} 
                                            disabled={msgSending}
                                            className="flex-1 bg-[#0854a0] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#064280] shadow-xl shadow-blue-100 transition-all disabled:opacity-50 flex items-center justify-center"
                                       >
                                            {msgSending ? 'Submitting...' : <><Send size={16} className="mr-2" /> Submit Ticket</>}
                                       </button>
                                   </div>
                               </div>
                           </div>
                       )}

                       {/* 3. Success View */}
                       {effectiveTicketMode === 'success' && (
                           <div className="max-w-xl mx-auto flex flex-col items-center justify-center bg-white p-12 rounded-[40px] shadow-2xl border border-emerald-100 animate-in zoom-in duration-500 text-center">
                               <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-8 animate-bounce shadow-lg shadow-emerald-100">
                                   <CheckCircle2 size={48} />
                               </div>
                               <h4 className="text-[#1c2d3d] font-black text-2xl mb-2 tracking-tight">Ticket Submitted!</h4>
                               <p className="text-gray-500 text-sm font-medium mb-8 max-w-xs mx-auto leading-relaxed">
                                   Your request has been logged. Ticket ID <span className="font-mono font-bold text-emerald-600">{lastSubmittedTicket?.ticketNumber}</span> has been generated.
                               </p>
                               <div className="space-y-4 w-full">
                                   <button 
                                        onClick={() => handleTicketPrint(lastSubmittedTicket as AppNotification)}
                                        className="w-full bg-[#0854a0] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#064280] shadow-lg flex items-center justify-center transition-all hover:scale-[1.02]"
                                   >
                                        <Download size={16} className="mr-2" /> Download Ticket PDF
                                   </button>
                                   <div className="grid grid-cols-2 gap-4">
                                       <button 
                                            onClick={() => { setTicketMode('new'); setLastSubmittedTicket(null); }}
                                            className="w-full bg-emerald-50 text-emerald-700 border border-emerald-100 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-100 flex items-center justify-center transition-all"
                                       >
                                            Raise Another
                                       </button>
                                       <button 
                                            onClick={() => { setTicketMode('list'); setLastSubmittedTicket(null); }}
                                            className="w-full bg-gray-50 text-gray-600 border border-gray-100 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 flex items-center justify-center transition-all"
                                       >
                                            Back to History
                                       </button>
                                   </div>
                               </div>
                           </div>
                       )}
                   </div>
               )}
            </div>
         </div>
      </main>

      {/* Feedback Modal */}
      {feedbackTicketId && (
          <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
                  <div className="text-center mb-6">
                      <div className="inline-flex p-3 bg-blue-50 rounded-full text-[#0854a0] mb-4">
                          <ThumbsUp size={32} />
                      </div>
                      <h3 className="text-xl font-black text-gray-800">Support Feedback</h3>
                      <p className="text-xs text-gray-500 mt-1">How would you rate your experience with this ticket?</p>
                  </div>
                  
                  <div className="flex justify-center space-x-2 mb-6">
                      {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                              key={star}
                              onClick={() => setRating(star)}
                              className={`p-2 transition-all transform hover:scale-110 ${rating >= star ? 'text-amber-400' : 'text-gray-200'}`}
                          >
                              <Star size={32} fill={rating >= star ? "currentColor" : "none"} />
                          </button>
                      ))}
                  </div>
                  
                  <div className="space-y-4">
                      <textarea 
                          className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:border-[#0854a0] outline-none min-h-[100px] resize-none"
                          placeholder="Any comments? (Optional)"
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                      />
                      <div className="flex space-x-4">
                          <button 
                              onClick={() => setFeedbackTicketId(null)}
                              className="flex-1 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={submitFeedback}
                              disabled={rating === 0}
                              className="flex-1 py-3 bg-[#0854a0] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#064280] shadow-lg disabled:opacity-50"
                          >
                              Submit
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-8 backdrop-blur-sm no-print">
          <div className="flex flex-col items-center space-y-4 max-h-screen overflow-y-auto w-full py-10">
            <div className="flex space-x-4 mb-4 bg-white/10 p-4 rounded-3xl border border-white/10 backdrop-blur-md sticky top-0">
               {/* WhatsApp Button */}
               <button onClick={() => handlePrint(true)} className="flex items-center px-6 py-3 bg-green-600 text-white rounded-xl text-[11px] font-bold shadow-2xl transition-all hover:bg-green-500">
                 <MessageCircle size={18} className="mr-3" /> WhatsApp
               </button>
              <button onClick={() => handlePrint(false)} className="flex items-center px-8 py-3 bg-[#0854a0] text-white rounded-xl text-[11px] font-bold shadow-2xl transition-all">
                <Printer size={18} className="mr-3" /> Execute print (A4 black)
              </button>
              <button onClick={() => setViewingReceipt(null)} className="flex items-center px-6 py-3 bg-white text-gray-800 rounded-xl text-[11px] font-bold shadow-2xl transition-all">
                <X size={18} className="mr-3" /> Exit
              </button>
            </div>
            <div className="shadow-2xl">
              <ReceiptDocument payment={viewingReceipt} />
            </div>
          </div>
        </div>
      )}

      {viewingInvoice && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-8 backdrop-blur-sm no-print">
          <div className="flex flex-col items-center space-y-4 max-h-screen overflow-y-auto w-full py-10">
            <div className="flex space-x-4 mb-4 bg-white/10 p-4 rounded-3xl border border-white/10 backdrop-blur-md sticky top-0">
               {/* WhatsApp Button */}
               <button onClick={() => handlePrint(true)} className="flex items-center px-6 py-3 bg-green-600 text-white rounded-xl text-[11px] font-bold shadow-2xl transition-all hover:bg-green-500">
                 <MessageCircle size={18} className="mr-3" /> WhatsApp
               </button>
              <button onClick={() => handlePrint(false)} className="flex items-center px-8 py-3 bg-[#0854a0] text-white rounded-xl text-[11px] font-bold shadow-2xl transition-all">
                <Printer size={18} className="mr-3" /> Execute print (A4 black)
              </button>
              <button onClick={() => setViewingInvoice(null)} className="flex items-center px-6 py-3 bg-white text-gray-800 rounded-xl text-[11px] font-bold shadow-2xl transition-all">
                <X size={18} className="mr-3" /> Exit
              </button>
            </div>
            <div className="shadow-2xl origin-top transform transition-transform duration-300 scale-90">
              <InvoiceDocument invoice={viewingInvoice} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPortal;
