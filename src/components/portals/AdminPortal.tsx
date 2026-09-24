import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { SchoolLogo } from '../SchoolLogo';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Award, 
  Settings, 
  Calendar, 
  FileText, 
  LogOut, 
  Search, 
  ChevronRight, 
  Layers, 
  ShieldCheck, 
  Key, 
  Radio, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Menu,
  X,
  HelpCircle,
  Layout,
  School as SchoolIcon
} from '../RealIcons';

import { AdminStudentsAlumniTab } from './admin/AdminStudentsAlumniTab';
import { AdminFacultyTab } from './admin/AdminFacultyTab';
import { AdminTutorAssignmentsTab } from './admin/AdminTutorAssignmentsTab';
import { AdminClassesFeesTab } from './admin/AdminClassesFeesTab';
import { AdminSubjectsGradingTab } from './admin/AdminSubjectsGradingTab';
import { AdminResultCollationTab } from './admin/AdminResultCollationTab';
import { AdminLessonNotesTab } from './admin/AdminLessonNotesTab';
import { AdminParentBroadcastTab } from './admin/AdminParentBroadcastTab';
import { AdminProprietressTab } from './admin/AdminProprietressTab';
import { AdminCredentialsVaultTab } from './admin/AdminCredentialsVaultTab';
import { AdminSchoolSettingsTab } from './admin/AdminSchoolSettingsTab';
import { AdminSchoolCalendarTab } from './admin/AdminSchoolCalendarTab';
import { AdminLandingPageTab } from './admin/AdminLandingPageTab';
import { AdminFaqSubTab } from './admin/AdminFaqSubTab';
import { AdminCalvinTokensTab } from './admin/AdminCalvinTokensTab';
import { AdminSchemeOfWorkTab } from './admin/AdminSchemeOfWorkTab';
import { Bot, Sparkles } from 'lucide-react';

interface AdminPortalProps {
  onBackToWebsite: () => void;
}

