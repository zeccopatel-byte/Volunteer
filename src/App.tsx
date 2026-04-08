import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, ClipboardList, MessageSquare, ShieldCheck, 
  CheckCircle2, Circle, Calendar,
  Briefcase, Bell, Lock, LogOut, ChevronRight, Instagram, Menu, X, Download
} from 'lucide-react';
import { db, auth } from './firebase';
import { collection, getDocs, addDoc, updateDoc, doc, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore';

// --- Types ---
type Role = {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'filled';
};

type Application = {
  id: string;
  roleId: string;
  name: string;
  contact: string;
  whyMe: string;
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected';
  notes: string;
};

type Task = {
  id: string;
  volunteerName: string;
  roleId: string;
  description: string;
  deadline: string;
  done: boolean;
};

type Notice = {
  id: string;
  message: string;
  date: string;
};

const INITIAL_ROLES: Role[] = [
  { id: '1', title: 'Social Media', description: 'Passion for community, arts & culture, finds cool templates.', status: 'open' },
  { id: '2', title: 'Events Manager', description: 'Has done community events, accountable, fun attitude.', status: 'open' },
  { id: '3', title: 'Graphic Designer / Canva Ninja', description: 'Creative over trained.', status: 'open' },
];

// --- Main App Component ---
export default function App() {
  const [view, setView] = useState<'dashboard' | 'apply' | 'admin' | 'tasks'>('dashboard');
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [applications, setApplications] = useState<Application[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load from Firebase
  useEffect(() => {
    const unsubRoles = onSnapshot(collection(db, 'roles'), (snapshot) => {
      if (!snapshot.empty) {
        setRoles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role)));
      }
    });

    const unsubApps = isAdmin ? onSnapshot(collection(db, 'applications'), (snapshot) => {
      setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application)));
    }) : () => {};

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    const qNotices = query(collection(db, 'notices'), orderBy('date', 'desc'));
    const unsubNotices = onSnapshot(qNotices, (snapshot) => {
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));
    });

    return () => {
      unsubRoles();
      unsubApps();
      unsubTasks();
      unsubNotices();
    };
  }, [isAdmin]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === 'Arts77') {
      setIsAdmin(true);
      setPinInput('');
    } else {
      console.error('Incorrect PIN');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setView('dashboard');
  };

  const exportApplicationsToCSV = () => {
    if (applications.length === 0) return;

    const headers = ['Name', 'Contact', 'Role', 'Status', 'Why Me', 'Notes'];
    const csvRows = [
      headers.join(','),
      ...applications.map(app => {
        const roleTitle = roles.find(r => r.id === app.roleId)?.title || 'Unknown';
        return [
          `"${app.name.replace(/"/g, '""')}"`,
          `"${app.contact.replace(/"/g, '""')}"`,
          `"${roleTitle.replace(/"/g, '""')}"`,
          `"${app.status.replace(/"/g, '""')}"`,
          `"${app.whyMe.replace(/"/g, '""')}"`,
          `"${(app.notes || '').replace(/"/g, '""')}"`
        ].join(',');
      })
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CIAF_Applications_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newApp = {
      roleId: formData.get('roleId') as string,
      name: formData.get('name') as string,
      contact: formData.get('contact') as string,
      whyMe: formData.get('whyMe') as string,
      status: 'pending',
      notes: ''
    };
    
    try {
      await addDoc(collection(db, 'applications'), newApp);
      setApplicationSubmitted(true);
    } catch (err) {
      console.error("Failed to submit application:", err);
    }
  };

  return (
    <div className="min-h-screen bg-fest-bg text-fest-text font-body overflow-hidden flex flex-col relative">
      {/* Top Navigation */}
      <header className="relative z-50 flex items-center justify-between px-6 py-5 stitch-border-b bg-fest-bg/90 backdrop-blur-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="w-10 h-10 bg-fest-red rounded-sm flex items-center justify-center shadow-sm stitch-border border-fest-red/50">
            <Users className="text-fest-bg" size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-display font-bold text-fest-red tracking-widest uppercase leading-none">Chicago Indian</span>
            <span className="font-script text-fest-blue text-lg leading-none mt-1">Arts Festival</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-2">
            <button 
              onClick={() => setView('dashboard')}
              className={`px-4 py-2 text-sm font-display tracking-wider uppercase transition-all ${view === 'dashboard' ? 'stitch-border bg-fest-card text-fest-red' : 'text-fest-text/70 hover:text-fest-red'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setView('tasks')}
              className={`px-4 py-2 text-sm font-display tracking-wider uppercase transition-all ${view === 'tasks' ? 'stitch-border bg-fest-card text-fest-red' : 'text-fest-text/70 hover:text-fest-red'}`}
            >
              Tasks
            </button>
            <button 
              onClick={() => setView('admin')}
              className={`px-4 py-2 text-sm font-display tracking-wider uppercase transition-all ${view === 'admin' ? 'stitch-border bg-fest-card text-fest-red' : 'text-fest-text/70 hover:text-fest-red'}`}
            >
              Admin
            </button>
          </nav>
          
          <div className="flex items-center gap-4">
            <a 
              href="https://www.instagram.com/chicagoindianarts/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-fest-red hover:text-fest-red/80 transition-colors flex items-center gap-2"
              title="Follow us on Instagram"
            >
              <Instagram size={20} />
              <span className="hidden sm:inline text-xs font-display uppercase tracking-widest">Instagram</span>
            </a>
            {isAdmin && (
              <button onClick={handleLogout} className="hidden md:flex items-center gap-2 text-fest-red hover:text-fest-red/80 font-display uppercase tracking-widest text-sm">
                <LogOut size={18} /> Lock
              </button>
            )}
            <button 
              className="md:hidden text-fest-red hover:text-fest-red/80 transition-colors ml-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-[80px] left-0 w-full bg-fest-bg/95 backdrop-blur-md border-b border-fest-red/20 shadow-lg z-40 md:hidden flex flex-col p-6 gap-4"
          >
            <button 
              onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}
              className={`text-left px-4 py-3 text-lg font-display tracking-wider uppercase transition-all ${view === 'dashboard' ? 'bg-fest-card text-fest-red stitch-border' : 'text-fest-text hover:text-fest-red'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => { setView('tasks'); setIsMobileMenuOpen(false); }}
              className={`text-left px-4 py-3 text-lg font-display tracking-wider uppercase transition-all ${view === 'tasks' ? 'bg-fest-card text-fest-red stitch-border' : 'text-fest-text hover:text-fest-red'}`}
            >
              Tasks
            </button>
            <button 
              onClick={() => { setView('admin'); setIsMobileMenuOpen(false); }}
              className={`text-left px-4 py-3 text-lg font-display tracking-wider uppercase transition-all ${view === 'admin' ? 'bg-fest-card text-fest-red stitch-border' : 'text-fest-text hover:text-fest-red'}`}
            >
              Admin
            </button>
            {isAdmin && (
              <button 
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} 
                className="text-left px-4 py-3 text-lg font-display tracking-wider uppercase text-fest-red hover:text-fest-red/80 transition-all flex items-center gap-2 mt-4 border-t border-fest-red/20 pt-6"
              >
                <LogOut size={20} /> Lock (Logout)
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 overflow-y-auto p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          
          {/* Notice Board */}
          {notices.length > 0 && view !== 'admin' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10 bg-fest-card p-5 flex items-start gap-4 shadow-sm stitch-border relative"
            >
              {/* Decorative corner stitches */}
              <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-fest-red opacity-50"></div>
              <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-fest-red opacity-50"></div>
              <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-fest-red opacity-50"></div>
              <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-fest-red opacity-50"></div>

              <Bell className="text-fest-red mt-1 flex-shrink-0" size={24} />
              <div>
                <h3 className="text-fest-red font-display uppercase tracking-widest text-lg mb-1">Notice Board</h3>
                <div className="space-y-2">
                  {notices.map(n => (
                    <p key={n.id} className="text-fest-text font-body italic">{n.message}</p>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-10"
              >
                <div className="text-center mb-12">
                  <h1 className="text-5xl md:text-6xl font-display font-bold text-fest-text tracking-wider uppercase mb-2">Open Roles</h1>
                  <p className="font-script text-3xl md:text-4xl text-fest-blue">Join our community</p>
                  <div className="flex justify-center mt-6">
                    <div className="w-24 border-b-2 border-dashed border-fest-red"></div>
                    <span className="mx-4 text-fest-gold">✤</span>
                    <div className="w-24 border-b-2 border-dashed border-fest-red"></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {roles.map((role) => (
                    <div key={role.id} className="bg-fest-card p-8 flex flex-col shadow-sm stitch-border relative group hover:-translate-y-1 transition-transform duration-300">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-fest-bg rounded-full flex items-center justify-center stitch-border">
                          <Briefcase className="text-fest-blue" size={22} />
                        </div>
                        <span className={`px-3 py-1 text-xs font-display uppercase tracking-widest stitch-border ${
                          role.status === 'open' ? 'bg-fest-green/10 text-fest-green border-fest-green/40' :
                          role.status === 'in-progress' ? 'bg-fest-gold/10 text-fest-gold border-fest-gold/40' :
                          'bg-fest-border/20 text-fest-border border-fest-border/40'
                        }`}>
                          {role.status}
                        </span>
                      </div>
                      <h3 className="text-2xl font-display font-bold text-fest-text uppercase tracking-wide mb-3">{role.title}</h3>
                      <p className="text-fest-text/80 font-body mb-8 flex-1 leading-relaxed">{role.description}</p>
                      
                      <button 
                        onClick={() => {
                          setSelectedRoleId(role.id);
                          setApplicationSubmitted(false);
                          setView('apply');
                        }}
                        disabled={role.status === 'filled'}
                        className={`w-full py-3 font-display uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 stitch-border ${
                          role.status === 'filled' 
                            ? 'bg-fest-bg text-fest-border cursor-not-allowed' 
                            : 'bg-fest-red text-fest-bg hover:bg-fest-red/90 border-fest-red'
                        }`}
                      >
                        {role.status === 'filled' ? 'Position Filled' : 'Apply Now'}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {view === 'apply' && (
              <motion.div 
                key="apply"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto"
              >
                <button onClick={() => setView('dashboard')} className="text-fest-blue hover:text-fest-red mb-8 flex items-center gap-2 font-display uppercase tracking-widest text-sm transition-colors">
                  <ChevronRight className="rotate-180" size={18} /> Back to Roles
                </button>
                
                <div className="bg-fest-card p-10 shadow-sm stitch-border relative">
                  <div className="text-center mb-8">
                    <h2 className="text-4xl font-display font-bold text-fest-text uppercase tracking-wider mb-2">Volunteer Application</h2>
                    <p className="font-script text-2xl text-fest-red">Stories woven in thread</p>
                  </div>

                  {applicationSubmitted ? (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-fest-green/10 rounded-full flex items-center justify-center mx-auto mb-6 stitch-border border-fest-green/50">
                        <CheckCircle2 className="text-fest-green" size={32} />
                      </div>
                      <h3 className="text-2xl font-display font-bold text-fest-text uppercase tracking-widest mb-4">Thank you</h3>
                      <p className="text-fest-text font-body text-lg">Admin will get back to you.</p>
                      <button 
                        onClick={() => setView('dashboard')}
                        className="mt-8 bg-fest-blue text-fest-bg font-display uppercase tracking-widest px-8 py-3 hover:bg-fest-blue/90 transition-colors stitch-border border-fest-blue"
                      >
                        Return to Dashboard
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApply} className="space-y-6">
                      <div>
                        <label className="block font-display uppercase tracking-widest text-fest-text text-sm mb-2">Select Role</label>
                        <select 
                          name="roleId" 
                          defaultValue={selectedRoleId}
                          required
                          className="w-full bg-fest-bg stitch-border px-4 py-3 text-fest-text focus:outline-none focus:border-fest-red transition-colors appearance-none font-body"
                        >
                          <option value="" disabled>Select a role...</option>
                          {roles.filter(r => r.status !== 'filled').map(r => (
                            <option key={r.id} value={r.id}>{r.title}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block font-display uppercase tracking-widest text-fest-text text-sm mb-2">Full Name</label>
                        <input 
                          type="text" 
                          name="name" 
                          required
                          placeholder="Jane Doe"
                          className="w-full bg-fest-bg stitch-border px-4 py-3 text-fest-text focus:outline-none focus:border-fest-red transition-colors font-body placeholder-fest-border"
                        />
                      </div>

                      <div>
                        <label className="block font-display uppercase tracking-widest text-fest-text text-sm mb-2">Contact Info (Email or Phone)</label>
                        <input 
                          type="text" 
                          name="contact" 
                          required
                          placeholder="jane@example.com"
                          className="w-full bg-fest-bg stitch-border px-4 py-3 text-fest-text focus:outline-none focus:border-fest-red transition-colors font-body placeholder-fest-border"
                        />
                      </div>

                      <div>
                        <label className="block font-display uppercase tracking-widest text-fest-text text-sm mb-2">Why Me?</label>
                        <textarea 
                          name="whyMe" 
                          required
                          rows={4}
                          placeholder="Tell us why you'd be a great fit for this role..."
                          className="w-full bg-fest-bg stitch-border px-4 py-3 text-fest-text focus:outline-none focus:border-fest-red transition-colors font-body placeholder-fest-border resize-none"
                        />
                      </div>

                      <button type="submit" className="w-full bg-fest-blue text-fest-bg font-display uppercase tracking-widest py-4 hover:bg-fest-blue/90 transition-colors mt-4 stitch-border border-fest-blue">
                        Submit Application
                      </button>
                    </form>
                  )}
                </div>
              </motion.div>
            )}

            {view === 'tasks' && (
              <motion.div 
                key="tasks"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-12">
                  <h1 className="text-5xl md:text-6xl font-display font-bold text-fest-text tracking-wider uppercase mb-2">Volunteer Tasks</h1>
                  <p className="font-script text-3xl md:text-4xl text-fest-blue">Threads of memory</p>
                  <div className="flex justify-center mt-6">
                    <div className="w-24 border-b-2 border-dashed border-fest-red"></div>
                    <span className="mx-4 text-fest-gold">✤</span>
                    <div className="w-24 border-b-2 border-dashed border-fest-red"></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tasks.length === 0 ? (
                    <div className="col-span-full text-center py-16 text-fest-text/60 bg-fest-card stitch-border font-body italic">
                      No tasks assigned yet. The canvas is blank.
                    </div>
                  ) : (
                    tasks.map(task => (
                      <div key={task.id} className={`bg-fest-card p-6 shadow-sm stitch-border transition-all ${task.done ? 'opacity-60 grayscale-[0.3]' : ''}`}>
                        <div className="flex justify-between items-start mb-4">
                          <span className="px-3 py-1 bg-fest-bg text-fest-text stitch-border text-xs font-display uppercase tracking-widest">
                            {roles.find(r => r.id === task.roleId)?.title || 'Unknown Role'}
                          </span>
                          <button 
                            onClick={async () => {
                              const updatedStatus = !task.done;
                              try {
                                await updateDoc(doc(db, 'tasks', task.id), { done: updatedStatus });
                              } catch (err) {
                                console.error("Failed to update task:", err);
                              }
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors stitch-border ${task.done ? 'bg-fest-green text-fest-bg border-fest-green' : 'bg-fest-bg text-fest-border hover:text-fest-red'}`}
                          >
                            {task.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                        </div>
                        <h3 className="text-xl font-display font-bold text-fest-text mb-2">{task.description}</h3>
                        <p className="text-fest-text/70 font-body text-sm mb-5">Assigned to: <span className="text-fest-text font-semibold">{task.volunteerName}</span></p>
                        
                        <div className="flex items-center gap-2 text-sm font-display uppercase tracking-widest text-fest-red bg-fest-red/10 px-3 py-1.5 w-fit">
                          <Calendar size={16} />
                          {task.deadline}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {view === 'admin' && (
              <motion.div 
                key="admin"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                {!isAdmin ? (
                  <div className="max-w-sm mx-auto mt-20 bg-fest-card p-10 shadow-sm stitch-border text-center">
                    <div className="w-16 h-16 bg-fest-bg rounded-full flex items-center justify-center mx-auto mb-6 stitch-border">
                      <Lock className="text-fest-red" size={28} />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-fest-text uppercase tracking-widest mb-2">Admin Access</h2>
                    <p className="font-script text-xl text-fest-blue mb-8">Enter the secret thread</p>
                    <form onSubmit={handleAdminLogin}>
                      <input 
                        type="password" 
                        value={pinInput}
                        onChange={e => setPinInput(e.target.value)}
                        placeholder="PIN"
                        className="w-full bg-fest-bg stitch-border px-4 py-3 text-fest-text text-center tracking-[0.5em] font-display text-xl focus:outline-none focus:border-fest-red mb-6 transition-colors"
                      />
                      <button type="submit" className="w-full bg-fest-red text-fest-bg font-display uppercase tracking-widest py-3 hover:bg-fest-red/90 transition-colors stitch-border border-fest-red">
                        Unlock
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-10">
                    <div className="flex justify-between items-center mb-6 stitch-border-b pb-6">
                      <div>
                        <h1 className="text-4xl font-display font-bold text-fest-text uppercase tracking-wider">Admin Dashboard</h1>
                        <p className="font-script text-2xl text-fest-blue mt-1">Manage the festival threads</p>
                      </div>
                      <button onClick={() => setIsAdmin(false)} className="flex items-center gap-2 text-fest-red hover:text-fest-red/80 font-display uppercase tracking-widest text-sm transition-colors">
                        <LogOut size={18} /> Lock
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Applications Column */}
                      <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-display font-bold text-fest-text uppercase tracking-widest flex items-center gap-3">
                            <ClipboardList size={24} className="text-fest-red" /> Applications
                          </h2>
                          {applications.length > 0 && (
                            <button 
                              onClick={exportApplicationsToCSV}
                              className="flex items-center gap-2 bg-fest-blue text-fest-bg px-4 py-2 text-xs font-display uppercase tracking-widest hover:bg-fest-blue/90 transition-colors stitch-border border-fest-blue"
                            >
                              <Download size={16} /> Export CSV
                            </button>
                          )}
                        </div>
                        <div className="space-y-6">
                          {applications.length === 0 ? (
                            <div className="text-fest-text/60 bg-fest-card p-10 stitch-border text-center font-body italic">No applications yet.</div>
                          ) : (
                            applications.map(app => (
                              <div key={app.id} className="bg-fest-card p-6 shadow-sm stitch-border">
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <h3 className="text-2xl font-display font-bold text-fest-text uppercase">{app.name}</h3>
                                    <p className="text-fest-text/70 font-body">{app.contact}</p>
                                  </div>
                                  <select 
                                    value={app.status}
                                    onChange={async (e) => {
                                      const newStatus = e.target.value;
                                      try {
                                        await updateDoc(doc(db, 'applications', app.id), { status: newStatus });
                                      } catch (err) {
                                        console.error("Failed to update application status:", err);
                                      }
                                    }}
                                    className={`bg-fest-bg stitch-border px-3 py-2 font-display uppercase tracking-widest text-xs focus:outline-none appearance-none ${
                                      app.status === 'accepted' ? 'text-fest-green border-fest-green/50' :
                                      app.status === 'shortlisted' ? 'text-fest-gold border-fest-gold/50' :
                                      app.status === 'rejected' ? 'text-fest-red border-fest-red/50' : 'text-fest-text'
                                    }`}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="shortlisted">Shortlisted</option>
                                    <option value="accepted">Accepted</option>
                                    <option value="rejected">Rejected</option>
                                  </select>
                                </div>
                                <div className="mb-4">
                                  <span className="text-xs text-fest-border uppercase tracking-widest font-display">Applied for:</span>
                                  <span className="ml-2 text-sm font-display uppercase tracking-widest text-fest-blue bg-fest-blue/10 px-2 py-1 stitch-border border-fest-blue/30">
                                    {roles.find(r => r.id === app.roleId)?.title}
                                  </span>
                                </div>
                                <div className="bg-fest-bg stitch-border p-4 mb-5">
                                  <p className="text-fest-text font-body italic leading-relaxed">"{app.whyMe}"</p>
                                </div>
                                <div>
                                  <input 
                                    type="text" 
                                    placeholder="Add internal notes..."
                                    value={app.notes}
                                    onChange={(e) => {
                                      setApplications(applications.map(a => a.id === app.id ? { ...a, notes: e.target.value } : a));
                                    }}
                                    onBlur={async (e) => {
                                      try {
                                        await updateDoc(doc(db, 'applications', app.id), { notes: e.target.value });
                                      } catch (err) {
                                        console.error("Failed to update notes:", err);
                                      }
                                    }}
                                    className="w-full bg-transparent stitch-border-b px-2 py-2 text-sm text-fest-text focus:outline-none focus:border-fest-red placeholder-fest-border font-body transition-colors"
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Side Panel: Roles & Notices & Tasks */}
                      <div className="space-y-8">
                        {/* Manage Roles */}
                        <div className="bg-fest-card p-6 shadow-sm stitch-border">
                          <h2 className="text-xl font-display font-bold text-fest-text uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ShieldCheck size={22} className="text-fest-blue"/> Role Status
                          </h2>
                          <div className="space-y-3">
                            {roles.map(role => (
                              <div key={role.id} className="flex items-center justify-between bg-fest-bg p-3 stitch-border">
                                <span className="text-sm font-display uppercase tracking-wide text-fest-text truncate pr-2">{role.title}</span>
                                <select 
                                  value={role.status}
                                  onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    try {
                                      await updateDoc(doc(db, 'roles', role.id), { status: newStatus });
                                    } catch (err) {
                                      console.error("Failed to update role status:", err);
                                    }
                                  }}
                                  className="bg-fest-card stitch-border px-2 py-1 text-xs font-display uppercase tracking-widest text-fest-text focus:outline-none appearance-none"
                                >
                                  <option value="open">Open</option>
                                  <option value="in-progress">In Progress</option>
                                  <option value="filled">Filled</option>
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Add Task */}
                        <div className="bg-fest-card p-6 shadow-sm stitch-border">
                          <h2 className="text-xl font-display font-bold text-fest-text uppercase tracking-widest mb-4 flex items-center gap-2">
                            <CheckCircle2 size={22} className="text-fest-green"/> ASSIGN TASK
                          </h2>
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const newTask = {
                              volunteerName: fd.get('volunteerName') as string,
                              roleId: fd.get('roleId') as string,
                              description: fd.get('description') as string,
                              deadline: fd.get('deadline') as string,
                              done: false
                            };
                            try {
                              await addDoc(collection(db, 'tasks'), newTask);
                              (e.target as HTMLFormElement).reset();
                            } catch (err) {
                              console.error("Failed to assign task:", err);
                            }
                          }} className="space-y-3">
                            <input name="volunteerName" required placeholder="Volunteer Name" className="w-full bg-fest-bg stitch-border px-3 py-2 text-sm text-fest-text font-body focus:outline-none focus:border-fest-red placeholder-fest-border" />
                            <select name="roleId" required defaultValue="" className="w-full bg-fest-bg stitch-border px-3 py-2 text-sm text-fest-text font-body focus:outline-none focus:border-fest-red appearance-none text-fest-border">
                              <option value="" disabled>Social Media</option>
                              {roles.map(r => <option key={r.id} value={r.id} className="text-fest-text">{r.title}</option>)}
                            </select>
                            <input name="description" required placeholder="Task Description" className="w-full bg-fest-bg stitch-border px-3 py-2 text-sm text-fest-text font-body focus:outline-none focus:border-fest-red placeholder-fest-border" />
                            <input type="date" name="deadline" required className="w-full bg-fest-bg stitch-border px-3 py-2 text-sm text-fest-text font-body focus:outline-none focus:border-fest-red text-fest-border" />
                            <button type="submit" className="w-full bg-fest-green text-fest-bg font-display uppercase tracking-widest py-3 hover:bg-fest-green/90 transition-colors mt-2 stitch-border border-fest-green">ADD TASK</button>
                          </form>
                        </div>

                        {/* Add Notice */}
                        <div className="bg-fest-card p-6 shadow-sm stitch-border">
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-display font-bold text-fest-text uppercase tracking-widest flex items-center gap-2">
                              <MessageSquare size={22} className="text-fest-red"/> POST NOTICE
                            </h2>
                            {notices.length > 0 && (
                              <button 
                                onClick={async () => {
                                  try {
                                    const promises = notices.map(n => deleteDoc(doc(db, 'notices', n.id)));
                                    await Promise.all(promises);
                                  } catch (err) {
                                    console.error("Failed to clear notices:", err);
                                  }
                                }}
                                className="text-xs font-display uppercase tracking-widest text-fest-red hover:text-fest-red/80 transition-colors"
                              >
                                Clear All
                              </button>
                            )}
                          </div>
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const newNotice = {
                              message: fd.get('message') as string,
                              date: new Date().toISOString()
                            };
                            try {
                              await addDoc(collection(db, 'notices'), newNotice);
                              (e.target as HTMLFormElement).reset();
                            } catch (err) {
                              console.error("Failed to post notice:", err);
                            }
                          }} className="space-y-3">
                            <textarea name="message" required placeholder="Type a message..." rows={3} className="w-full bg-fest-bg stitch-border px-3 py-2 text-sm text-fest-text font-body focus:outline-none focus:border-fest-red resize-none placeholder-fest-border" />
                            <button type="submit" className="w-full bg-fest-red text-fest-bg font-display uppercase tracking-widest py-3 hover:bg-fest-red/90 transition-colors mt-2 stitch-border border-fest-red">POST NOTICE</button>
                          </form>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
