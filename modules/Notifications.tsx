
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Mail, Clock, CheckCircle2, User, Ticket, Star, MessageSquare, Send, Download } from 'lucide-react';
import { AppNotification } from '../types';
import { COMPANY_LOGO, COMPANY_NAME } from '../constants';

interface NotificationsProps {
  notifications: AppNotification[];
  onCloseTicket?: (id: string) => void;
  onReplyTicket?: (id: string, response: string) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ notifications, onCloseTicket, onReplyTicket }) => {
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [printingTicket, setPrintingTicket] = useState<AppNotification | null>(null);

  const handleReplyChange = (id: string, text: string) => {
    setReplyText(prev => ({ ...prev, [id]: text }));
  };

  const submitReply = (id: string) => {
    if (onReplyTicket && replyText[id]) {
      onReplyTicket(id, replyText[id]);
      setReplyText(prev => ({ ...prev, [id]: '' })); // Clear input
    }
  };

  const handlePrint = (ticket: AppNotification) => {
      setPrintingTicket(ticket);
      setTimeout(() => {
          window.print();
          setPrintingTicket(null);
      }, 500);
  };

  const TicketDocument = ({ ticket }: { ticket: AppNotification }) => {
      return (
        <div className="bg-white w-[210mm] min-h-[297mm] p-[20mm] text-[#000000] font-sans flex flex-col relative print:p-[15mm]">
            <div className="flex justify-between items-start mb-12">
                <div className="w-1/3">
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
                    <p className="font-bold text-[12px]">{ticket.clientName}</p>
                    <p className="text-[10px]">ID: {ticket.clientId}</p>
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
                        {ticket.status}
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-8 border-t-2 border-black flex justify-between items-end">
                <div className="text-[9px]">
                    <p className="font-bold">Official Acknowledgement</p>
                    <p>This document serves as proof of your support request.</p>
                </div>
                <div className="text-right text-[9px]">
                    <p>Generated via Admin Console</p>
                    <p>{new Date().toISOString()}</p>
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {printingTicket && createPortal(<TicketDocument ticket={printingTicket} />, document.getElementById('print-portal')!)}

      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
           <h2 className="text-xl font-black text-gray-800 tracking-tight">Support Tickets</h2>
           <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Inbound Client Communications</p>
        </div>
        <div className="bg-blue-50 text-[#0854a0] px-4 py-2 rounded-lg text-xs font-bold">
            {notifications.length} Tickets
        </div>
      </div>

      <div className="grid gap-4">
        {notifications.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                <Mail size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No New Tickets</p>
            </div>
        ) : (
            notifications.map((note) => (
                <div key={note.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 flex flex-col items-end gap-2">
                        <span className={`text-[10px] font-mono px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center ${note.status === 'Closed' ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-600'}`}>
                            <Ticket size={12} className="mr-1" />
                            {note.ticketNumber || 'LEGACY'}
                        </span>
                        <div className="flex space-x-2">
                            <button 
                                onClick={() => handlePrint(note)}
                                className="text-[10px] font-bold text-gray-500 hover:text-[#0854a0] bg-gray-50 hover:bg-blue-50 p-2 rounded-full border border-gray-200 transition-all"
                                title="Download PDF"
                            >
                                <Download size={14} />
                            </button>
                            {note.status !== 'Closed' && onCloseTicket && (
                                <button 
                                    onClick={() => onCloseTicket(note.id)}
                                    className="text-[10px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 hover:border-rose-200 transition-all"
                                >
                                    Close Ticket
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-between items-start mb-4 pr-32">
                        <div className="flex items-center space-x-3">
                            <div className="p-3 bg-blue-50 text-[#0854a0] rounded-xl">
                                <User size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">{note.clientName}</h4>
                                <p className="text-[10px] text-gray-400 font-mono">ID: {note.clientId}</p>
                            </div>
                        </div>
                    </div>
                    <div className="pl-14">
                        <div className="flex items-center text-gray-400 text-[10px] font-bold mb-2">
                            <Clock size={12} className="mr-1" />
                            {new Date(note.date).toLocaleString()}
                        </div>
                        <h5 className="font-bold text-gray-800 text-sm mb-2">{note.subject}</h5>
                        <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                            {note.message}
                        </p>
                        
                        {/* Admin Response Display */}
                        {note.adminResponse && (
                            <div className="mt-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                <div className="flex items-center mb-1">
                                    <span className="text-[10px] font-black text-[#0854a0] uppercase tracking-widest mr-2">Official Response:</span>
                                    <span className="text-[9px] text-gray-400 font-bold">{note.responseDate ? new Date(note.responseDate).toLocaleString() : ''}</span>
                                </div>
                                <p className="text-xs text-gray-700 font-medium">
                                    {note.adminResponse}
                                </p>
                            </div>
                        )}

                        {/* Reply Input Area */}
                        {!note.adminResponse && onReplyTicket && (
                            <div className="mt-4">
                                <textarea 
                                    className="w-full text-xs font-medium p-3 bg-white border-2 border-gray-100 rounded-xl focus:border-[#0854a0] outline-none transition-all placeholder:text-gray-300"
                                    placeholder="Write an official response..."
                                    rows={2}
                                    value={replyText[note.id] || ''}
                                    onChange={(e) => handleReplyChange(note.id, e.target.value)}
                                />
                                {replyText[note.id] && (
                                    <button 
                                        onClick={() => submitReply(note.id)}
                                        className="mt-2 flex items-center px-4 py-2 bg-[#0854a0] text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#064280] transition-all shadow-sm"
                                    >
                                        <Send size={12} className="mr-2" /> Send & Close Ticket
                                    </button>
                                )}
                            </div>
                        )}
                        
                        {/* Feedback Section */}
                        {note.status === 'Closed' && note.rating && (
                            <div className="mt-4 border-t border-gray-50 pt-4">
                                <div className="flex items-center mb-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Client Feedback:</span>
                                    <div className="flex text-amber-400">
                                        {[...Array(note.rating)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                                    </div>
                                </div>
                                {note.feedback && (
                                    <p className="text-xs text-gray-500 italic flex items-start">
                                        <MessageSquare size={12} className="mr-2 mt-0.5 opacity-50" />
                                        "{note.feedback}"
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="mt-4 pl-14 flex items-center justify-end">
                       <span className={`text-[10px] font-bold px-3 py-1 rounded-full flex items-center ${note.status === 'Closed' ? 'text-gray-500 bg-gray-100' : 'text-emerald-600 bg-emerald-50'}`}>
                          <CheckCircle2 size={12} className="mr-1" /> {note.status}
                       </span>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