type AdminTab = 
  | 'overview'
  | 'calvin_tokens'
  | 'scheme_of_work'
  | 'calendar'
  | 'students'
  | 'faculty'
  | 'assignments'
  | 'classes'
  | 'subjects'
  | 'results'
  | 'notes'
  | 'broadcasts'
  | 'proprietress'
  | 'credentials'
  | 'settings'
  | 'landing'
  | 'faqs';

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToWebsite }) => {
  const { 
    schoolInfo, 
    students, 
    tutors, 
    classes, 
    calvinTokens,
    logoutAdmin,
    attendanceRecords,
    termResumptionConfig,
    consultationRequests
  } = useSchool();

  const pendingConsultationsCount = consultationRequests.filter(c => c.status === 'Pending').length;
  const availableTokensCount = calvinTokens.filter(t => t.status === 'unused').length;

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutAdmin();
    onBackToWebsite();
  };

  const menuItems: Array<{ id: AdminTab; label: string; icon: React.ElementType; badge?: string | number }> = [
    { id: 'overview', label: 'Dashboard Overview', icon: Layers },
    { id: 'calvin_tokens', label: 'Calvin AI Tokens', icon: Bot, badge: availableTokensCount > 0 ? `${availableTokensCount} Ready` : undefined },
    { id: 'scheme_of_work', label: 'Schemes of Work (AI Brain)', icon: Sparkles, badge: 'Curriculum' },
    { id: 'calendar', label: 'Term Calendar & Events', icon: Calendar },
    { id: 'students', label: 'Scholars & Alumni', icon: GraduationCap, badge: students.length },
    { id: 'faculty', label: 'Faculty Staff', icon: Users, badge: tutors.length },
    { id: 'assignments', label: 'Tutor & Principal Roles', icon: BookOpen },
    { id: 'classes', label: 'Classes & Fees', icon: SchoolIcon, badge: classes.length },
    { id: 'subjects', label: 'Subjects & Grading', icon: Award },
    { id: 'results', label: 'Terminal Collation', icon: CheckCircle2 },
    { id: 'notes', label: 'Lesson Notes', icon: FileText },
    { id: 'broadcasts', label: 'Parent Broadcasts & Relations', icon: Radio, badge: pendingConsultationsCount || undefined },
    { id: 'proprietress', label: 'Executive Council', icon: ShieldCheck },
    { id: 'credentials', label: 'Credentials Vault', icon: Key },
    { id: 'settings', label: 'School Settings & Resumption', icon: Settings },
    { id: 'landing', label: 'School Logo & Website CMS', icon: Layout, badge: 'Logo & Media' },
    { id: 'faqs', label: 'FAQ Manager', icon: HelpCircle }
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-['Nunito',sans-serif]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-stone-600 hover:bg-stone-100 rounded-xl md:hidden"
            title="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2.5">
            <SchoolLogo size="sm" showText={false} />
            <div>
              <div className="text-sm font-black text-stone-900 leading-tight">
                {schoolInfo.name} Administration
              </div>
              <div className="text-[11px] font-bold text-amber-700">
                {termResumptionConfig?.termName || schoolInfo.activeTerm} • {termResumptionConfig?.session || schoolInfo.activeSession}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToWebsite}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
          >
            Public Website
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main App Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar for Desktop */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-stone-200 shrink-0 p-4 space-y-1 overflow-y-auto">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 px-3 py-2">
            Operations & Portals
          </div>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden bg-stone-900/40 backdrop-blur-xs flex">
            <div className="w-72 bg-white h-full p-4 space-y-1 overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-stone-100">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Navigation Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${
                      isActive ? 'bg-red-600 text-white' : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Workspace Tab Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-red-600 via-red-700 to-amber-700 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-3 backdrop-blur-xs">
                    <SchoolIcon className="w-3.5 h-3.5" />
                    <span>Executive Central Registry</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                    Welcome, Administrator
                  </h1>
                  <p className="text-white/90 text-sm mt-2 leading-relaxed">
                    Overview of school attendance, academic grading, lesson notes, and fee structures. Term resumption is active and teacher registers are synchronized.
                  </p>
                </div>
              </div>

              {/* Quick Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase text-stone-400">Total Enrolled Scholars</div>
                    <GraduationCap className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-2xl font-black text-stone-900 mt-2">{students.length}</div>
                  <div className="text-xs text-stone-500 mt-1">Across all primary & secondary arms</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase text-stone-400">Faculty Tutors</div>
                    <Users className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-stone-900 mt-2">{tutors.length}</div>
                  <div className="text-xs text-stone-500 mt-1">Registered academic faculty</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase text-stone-400">School Classes</div>
                    <SchoolIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-stone-900 mt-2">{classes.length}</div>
                  <div className="text-xs text-stone-500 mt-1">Active grade categories</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase text-stone-400">Attendance Registers</div>
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-stone-900 mt-2">{attendanceRecords.length}</div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1">Daily registers logged</div>
                </div>
              </div>

              {/* Quick Actions Shortcuts */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
                <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider mb-4">
                  Quick Navigation Shortcuts
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('landing')}
                    className="p-4 rounded-xl border-2 border-red-200 bg-red-50/40 hover:border-red-500 hover:bg-red-50 text-left transition-all group"
                  >
                    <Layout className="w-5 h-5 text-red-600 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-xs text-stone-900">School Logo & CMS</div>
                    <div className="text-[11px] text-red-600 font-semibold">Change logo & website</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="p-4 rounded-xl border border-stone-200 hover:border-red-500 hover:bg-red-50/50 text-left transition-all group"
                  >
                    <Settings className="w-5 h-5 text-red-600 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-xs text-stone-900">Term Resumption</div>
                    <div className="text-[11px] text-stone-500">Set resumption date</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('classes')}
                    className="p-4 rounded-xl border border-stone-200 hover:border-amber-500 hover:bg-amber-50/50 text-left transition-all group"
                  >
                    <SchoolIcon className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-xs text-stone-900">Class & Fees</div>
                    <div className="text-[11px] text-stone-500">Manage tuition rates</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('students')}
                    className="p-4 rounded-xl border border-stone-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all group"
                  >
                    <GraduationCap className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-xs text-stone-900">Student Profiles</div>
                    <div className="text-[11px] text-stone-500">Attendance & ranks</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('results')}
                    className="p-4 rounded-xl border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-all group"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-xs text-stone-900">Result Collation</div>
                    <div className="text-[11px] text-stone-500">Generate report cards</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('calendar')}
                    className="p-4 rounded-xl border border-stone-200 hover:border-purple-500 hover:bg-purple-50/50 text-left transition-all group"
                  >
                    <Calendar className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-xs text-stone-900">School Calendar</div>
                    <div className="text-[11px] text-stone-500">Terms & milestones</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('calvin_tokens')}
                    className="p-4 rounded-xl border border-stone-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-left transition-all group"
                  >
                    <Bot className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-xs text-stone-900">Calvin AI Tokens</div>
                    <div className="text-[11px] text-stone-500">Mint study access</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calvin_tokens' && <AdminCalvinTokensTab />}
          {activeTab === 'scheme_of_work' && <AdminSchemeOfWorkTab />}
          {activeTab === 'calendar' && <AdminSchoolCalendarTab />}
          {activeTab === 'students' && <AdminStudentsAlumniTab />}
          {activeTab === 'faculty' && <AdminFacultyTab />}
          {activeTab === 'assignments' && <AdminTutorAssignmentsTab />}
          {activeTab === 'classes' && <AdminClassesFeesTab />}
          {activeTab === 'subjects' && <AdminSubjectsGradingTab />}
          {activeTab === 'results' && <AdminResultCollationTab />}
          {activeTab === 'notes' && <AdminLessonNotesTab />}
          {activeTab === 'broadcasts' && <AdminParentBroadcastTab />}
          {activeTab === 'proprietress' && <AdminProprietressTab />}
          {activeTab === 'credentials' && <AdminCredentialsVaultTab />}
          {activeTab === 'settings' && <AdminSchoolSettingsTab />}
          {activeTab === 'landing' && <AdminLandingPageTab />}
          {activeTab === 'faqs' && <AdminFaqSubTab />}
        </main>
      </div>
    </div>
  );
};
