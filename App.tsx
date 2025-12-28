import React, { useState, useEffect, useMemo } from 'react';
import { Module, Branch, Client, Invoice, Payment, UserProfile, AppNotification, UserRole, Employee, PayrollRecord } from './types';
import { INITIAL_BRANCHES, INITIAL_CLIENTS } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './modules/Dashboard';
import InvoiceList from './modules/InvoiceList';
import InvoiceCreation from './modules/InvoiceCreation';
import Payments from './modules/Payments';
import Clients from './modules/Clients';
import Branches from './modules/Branches';
import Accounts from './modules/Accounts';
import Settings from './modules/Settings';
import Scanner from './modules/Scanner';
import Notifications from './modules/Notifications';
import Payroll from './modules/Payroll';
import Login from './components/Login';
import ClientPortal from './modules/ClientPortal';
import EmployeePortal from './modules/EmployeePortal';

import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  setDoc,
  query,
  where,
  orderBy,
  getDoc,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // Store extended user data (role, branches)
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<Module>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // State managed by Firestore listeners
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  
  const [showCreation, setShowCreation] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Auth Listener (Only for Firebase Auth users, Custom users handled in handleLogin)
  useEffect(() => {
    const restoreSession = async () => {
        // 1. Check LocalStorage for persisted custom session
        const storedUser = localStorage.getItem('vedartha_user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            
            // --- SESSION REFRESH LOGIC ---
            // Instead of blindly using stored data, fetch fresh data from DB using UID
            // This ensures if Employee ID was migrated (834 -> 91), the session gets the new ID
            
            let freshUser = null;

            if (parsedUser.isStaff) {
                // Fetch from 'users' collection
                const userDoc = await getDoc(doc(db, 'users', parsedUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    freshUser = {
                        uid: userDoc.id,
                        email: userData.email,
                        displayName: userData.displayName,
                        role: userData.role,
                        allowedBranchIds: userData.allowedBranchIds || [],
                        isStaff: true,
                        employeeId: userData.employeeId // This will now be the NEW ID
                    };
                }
            } else if (parsedUser.isClient) {
                // Fetch from 'clients'
                const clientDoc = await getDoc(doc(db, 'clients', parsedUser.uid));
                if (clientDoc.exists() && clientDoc.data().portalAccess) {
                    const clientData = clientDoc.data();
                    freshUser = {
                        uid: clientData.id,
                        email: clientData.email,
                        displayName: clientData.name,
                        role: UserRole.CLIENT,
                        clientId: clientData.id,
                        isClient: true
                    };
                }
            } else if (parsedUser.isBranchUser) {
                // Fetch from 'branches'
                const branchDoc = await getDoc(doc(db, 'branches', parsedUser.uid));
                if (branchDoc.exists()) {
                    const branchData = branchDoc.data();
                    freshUser = {
                        uid: branchData.id,
                        email: branchData.email,
                        displayName: `${branchData.name} (Manager)`,
                        role: UserRole.BRANCH_MANAGER,
                        allowedBranchIds: [branchData.id],
                        isBranchUser: true
                    };
                }
            }

            if (freshUser) {
                // Update local storage with fresh data
                localStorage.setItem('vedartha_user', JSON.stringify(freshUser));
                handleLogin(freshUser);
            } else {
                // Session invalid (deleted user or revoked access)
                console.warn("Session expired or invalid, clearing.");
                localStorage.removeItem('vedartha_user');
            }

          } catch (e) {
            console.error("Failed to restore session", e);
            localStorage.removeItem('vedartha_user');
          }
        }
    };

    restoreSession();

    // 2. Standard Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Default Admin Role for Firebase Auth Users
        const mockProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'Administrator',
            role: UserRole.ADMIN, // Firebase Auth logins are implicitly Admins in this setup
            allowedBranchIds: [] 
        };
        setUserProfile(mockProfile);
      } else {
        // If not Firebase Auth, check if we have a manually set user (Custom Staff/Client)
        // If user is null but we set it manually in handleLogin (via localStorage restore), don't reset.
        if (!localStorage.getItem('vedartha_user')) {
             // Only reset if no persistent session found
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); 

  // Data Listeners (Firestore)
  useEffect(() => {
    if (!user) return;

    // Branches Listener
    const unsubBranches = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Branch);
      if (data.length === 0) {
        INITIAL_BRANCHES.forEach(async (b) => {
          await setDoc(doc(db, 'branches', b.id), b);
        });
      } else {
        setBranches(data);
        if (!activeBranchId && data.length > 0) setActiveBranchId(data[0].id);
      }
    });

    // Clients Listener
    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => doc.data() as Client));
    });

    // Invoices Listener
    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      const sorted = snapshot.docs.map(doc => doc.data() as Invoice).sort((a,b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA; // Newest date first
        return b.id.localeCompare(a.id); // Tie-breaker: Newer ID first
      });
      setInvoices(sorted);
    });

    // Payments Listener
    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const sorted = snapshot.docs.map(doc => doc.data() as Payment).sort((a,b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return b.id.localeCompare(a.id);
      });
      setPayments(sorted);
    });
    
    // Notifications Listener
    const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
        const sorted = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as AppNotification)).sort((a,b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA; 
        });
        setNotifications(sorted);
    });

    // Employees Listener
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => doc.data() as Employee));
    });

    // Payroll Records Listener
    const unsubPayroll = onSnapshot(collection(db, 'payroll_records'), (snapshot) => {
      const sorted = snapshot.docs.map(doc => doc.data() as PayrollRecord).sort((a,b) => {
         return new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime();
      });
      setPayrollRecords(sorted);
    });

    return () => {
      unsubBranches();
      unsubClients();
      unsubInvoices();
      unsubPayments();
      unsubNotifications();
      unsubEmployees();
      unsubPayroll();
    };
  }, [user]);

  // Migration Effect for Employee IDs (834... -> 91...)
  useEffect(() => {
      const migrateEmployees = async () => {
          if (!employees.length) return;
          
          // Check if any employee has old format '834'
          const oldEmployees = employees.filter(e => e.id.startsWith('834'));
          
          if (oldEmployees.length > 0) {
              console.log("Migrating employees...");
              const batch = writeBatch(db);
              
              // We need to re-index them starting from 911001
              let counter = 1;
              
              // Find existing '91' series max to avoid collision
              const existingNewSeries = employees.filter(e => e.id.startsWith('91'));
              if (existingNewSeries.length > 0) {
                  const maxId = Math.max(...existingNewSeries.map(e => parseInt(e.id.substring(2))));
                  counter = (maxId - 1000) + 1;
              }

              for (const emp of oldEmployees) {
                  const newId = `91${1000 + counter}`;
                  counter++;
                  
                  // 1. Create new Employee Doc
                  const newEmpData = { ...emp, id: newId };
                  const newEmpRef = doc(db, 'employees', newId);
                  batch.set(newEmpRef, newEmpData);
                  
                  // 2. Delete old Employee Doc
                  const oldEmpRef = doc(db, 'employees', emp.id);
                  batch.delete(oldEmpRef);

                  // 3. Update associated User Account (if exists)
                  const usersQuery = query(collection(db, 'users'), where('employeeId', '==', emp.id));
                  const userSnap = await getDocs(usersQuery);
                  userSnap.forEach(uDoc => {
                      batch.update(uDoc.ref, { 
                          employeeId: newId,
                          email: newId, // Update login ID
                          password: newId // Reset password to new ID for consistency
                      });
                  });

                  // 4. Update associated Payroll Records
                  const payrollQuery = query(collection(db, 'payroll_records'), where('employeeId', '==', emp.id));
                  const paySnap = await getDocs(payrollQuery);
                  paySnap.forEach(pDoc => {
                      batch.update(pDoc.ref, { employeeId: newId });
                  });
              }

              try {
                  await batch.commit();
                  console.log("Employee ID Migration Successful");
              } catch (err) {
                  console.error("Migration Failed", err);
              }
          }
      };

      migrateEmployees();
  }, [employees]);

  const handleLogin = (userObj: any) => {
    setUser(userObj);
    
    if (userObj.isClient) {
        // Client Portal
        setUserProfile({
            uid: userObj.uid,
            email: userObj.email,
            displayName: userObj.displayName,
            role: UserRole.CLIENT,
            allowedBranchIds: [],
            clientId: userObj.clientId
        });
    } else if (userObj.isBranchUser) {
        // Branch Manager (Direct Branch Portal Login)
        setUserProfile({
            uid: userObj.uid,
            email: userObj.email,
            displayName: userObj.displayName,
            role: UserRole.BRANCH_MANAGER,
            allowedBranchIds: userObj.allowedBranchIds || []
        });
        setActiveBranchId(userObj.allowedBranchIds[0]); // Auto-select branch
    } else if (userObj.isStaff) {
        // Custom Staff Login (Admin, Accountant, Employee)
        setUserProfile({
            uid: userObj.uid,
            email: userObj.email,
            displayName: userObj.displayName,
            role: userObj.role,
            allowedBranchIds: userObj.allowedBranchIds || [],
            employeeId: userObj.employeeId
        });
    }
    // Note: Firebase Auth users are handled in useEffect
  };

  const handleLogout = () => {
    signOut(auth);
    localStorage.removeItem('vedartha_user'); // Clear persisted session
    setUser(null);
    setUserProfile(null);
  };

  // Firestore Updates
  const handleUpdateClients = async (newClients: Client[]) => {
    newClients.forEach(async (c) => {
      await setDoc(doc(db, 'clients', c.id), c);
    });
  };
  
  const handleDeleteClient = async (clientId: string) => {
      if(confirm('Are you sure you want to permanently delete this client? This cannot be undone.')) {
          await deleteDoc(doc(db, 'clients', clientId));
      }
  };

  const handleUpdateBranches = (newBranches: Branch[]) => {
    newBranches.forEach(async (b) => {
      await setDoc(doc(db, 'branches', b.id), b);
    });
  };

  const handlePostInvoice = async (invoice: Invoice) => {
    await setDoc(doc(db, 'invoices', invoice.id), invoice);
    const branch = branches.find(b => b.id === invoice.branchId);
    if (branch && !editingInvoice) {
      await updateDoc(doc(db, 'branches', branch.id), {
        nextInvoiceNumber: branch.nextInvoiceNumber + 1
      });
    }
    setEditingInvoice(null);
    setShowCreation(false);
  };

  const handleRecordPayment = async (payment: Payment) => {
    await setDoc(doc(db, 'payments', payment.id), payment);
    await updateDoc(doc(db, 'invoices', payment.invoiceId), {
      status: 'Paid'
    });
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowCreation(true);
  };

  const handleRevoke = async (id: string) => {
    if (confirm("Are you sure you want to revoke this document? It will be marked as Cancelled.")) {
      await updateDoc(doc(db, 'invoices', id), { status: 'Cancelled' });
    }
  };

  const handleAddUser = async (userProfile: Omit<UserProfile, 'uid'>) => {
    // Add to 'users' collection for custom auth
    await addDoc(collection(db, 'users'), userProfile);
  };
  
  const handleClientMessage = async (subject: string, message: string, generatedTicketNumber: string) => {
      if(!user?.isClient) return;
      const currentClient = clients.find(c => c.id === user.clientId);
      const targetBranchId = currentClient?.branchIds[0] || 'B001'; 

      const newNotification: Omit<AppNotification, 'id'> = {
          date: new Date().toISOString(),
          clientId: user.clientId,
          clientName: user.displayName,
          branchId: targetBranchId,
          ticketNumber: generatedTicketNumber,
          subject,
          message,
          status: 'Open',
          archived: false
      };
      
      await addDoc(collection(db, 'notifications'), newNotification);
  };

  const handleCloseTicket = async (ticketId: string) => {
      await updateDoc(doc(db, 'notifications', ticketId), { status: 'Closed' });
  };

  const handleReplyTicket = async (ticketId: string, response: string) => {
      await updateDoc(doc(db, 'notifications', ticketId), { 
          adminResponse: response,
          responseDate: new Date().toISOString(),
          status: 'Closed' 
      });
  };

  const handleRevokeTicket = async (ticketId: string) => {
      if (confirm('Are you sure you want to revoke this ticket? This action cannot be undone.')) {
          await updateDoc(doc(db, 'notifications', ticketId), { status: 'Revoked' }); 
      }
  };

  const handleTicketFeedback = async (ticketId: string, rating: number, feedback: string) => {
      await updateDoc(doc(db, 'notifications', ticketId), { 
          rating,
          feedback 
      });
  };

  const handlePurgeSystem = async () => {
      if (!confirm("CRITICAL WARNING:\n\nThis will PERMANENTLY DELETE all:\n- Invoices\n- Clients\n- Payments\n- Support Tickets\n- Employee & Payroll Data\n\nThis action cannot be undone. Are you sure you want to proceed?")) {
          return;
      }
      if (!confirm("Final Confirmation: Do you really want to wipe the database?")) return;

      setLoading(true);
      try {
          const collections = ['invoices', 'clients', 'payments', 'notifications', 'employees', 'payroll_records', 'users'];
          for (const colName of collections) {
              const q = query(collection(db, colName));
              const snapshot = await getDocs(q);
              const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
              await Promise.all(deletePromises);
          }
          alert("System Purge Complete. All records have been deleted.");
      } catch (error) {
          console.error("Purge failed", error);
          alert("System Purge Failed. Please check console for details.");
      } finally {
          setLoading(false);
      }
  };

  const handleRestoreSystem = async (backupData: any) => {
    if (!confirm("WARNING: You are about to overwrite/merge the current database with this backup.\n\nExisting records with matching IDs will be updated. New records will be added.\n\nAre you sure you want to proceed?")) return;
    setLoading(true);
    try {
      const collections = [
        { key: 'branches', dbName: 'branches' },
        { key: 'clients', dbName: 'clients' },
        { key: 'invoices', dbName: 'invoices' },
        { key: 'payments', dbName: 'payments' },
        { key: 'notifications', dbName: 'notifications' },
        { key: 'employees', dbName: 'employees' },
        { key: 'payroll_records', dbName: 'payroll_records' }
      ];

      for (const col of collections) {
        if (Array.isArray(backupData[col.key])) {
          for (const item of backupData[col.key]) {
            if (item.id) {
               await setDoc(doc(db, col.dbName, item.id), item);
            }
          }
        }
      }
      alert("System Restore Complete.");
    } catch (e) {
      console.error(e);
      alert("Error restoring data.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseFinancialYear = async () => {
    if (!confirm("CLOSE FINANCIAL YEAR & ARCHIVE DATA?\n\nThis action will archive all current data. Proceed?")) return;
    setLoading(true);
    try {
        const collectionsToArchive = ['invoices', 'payments', 'notifications', 'payroll_records'];
        let batch = writeBatch(db);
        let opCount = 0;

        for (const colName of collectionsToArchive) {
             const snapshot = await getDocs(collection(db, colName));
             snapshot.docs.forEach((docSnap) => {
                 const data = docSnap.data();
                 if (data.archived !== true) {
                     batch.update(docSnap.ref, { archived: true });
                     opCount++;
                 }
                 if (opCount >= 450) {
                     batch.commit();
                     batch = writeBatch(db);
                     opCount = 0;
                 }
             });
        }
        if (opCount > 0) await batch.commit();
        alert(`Financial Year Closed Successfully.`);
    } catch(e) {
        console.error(e);
        alert("Error closing financial year.");
    } finally {
        setLoading(false);
    }
  };

  // --- PAYROLL HANDLERS ---
  const handleAddEmployee = async (emp: Employee) => {
    const batch = writeBatch(db);
    
    // 1. Save Employee Record
    const empRef = doc(db, 'employees', emp.id);
    batch.set(empRef, emp);

    // 2. Auto-create User Portal Access
    // Employee Code is Username & Password
    const userRef = doc(collection(db, 'users'));
    batch.set(userRef, {
        uid: userRef.id,
        email: emp.id, 
        password: emp.id, 
        displayName: emp.name,
        role: UserRole.EMPLOYEE,
        allowedBranchIds: [emp.branchId],
        employeeId: emp.id
    });

    await batch.commit();
  };

  const handleUpdateEmployee = async (emp: Employee) => {
    const batch = writeBatch(db);
    
    // 1. Update Employee Record
    batch.set(doc(db, 'employees', emp.id), emp);

    // 2. Sync User Access (Fix for legacy/missing users)
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('employeeId', '==', emp.id));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Update existing user doc
      const userDoc = snapshot.docs[0];
      batch.update(userDoc.ref, {
          displayName: emp.name,
          allowedBranchIds: [emp.branchId],
          role: UserRole.EMPLOYEE
      });
    } else {
      // Create new user doc if missing (Self-healing)
      const newUserRef = doc(collection(db, 'users'));
      batch.set(newUserRef, {
          uid: newUserRef.id,
          email: emp.id,
          password: emp.id, // Default to ID
          displayName: emp.name,
          role: UserRole.EMPLOYEE,
          allowedBranchIds: [emp.branchId],
          employeeId: emp.id
      });
    }

    await batch.commit();
  };

  const handleResetEmployeeAccess = async (emp: Employee) => {
      setLoading(true);
      try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('employeeId', '==', emp.id));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);

          if (!snapshot.empty) {
              // User exists: Reset Password to ID
              const userDoc = snapshot.docs[0];
              batch.update(userDoc.ref, {
                  password: emp.id,
                  email: emp.id // Ensure email (login id) matches ID
              });
          } else {
              // User missing: Create new
              const newUserRef = doc(collection(db, 'users'));
              batch.set(newUserRef, {
                  uid: newUserRef.id,
                  email: emp.id,
                  password: emp.id, 
                  displayName: emp.name,
                  role: UserRole.EMPLOYEE,
                  allowedBranchIds: [emp.branchId],
                  employeeId: emp.id
              });
          }
          await batch.commit();
          alert(`Access Credentials Reset Successfully.\n\nLogin ID: ${emp.id}\nPassword: ${emp.id}`);
      } catch (err) {
          console.error(err);
          alert('Failed to reset access credentials.');
      } finally {
          setLoading(false);
      }
  };

  const handleProcessPayroll = async (records: PayrollRecord[]) => {
    const batch = writeBatch(db);
    records.forEach(rec => {
        const ref = doc(db, 'payroll_records', rec.id);
        batch.set(ref, rec);
    });
    await batch.commit();
  };

  // --- EMPLOYEE SECURITY HANDLERS ---
  const handleEmployeeUpdateCredentials = async (newId: string, newPass: string) => {
      if (!userProfile?.employeeId) return;
      try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('employeeId', '==', userProfile.employeeId));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
              const userDoc = snapshot.docs[0];
              await updateDoc(userDoc.ref, {
                  email: newId,
                  password: newPass
              });
              alert('Credentials updated successfully. Please login with your new ID/Password next time.');
          }
      } catch (err) {
          console.error(err);
          alert('Failed to update credentials.');
      }
  };

  const handleEmployeeLinkGoogle = async () => {
      if (!userProfile?.employeeId) return;
      try {
          const provider = new GoogleAuthProvider();
          // We trigger sign in to get the google account credentials
          const result = await signInWithPopup(auth, provider);
          const googleEmail = result.user.email;

          if (!googleEmail) throw new Error("No email found in Google Account");

          // Link this email to the Custom User Record in Firestore
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('employeeId', '==', userProfile.employeeId));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
              const userDoc = snapshot.docs[0];
              await updateDoc(userDoc.ref, {
                  email: googleEmail
              });
              
              // Also update Employee Record email for consistency
              await updateDoc(doc(db, 'employees', userProfile.employeeId), {
                  email: googleEmail
              });

              alert(`Google Account Linked: ${googleEmail}\n\nYou can now use "Login with Google" on the login screen.`);
          }
      } catch (err: any) {
          console.error(err);
          alert(`Failed to link Google Account: ${err.message}`);
      }
  };

  // --- FILTERED DATA ---
  const activeInvoices = useMemo(() => invoices.filter(i => !i.archived), [invoices]);
  const activePayments = useMemo(() => payments.filter(p => !p.archived), [payments]);
  const activeNotifications = useMemo(() => notifications.filter(n => !n.archived), [notifications]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 text-blue-600 font-bold animate-pulse">Loading Resources...</div>;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // --- ROLE BASED ACCESS LOGIC (MOVED UP) ---
  const currentUserRole = userProfile?.role || UserRole.ADMIN; // Default to Admin for fallback
  const isBranchManager = currentUserRole === UserRole.BRANCH_MANAGER;
  const isAccountant = currentUserRole === UserRole.ACCOUNTANT;
  const isEmployee = currentUserRole === UserRole.EMPLOYEE;
  
  // Branch Managers/Accountants/Employees restricted to specific branches
  const allowedBranches = (isBranchManager || isAccountant || isEmployee) && userProfile?.allowedBranchIds.length 
    ? branches.filter(b => userProfile.allowedBranchIds.includes(b.id)) 
    : branches;

  // --- CLIENT PORTAL ---
  if (user.isClient) {
    const currentClient = clients.find(c => c.id === user.clientId);
    return (
      <ClientPortal 
         user={user}
         clientData={currentClient}
         invoices={invoices} 
         payments={payments} 
         branches={branches}
         notifications={notifications.filter(n => n.clientId === user.clientId)}
         onLogout={handleLogout}
         onSendMessage={handleClientMessage}
         onFeedback={handleTicketFeedback}
         onRevokeTicket={handleRevokeTicket}
      />
    );
  }

  // --- EMPLOYEE PORTAL ---
  if (isEmployee) {
      const empData = employees.find(e => e.id === userProfile?.employeeId);
      return (
          <EmployeePortal 
              employee={empData}
              payrollRecords={payrollRecords.filter(r => r.employeeId === userProfile?.employeeId)}
              branches={allowedBranches}
              onLogout={handleLogout}
              onUpdateCredentials={handleEmployeeUpdateCredentials}
              onLinkGoogle={handleEmployeeLinkGoogle}
          />
      );
  }

  // Branch Managers see tickets for their branch
  const filteredNotifications = isBranchManager 
     ? activeNotifications.filter(n => userProfile?.allowedBranchIds.includes(n.branchId))
     : activeNotifications;

  const renderModule = () => {
    switch (activeModule) {
      case 'Dashboard':
        return (
          <Dashboard 
            invoices={activeInvoices}
            clients={clients} 
            branches={allowedBranches} 
            payments={activePayments}
            onRecordPayment={handleRecordPayment}
          />
        );
      case 'Notifications':
        if (isAccountant) return <div className="p-10 text-center text-gray-400 font-bold">Access Restricted</div>;
        return (
            <Notifications 
                notifications={filteredNotifications} 
                onCloseTicket={handleCloseTicket}
                onReplyTicket={handleReplyTicket}
            />
        );
      case 'Invoices':
        if (showCreation) {
          return (
            <InvoiceCreation 
              branches={allowedBranches} 
              activeBranchId={activeBranchId} 
              clients={clients} 
              initialInvoice={editingInvoice || undefined}
              onPost={handlePostInvoice}
              onCancel={() => {
                setShowCreation(false);
                setEditingInvoice(null);
              }}
            />
          );
        }
        return (
          <InvoiceList 
            invoices={activeInvoices}
            clients={clients}
            branches={allowedBranches}
            onNewInvoice={() => {
              setEditingInvoice(null);
              setShowCreation(true);
            }} 
            onEdit={handleEdit}
            onRevoke={handleRevoke}
          />
        );
      case 'Payments':
        return (
          <Payments 
            invoices={activeInvoices} 
            payments={activePayments} 
            branches={allowedBranches}
            onRecordPayment={handleRecordPayment} 
          />
        );
      case 'Clients':
        return <Clients clients={clients} setClients={handleUpdateClients} branches={allowedBranches} onDeleteClient={handleDeleteClient} />;
      case 'Payroll':
        if (isAccountant) return <div className="p-10 text-center text-gray-400 font-bold">Access Restricted</div>;
        return (
          <Payroll 
            employees={employees}
            payrollRecords={payrollRecords}
            branches={allowedBranches}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onResetAccess={handleResetEmployeeAccess}
            onProcessPayroll={handleProcessPayroll}
          />
        );
      case 'Branches':
        if (isBranchManager || isAccountant) return <div className="p-10 text-center text-gray-400 font-bold">Access Restricted</div>;
        return <Branches branches={branches} setBranches={handleUpdateBranches} />;
      case 'Accounts':
        if (isAccountant) return <div className="p-10 text-center text-gray-400 font-bold">Access Restricted</div>;
        return <Accounts invoices={activeInvoices} payments={activePayments} clients={clients} />;
      case 'Scanner':
        return <Scanner invoices={activeInvoices} payments={activePayments} />;
      case 'Settings':
        if (isBranchManager || isAccountant) return <div className="p-10 text-center text-gray-400 font-bold">Access Restricted</div>;
        return (
          <Settings 
            state={{ invoices, clients, branches, payments, notifications }} 
            onAddUser={handleAddUser}
            onPurgeData={handlePurgeSystem}
            onCloseFinancialYear={handleCloseFinancialYear}
            onRestoreData={handleRestoreSystem} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 font-sans">
      <Sidebar 
        activeModule={activeModule} 
        onModuleChange={(m) => {
          setActiveModule(m);
          setShowCreation(false);
          setEditingInvoice(null);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userRole={currentUserRole}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          branches={allowedBranches}
          activeBranchId={activeBranchId}
          onBranchChange={setActiveBranchId}
          title={activeModule === 'Invoices' ? (showCreation ? (editingInvoice ? 'Edit Document' : 'Create Invoice') : 'Invoice Dashboard') : activeModule}
          onLogout={handleLogout}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        <main className={`flex-1 overflow-y-auto ${(activeModule === 'Invoices' && showCreation) ? 'p-0' : 'p-8'}`}>
          <div className={(activeModule === 'Invoices' && showCreation) ? 'h-full' : 'max-w-7xl mx-auto'}>
            {renderModule()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;