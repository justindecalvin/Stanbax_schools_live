import React, { useState, useRef, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { ChatChannel, SchoolChatMessage, ChatChannelType, StudentProfile } from '../../types';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Lock, 
  Plus, 
  Trash2, 
  Flag, 
  ShieldCheck, 
  Eye, 
  GraduationCap, 
  Sparkles, 
  Search, 
  X, 
  Crown,
  CheckCircle2,
  Award,
  Star,
  Settings,
  Clock,
  UserCheck
} from '../RealIcons';

import { EphemeralStatusManager } from './EphemeralStatusManager';
import { 
  ClassLeadershipModal, 
  ClubLeadershipModal, 
  SchoolPrefectBadgesModal, 
  StudentChatPrivacyModal 
} from './ChatLeadershipModals';

interface SchoolChatSystemProps {
  currentUserRole: 'student' | 'parent' | 'tutor' | 'admin';
  currentUserId: string;
  currentUserName: string;
  currentUserSubtext?: string;
}

export const SchoolChatSystem: React.FC<SchoolChatSystemProps> = ({
  currentUserRole,
  currentUserId,
  currentUserName,
  currentUserSubtext
}) => {
  const { 
    chatChannels, 
    chatMessages, 
    addChatChannel, 
    updateChatChannel, 
    deleteChatChannel, 
    sendChatMessage, 
    deleteChatMessage, 
    flagChatMessage,
    resetChatToDefault,
    students,
    tutors,
    parents,
    classes,
    clubs
  } = useSchool();

  const [activeChannelId, setActiveChannelId] = useState<string>(() => {
    return chatChannels[0]?.id || 'chan-gen-announcement';
  });

  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'class' | 'club' | 'direct' | 'announcement'>('all');
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);

  // Leadership & Badges Modals
  const [showClassLeadershipModal, setShowClassLeadershipModal] = useState(false);
  const [showClubLeadershipModal, setShowClubLeadershipModal] = useState(false);
  const [showPrefectBadgesModal, setShowPrefectBadgesModal] = useState(false);
  const [showPrivacySettingsModal, setShowPrivacySettingsModal] = useState(false);

  // New Channel Form state (Admin or Authorized users)
  const [newChanName, setNewChanName] = useState('');
  const [newChanType, setNewChanType] = useState<ChatChannelType>('class');
  const [newChanDesc, setNewChanDesc] = useState('');
  const [newChanClassId, setNewChanClassId] = useState(classes[0]?.id || '');
  const [newChanClubId, setNewChanClubId] = useState(clubs[0]?.id || '');
  const [newChanDirectUser, setNewChanDirectUser] = useState('');
  const [newChanReadOnly, setNewChanReadOnly] = useState(false);

  // Peer-to-Peer Student Messaging State
  const [showDirectPeerModal, setShowDirectPeerModal] = useState(false);
  const [peerSearchTerm, setPeerSearchTerm] = useState('');
  const [peerTab, setPeerTab] = useState<'classmates' | 'clubs' | 'tutors'>('classmates');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeChannelId]);

  // Determine user permissions
  const isAdmin = currentUserRole === 'admin';
  const isTutor = currentUserRole === 'tutor';
  const isParent = currentUserRole === 'parent';
  const isStudent = currentUserRole === 'student';

  // Identify current student profile if applicable
  const currentStudent: StudentProfile | null = isStudent 
    ? (students.find(s => s.id === currentUserId) || students.find(s => s.name === currentUserName) || null)
    : null;

  // Student's class and assigned class teacher
  const studentClass = currentStudent 
    ? classes.find(c => c.id === currentStudent.classId || c.name === currentStudent.grade || (currentStudent.grade && c.name.includes(currentStudent.grade)))
    : null;

  const studentClassTeacher = studentClass?.classTeacherId 
    ? tutors.find(t => t.id === studentClass.classTeacherId)
    : (currentStudent?.grade ? tutors.find(t => t.assignedClasses?.includes(currentStudent.grade)) : null);

  // Student clubs set
  const studentClubNames = currentStudent?.clubs || [];

  // Start or open a 1:1 direct chat between students (or with tutors).
  // Note: 'admin-1' is included in directParticipantIds in background for admin supervision,
  // but NEVER exposed in the UI or student views.
  const handleStartDirectChat = (targetId: string, targetName: string, _targetRole: 'student' | 'tutor' | 'parent' = 'student') => {
    const existing = chatChannels.find(c => 
      c.type === 'direct' && 
      c.directParticipantIds?.includes(currentUserId) && 
      c.directParticipantIds?.includes(targetId)
    );

    if (existing) {
      setActiveChannelId(existing.id);
      setShowDirectPeerModal(false);
      return;
    }

    const newChan = addChatChannel({
      name: targetName,
      type: 'direct',
      description: `Private study dialogue between ${currentUserName} and ${targetName}.`,
      directParticipantIds: [currentUserId, targetId, 'admin-1'],
      directParticipantNames: [currentUserName, targetName],
      createdBy: currentUserId,
      isReadOnly: false
    });

    setActiveChannelId(newChan.id);
    setShowDirectPeerModal(false);
  };

  // Filter channels based on user authorization:
  // "For students, they should only have access to their class, club (when added), private chats and class teacher."
  const authorizedChannels = chatChannels.filter(chan => {
    // Admin has full omnipotent access
    if (isAdmin) return true;

    // Archived channels are hidden from non-admins
    if (chan.isArchived) return false;

    // Direct chats: only participants
    if (chan.type === 'direct') {
      return chan.directParticipantIds?.includes(currentUserId);
    }

    // Announcements are visible to everyone
    if (chan.type === 'announcement') return true;

    // Strict student access rules:
    if (isStudent && currentStudent) {
      // 1. Class chats: ONLY their own class
      if (chan.type === 'class') {
        const matchesClassId = currentStudent.classId && chan.classId === currentStudent.classId;
        const matchesClassName = currentStudent.grade && chan.className === currentStudent.grade;
        const matchesName = currentStudent.grade && chan.name.toLowerCase().includes(currentStudent.grade.toLowerCase());
        return matchesClassId || matchesClassName || matchesName;
      }

      // 2. Club chats: ONLY clubs student has been added to
      if (chan.type === 'club') {
        const matchedClub = clubs.find(cl => cl.id === chan.clubId || cl.name === chan.clubName);
        const inStudentClubsList = studentClubNames.includes(chan.clubName || '') || studentClubNames.includes(chan.clubId || '');
        const inClubMembersList = matchedClub?.memberStudentIds?.includes(currentUserId);
        const isClubOfficer = matchedClub?.presidentStudentId === currentUserId || matchedClub?.vicePresidentStudentId === currentUserId;
        const isParticipant = chan.directParticipantIds?.includes(currentUserId);
        return inStudentClubsList || inClubMembersList || isClubOfficer || isParticipant;
      }

      return false;
    }

    // Tutors and Parents: can view classes and clubs
    if (chan.type === 'class' || chan.type === 'club') {
      return true;
    }

    return true;
  });

  // Filter by category and search term
  const displayedChannels = authorizedChannels.filter(c => {
    const matchesFilter = channelFilter === 'all' || c.type === channelFilter;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const activeChannel = chatChannels.find(c => c.id === activeChannelId) || displayedChannels[0] || chatChannels[0];

  // Channel messages
  const activeMessages = chatMessages.filter(m => m.channelId === activeChannel?.id);

  // Active channel context for leadership management
  const activeClassObj = activeChannel?.type === 'class'
    ? classes.find(c => c.id === activeChannel.classId || c.name === activeChannel.className || (activeChannel.name && c.name.includes(activeChannel.name)))
    : null;

  const activeClubObj = activeChannel?.type === 'club'
    ? clubs.find(cl => cl.id === activeChannel.clubId || cl.name === activeChannel.clubName || (activeChannel.name && cl.name.includes(activeChannel.name)))
    : null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChannel) return;

    if (activeChannel.isReadOnly && !isAdmin) {
      alert('This channel is currently read-only. Only school administrators may publish messages here.');
      return;
    }

    sendChatMessage({
      channelId: activeChannel.id,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      senderSubtext: currentUserSubtext || (
        isAdmin ? 'School Administration' :
        isTutor ? 'Faculty Educator' :
        isParent ? 'Guardian' : 'Scholar'
      ),
      content: messageText.trim()
    });

    setMessageText('');
  };

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim()) return;

    let targetClassName: string | undefined;
    if (newChanType === 'class' && newChanClassId) {
      targetClassName = classes.find(c => c.id === newChanClassId)?.name;
    }

    let targetClubName: string | undefined;
    if (newChanType === 'club' && newChanClubId) {
      targetClubName = clubs.find(cl => cl.id === newChanClubId)?.name;
    }

    let directIds: string[] | undefined;
    let directNames: string[] | undefined;
    if (newChanType === 'direct') {
      directIds = [currentUserId, newChanDirectUser, 'admin-1'];
      const targetUser = students.find(s => s.id === newChanDirectUser) ||
        tutors.find(t => t.id === newChanDirectUser) ||
        parents.find(p => p.id === newChanDirectUser);
      const targetName = targetUser ? ('fullName' in targetUser ? targetUser.fullName : targetUser.name) : 'School Contact';
      directNames = [currentUserName, targetName];
    }

    const created = addChatChannel({
      name: newChanName.trim(),
      type: newChanType,
      description: newChanDesc.trim() || undefined,
      classId: newChanType === 'class' ? newChanClassId : undefined,
      className: targetClassName,
      clubId: newChanType === 'club' ? newChanClubId : undefined,
      clubName: targetClubName,
      directParticipantIds: directIds,
      directParticipantNames: directNames,
      createdBy: currentUserId,
      isReadOnly: newChanReadOnly
    });

    setActiveChannelId(created.id);
    setShowNewChannelModal(false);
    setNewChanName('');
    setNewChanDesc('');
  };

  // Helper to resolve sender display badge for any message:
  // "for class it displays as class prefect or assistant, for clubs it displays as president or vice. Also allow admin or principal administrator to give prefect badges to school’s prefects."
  const getSenderBadge = (msg: SchoolChatMessage): string | undefined => {
    if (msg.senderRole !== 'student') return undefined;

    const senderStudent = students.find(s => s.id === msg.senderId);

    // Class channel: check for Class Prefect or Assistant
    if (activeChannel?.type === 'class') {
      const cls = activeClassObj || classes.find(c => c.id === activeChannel.classId || c.name === activeChannel.className);
      if (cls?.prefectStudentId === msg.senderId || senderStudent?.classLeadershipRole === 'prefect') {
        return '⭐ Class Prefect';
      }
      if (cls?.assistantPrefectStudentId === msg.senderId || senderStudent?.classLeadershipRole === 'assistant_prefect') {
        return '⭐ Assistant Prefect';
      }
      if (senderStudent?.prefectBadge || senderStudent?.prefectRole) {
        return senderStudent.prefectBadge || `🏅 ${senderStudent.prefectRole}`;
      }
    }

    // Club channel: check for President or Vice President
    if (activeChannel?.type === 'club') {
      const clb = activeClubObj || clubs.find(cl => cl.id === activeChannel.clubId || cl.name === activeChannel.clubName);
      if (clb?.presidentStudentId === msg.senderId || senderStudent?.clubLeadershipRoles?.[clb?.id || ''] === 'president') {
        return '👑 President';
      }
      if (clb?.vicePresidentStudentId === msg.senderId || senderStudent?.clubLeadershipRoles?.[clb?.id || ''] === 'vice_president') {
        return '👑 Vice President';
      }
      if (senderStudent?.prefectBadge || senderStudent?.prefectRole) {
        return senderStudent.prefectBadge || `🏅 ${senderStudent.prefectRole}`;
      }
    }

    // Direct or other channels: show official school prefect badge if assigned
    if (senderStudent?.prefectBadge || senderStudent?.prefectRole) {
      return senderStudent.prefectBadge || `🏅 ${senderStudent.prefectRole}`;
    }

    return msg.senderBadge;
  };

  return (
    <div className="bg-white rounded-3xl border border-[#EAE2CE] shadow-sm overflow-hidden flex flex-col h-[820px]">
      
      {/* ========================================================================= */}
      {/* TOP WHATSAPP-STYLE 16-HOUR EPHEMERAL STATUS STORY STRIP                   */}
      {/* ========================================================================= */}
      <EphemeralStatusManager
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserRole={currentUserRole}
        currentUserSubtext={currentUserSubtext}
        currentUserBadge={
          currentStudent?.prefectBadge || 
          (currentStudent?.prefectRole ? `🏅 ${currentStudent.prefectRole}` : undefined)
        }
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ========================================================================= */}
        {/* LEFT SIDEBAR: CHANNELS & DIRECT CHATS DIRECTORY                           */}
        {/* ========================================================================= */}
        <div className="w-full md:w-80 lg:w-96 border-r border-neutral-200 bg-neutral-50/70 flex flex-col shrink-0">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900 leading-tight">School Community Hub</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-bold">
                    {/* Online indicator dot if enabled */}
                    {isStudent && currentStudent?.chatSettings?.showOnlineStatus !== false && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online Presence Active" />
                    )}
                    <span>{currentUserRole.toUpperCase()} • {currentUserName.split(' ')[0]}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Student Privacy Settings button */}
                {isStudent && currentStudent && (
                  <button
                    type="button"
                    onClick={() => setShowPrivacySettingsModal(true)}
                    className="p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition cursor-pointer"
                    title="Chat Privacy & Presence Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}

                {/* Message peer button */}
                <button
                  type="button"
                  onClick={() => {
                    setPeerSearchTerm('');
                    setShowDirectPeerModal(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Message a classmate or teacher privately"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-extrabold whitespace-nowrap">
                    {isAdmin ? 'Message User' : '+ Message'}
                  </span>
                </button>

                {/* Admin School Prefects & Badges control */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowPrefectBadgesModal(true)}
                    className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs"
                    title="Confer & Manage School Prefect Badges (Principal Administrator)"
                  >
                    <Crown className="w-4 h-4 fill-neutral-950" />
                  </button>
                )}

                {/* Admin Create Channel control */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowNewChannelModal(true)}
                    className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                    title="Create Chat Channel"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Action: Chat My Class Teacher (for students) */}
            {isStudent && studentClassTeacher && (
              <div className="p-2.5 rounded-2xl bg-indigo-50/90 border border-indigo-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                    👨‍🏫
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Class Teacher</span>
                    <span className="text-xs font-black text-neutral-900 truncate block">{studentClassTeacher.name}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartDirectChat(studentClassTeacher.id, studentClassTeacher.name, 'tutor')}
                  className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-extrabold shrink-0 cursor-pointer shadow-xs"
                >
                  Direct Chat
                </button>
              </div>
            )}

            {/* Search bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isStudent ? "Search your class, clubs, or chats..." : "Search chat forums or peer DMs..."}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Channel Type Filters */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
              {(['all', 'class', 'club', 'direct', 'announcement'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setChannelFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                    channelFilter === tab 
                      ? 'bg-neutral-900 text-white shadow-xs' 
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {tab === 'direct' && <Lock className="w-2.5 h-2.5" />}
                  <span>
                    {tab === 'all' ? 'All' : tab === 'direct' ? (isAdmin ? 'Private DMs' : 'Private Chats') : tab}
                  </span>
                  {tab === 'direct' && (
                    <span className={`px-1 rounded-xs font-black text-[9px] ${
                      channelFilter === tab ? 'bg-amber-400 text-neutral-950' : 'bg-neutral-200 text-neutral-700'
                    }`}>
                      {authorizedChannels.filter(c => c.type === 'direct').length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Channels List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {displayedChannels.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">
                {isStudent 
                  ? 'No accessible channels found. You have access to your class, enrolled clubs, and private chats.' 
                  : 'No matching discussion channels found.'}
              </div>
            ) : (
              displayedChannels.map(chan => {
                const isSelected = activeChannel?.id === chan.id;
                const isDirect = chan.type === 'direct';

                let displayName = chan.name;
                let displayDesc = chan.description || `${chan.type.toUpperCase()} discussion channel`;

                if (isDirect) {
                  if (isAdmin) {
                    displayName = chan.directParticipantNames && chan.directParticipantNames.length >= 2
                      ? `${chan.directParticipantNames[0]} ↔ ${chan.directParticipantNames[1]}`
                      : chan.name;
                    displayDesc = 'Private Peer Dialogue • Administrator Safeguarding Active';
                  } else {
                    // For student: DO NOT show admin in participants, show clean 1:1 description
                    const otherName = chan.directParticipantNames?.find(n => !n.includes(currentUserName) && n !== 'admin-1' && !n.toLowerCase().includes('admin'));
                    if (otherName) displayName = otherName;
                    displayDesc = 'Private 1:1 Study Chat';
                  }
                }

                return (
                  <button
                    key={chan.id}
                    type="button"
                    onClick={() => setActiveChannelId(chan.id)}
                    className={`w-full text-left p-3 rounded-2xl transition flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected 
                        ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200 font-black' 
                        : 'hover:bg-white/80 text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        chan.type === 'announcement' ? 'bg-amber-100 text-amber-900' :
                        chan.type === 'class' ? 'bg-blue-100 text-blue-900' :
                        chan.type === 'club' ? 'bg-emerald-100 text-emerald-900' :
                        'bg-indigo-100 text-indigo-900'
                      }`}>
                        {chan.type === 'announcement' && <Sparkles className="w-4 h-4" />}
                        {chan.type === 'class' && <GraduationCap className="w-4 h-4" />}
                        {chan.type === 'club' && <Users className="w-4 h-4" />}
                        {chan.type === 'direct' && <Lock className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs truncate block">{displayName}</span>
                          {chan.isReadOnly && (
                            <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-400 truncate block">
                          {displayDesc}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase font-extrabold shrink-0 ${
                      isDirect
                        ? isAdmin ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {isDirect ? (isAdmin ? '1:1 Audited' : '1:1 Private') : chan.type}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Admin reset / control footer */}
          {isAdmin && (
            <div className="p-3 border-t border-neutral-200 bg-white flex items-center justify-between text-xs">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                Admin Moderation Active
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset chat channels and messages to standard school default?')) {
                    resetChatToDefault();
                  }
                }}
                className="text-[11px] text-red-600 hover:text-red-700 font-bold cursor-pointer"
              >
                Reset Chat
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT SIDEBAR: ACTIVE CHAT FORUM CONVERSATION                             */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {activeChannel ? (
            <>
              {/* Safeguarding Notice Banner: SHOWN TO ADMIN ONLY! Never allow students to know admin has access! */}
              {activeChannel.type === 'direct' && isAdmin && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-950">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-amber-900">Administrator Safeguarding Oversight: </span>
                      <span className="text-amber-800">
                        Observing private dialogue between <strong>{activeChannel.directParticipantNames?.[0] || 'Scholar A'}</strong> and <strong>{activeChannel.directParticipantNames?.[1] || 'Scholar B'}</strong>.
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider shrink-0 border border-amber-300">
                    Admin Audited
                  </span>
                </div>
              )}

              {/* Active Channel Header */}
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between gap-4 bg-white/80 backdrop-blur-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm sm:text-base text-neutral-900 truncate">
                      {activeChannel.type === 'direct' 
                        ? (isAdmin 
                            ? (activeChannel.directParticipantNames && activeChannel.directParticipantNames.length >= 2 
                                ? `${activeChannel.directParticipantNames[0]} ↔ ${activeChannel.directParticipantNames[1]}` 
                                : activeChannel.name)
                            : (activeChannel.directParticipantNames?.find(n => !n.includes(currentUserName) && n !== 'admin-1' && !n.toLowerCase().includes('admin')) || activeChannel.name))
                        : activeChannel.name}
                    </h4>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      activeChannel.type === 'announcement' ? 'bg-amber-100 text-amber-900' :
                      activeChannel.type === 'class' ? 'bg-blue-100 text-blue-900' :
                      activeChannel.type === 'club' ? 'bg-emerald-100 text-emerald-900' :
                      'bg-indigo-100 text-indigo-900'
                    }`}>
                      {activeChannel.type === 'direct' ? (isAdmin ? '1:1 Audited' : '1:1 Private') : activeChannel.type}
                    </span>

                    {activeChannel.isReadOnly && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Read-Only
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-500 truncate mt-0.5">
                    {activeChannel.type === 'direct'
                      ? (isAdmin
                          ? 'Private student dialogue visible to administrators for safeguarding and student protection.'
                          : 'Private 1-on-1 dialogue. Keep exchanges academic, respectful, and safe.')
                      : (activeChannel.description || 'Welcome to this school discussion forum. Keep interactions respectful and academic.')}
                  </p>
                </div>

                {/* Header Action Buttons (Admin Leadership Controls) */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Class Leadership button (Admin Only) */}
                  {isAdmin && activeChannel.type === 'class' && activeClassObj && (
                    <button
                      type="button"
                      onClick={() => setShowClassLeadershipModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Select Class Prefect & Assistant Prefect"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span className="hidden sm:inline">Class Prefects</span>
                    </button>
                  )}

                  {/* Club Leadership button (Admin Only) */}
                  {isAdmin && activeChannel.type === 'club' && activeClubObj && (
                    <button
                      type="button"
                      onClick={() => setShowClubLeadershipModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Select Club President, Vice President & Members"
                    >
                      <Crown className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                      <span className="hidden sm:inline">Club Leaders</span>
                    </button>
                  )}

                  {/* Admin Channel Controls: Lock / Unlock & Delete */}
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => updateChatChannel(activeChannel.id, { isReadOnly: !activeChannel.isReadOnly })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                          activeChannel.isReadOnly
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                        }`}
                        title={activeChannel.isReadOnly ? 'Unlock Channel for user replies' : 'Lock Channel as Read-Only'}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">{activeChannel.isReadOnly ? 'Unlock' : 'Lock'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete channel "${activeChannel.name}" and all its messages?`)) {
                            deleteChatChannel(activeChannel.id);
                            setActiveChannelId(chatChannels[0]?.id || '');
                          }
                        }}
                        className="p-1.5 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Delete Channel (Admin Control)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-neutral-50/40">
                {activeMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h5 className="font-black text-sm text-neutral-800">No messages in this channel yet</h5>
                    <p className="text-xs text-neutral-500 max-w-sm">
                      Start the conversation! Scholars, faculty tutors, and parents can collaborate, discuss study topics, and exchange ideas.
                    </p>
                  </div>
                ) : (
                  activeMessages.map((msg) => {
                    const isMine = msg.senderId === currentUserId;
                    const isMsgAdmin = msg.senderRole === 'admin';
                    const isMsgTutor = msg.senderRole === 'tutor';
                    const isMsgParent = msg.senderRole === 'parent';
                    const senderBadge = getSenderBadge(msg);

                    return (
                      <div 
                        key={msg.id}
                        className={`flex gap-3 max-w-2xl ${isMine ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                          isMsgAdmin ? 'bg-neutral-900 text-white' :
                          isMsgTutor ? 'bg-blue-900 text-amber-300' :
                          isMsgParent ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          'bg-indigo-700 text-white'
                        }`}>
                          {msg.senderName.charAt(0)}
                        </div>

                        {/* Message Bubble Container */}
                        <div className={`space-y-1 ${isMine ? 'items-end' : ''}`}>
                          {/* Meta header */}
                          <div className={`flex items-center gap-1.5 flex-wrap text-[11px] ${isMine ? 'justify-end' : ''}`}>
                            <span className="font-black text-neutral-900">{msg.senderName}</span>
                            
                            {/* Role Tag */}
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                              isMsgAdmin ? 'bg-neutral-900 text-white' :
                              isMsgTutor ? 'bg-blue-100 text-blue-900' :
                              isMsgParent ? 'bg-amber-100 text-amber-900' :
                              'bg-neutral-100 text-neutral-700'
                            }`}>
                              {msg.senderRole}
                            </span>

                            {/* Official Leadership Badge (Prefect, President, Vice President, etc.) */}
                            {senderBadge && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shadow-2xs flex items-center gap-1 ${
                                senderBadge.includes('President') ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                senderBadge.includes('Vice') ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                senderBadge.includes('Prefect') ? 'bg-indigo-100 text-indigo-900 border border-indigo-300' :
                                'bg-purple-100 text-purple-900 border border-purple-300'
                              }`}>
                                {senderBadge}
                              </span>
                            )}

                            {msg.senderSubtext && !senderBadge && (
                              <span className="text-neutral-400 font-medium truncate max-w-[140px]">
                                • {msg.senderSubtext}
                              </span>
                            )}

                            <span className="text-[10px] text-neutral-400">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Bubble: Students never see flagged rose styling or mention of admin moderation */}
                          <div className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed relative group ${
                            isMine 
                              ? 'bg-neutral-900 text-white rounded-tr-xs shadow-sm' 
                              : (isAdmin && msg.flaggedByAdmin)
                              ? 'bg-rose-50 border border-rose-200 text-rose-950 rounded-tl-xs'
                              : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-xs shadow-xs'
                          }`}>
                            {msg.deletedByAdmin ? (
                              <span className="italic text-neutral-400">
                                {isAdmin 
                                  ? '[This message was removed by the School Administrator for violating conduct policy.]' 
                                  : '[This message was deleted]'}
                              </span>
                            ) : (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}

                            {/* Admin moderation quick actions (HIDDEN FROM STUDENTS) */}
                            {isAdmin && !msg.deletedByAdmin && (
                              <div className="hidden group-hover:flex items-center gap-1.5 absolute -top-3 right-2 bg-white px-2 py-0.5 rounded-full border border-neutral-300 shadow-sm text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => flagChatMessage(msg.id, !msg.flaggedByAdmin)}
                                  className={`p-1 hover:text-amber-600 cursor-pointer ${msg.flaggedByAdmin ? 'text-amber-600' : 'text-neutral-400'}`}
                                  title={msg.flaggedByAdmin ? 'Unflag message' : 'Flag message'}
                                >
                                  <Flag className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('Delete this message as administrator?')) {
                                      deleteChatMessage(msg.id);
                                    }
                                  }}
                                  className="p-1 hover:text-red-600 text-neutral-400 cursor-pointer"
                                  title="Delete Message"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Composer */}
              <div className="p-3 sm:p-4 bg-white border-t border-neutral-200">
                {activeChannel.isReadOnly && !isAdmin ? (
                  <div className="p-3 rounded-2xl bg-neutral-100 text-neutral-500 text-xs text-center flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>This channel is locked by the School Administration. Comments are disabled.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={`Message ${activeChannel.name}...`}
                      className="flex-1 px-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-300 text-xs sm:text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      className="p-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white transition cursor-pointer shadow-sm active:scale-95"
                      title="Send Message"
                    >
                      <Send className="w-4 h-4 text-amber-400" />
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-neutral-400 text-sm">
              Select or create a discussion channel to view messages.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW CHANNEL                                               */}
      {/* ========================================================================= */}
      {showNewChannelModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
                  <Plus className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-black text-base text-neutral-900">Create New Chat Forum</h4>
                  <p className="text-xs text-neutral-500">Configure class forum, co-curricular club, or direct channel.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChannelModal(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4 text-xs font-bold text-neutral-700">
              <div>
                <label className="block mb-1">Forum Type</label>
                <select
                  value={newChanType}
                  onChange={(e) => {
                    const t = e.target.value as ChatChannelType;
                    setNewChanType(t);
                    if (t === 'class' && classes[0]) setNewChanName(`${classes[0].name} — Academic Forum`);
                    if (t === 'club' && clubs[0]) setNewChanName(`${clubs[0].name} — Society Hub`);
                    if (t === 'announcement') setNewChanName('Official Announcement Broadcast');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white"
                >
                  <option value="class">Class by Class Forum</option>
                  <option value="club">Co-Curricular Club & Society</option>
                  <option value="direct">Direct 1:1 Consultation (Parent / Tutor / Student)</option>
                  <option value="announcement">Official Announcement Bulletin</option>
                </select>
              </div>

              {newChanType === 'class' && (
                <div>
                  <label className="block mb-1">Linked School Class</label>
                  <select
                    value={newChanClassId}
                    onChange={(e) => {
                      setNewChanClassId(e.target.value);
                      const cls = classes.find(c => c.id === e.target.value);
                      if (cls) setNewChanName(`${cls.name} — Academic Forum`);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {newChanType === 'club' && (
                <div>
                  <label className="block mb-1">Linked Extracurricular Club</label>
                  <select
                    value={newChanClubId}
                    onChange={(e) => {
                      setNewChanClubId(e.target.value);
                      const cl = clubs.find(c => c.id === e.target.value);
                      if (cl) setNewChanName(`${cl.name} — Society Hub`);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white"
                  >
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
                    ))}
                  </select>
                </div>
              )}

              {newChanType === 'direct' && (
                <div>
                  <label className="block mb-1">Target Contact</label>
                  <select
                    value={newChanDirectUser}
                    onChange={(e) => setNewChanDirectUser(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white"
                    required
                  >
                    <option value="">-- Choose User for Consultation --</option>
                    <optgroup label="Faculty Tutors">
                      {tutors.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (Tutor • {t.assignedSubjects?.join(', ') || 'Faculty'})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Parents">
                      {parents.map(p => (
                        <option key={p.id} value={p.id}>{p.fullName} (Guardian)</option>
                      ))}
                    </optgroup>
                    <optgroup label="Scholars">
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              <div>
                <label className="block mb-1">Channel Name</label>
                <input
                  type="text"
                  value={newChanName}
                  onChange={(e) => setNewChanName(e.target.value)}
                  placeholder="e.g. SSS 2 Science — Class Forum"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={newChanDesc}
                  onChange={(e) => setNewChanDesc(e.target.value)}
                  placeholder="Purpose of this channel..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-read-only"
                  checked={newChanReadOnly}
                  onChange={(e) => setNewChanReadOnly(e.target.checked)}
                  className="rounded text-amber-500 cursor-pointer"
                />
                <label htmlFor="chk-read-only" className="cursor-pointer font-bold text-neutral-700">
                  Read-only announcement channel (only administrators can send messages)
                </label>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewChannelModal(false)}
                  className="px-4 py-2 rounded-xl text-neutral-600 bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-black cursor-pointer shadow-sm"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DIRECT PEER-TO-PEER MESSAGING MODAL                              */}
      {/* ========================================================================= */}
      {showDirectPeerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-neutral-900 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Private Direct Message</h3>
                  <p className="text-xs text-indigo-200">
                    Connect 1-on-1 with a fellow scholar or academic tutor
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowDirectPeerModal(false)}
                className="text-stone-400 hover:text-white p-2 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Notice Card: Admin sees admin notice, students see clean peer study prompt (NEVER revealing admin access) */}
              {isAdmin ? (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-950 leading-relaxed">
                    <span className="font-bold block text-amber-900">Administrative Oversight View</span>
                    All 1-on-1 direct message channels across scholars and tutors remain accessible from the Admin Community Hub.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-indigo-950 leading-relaxed">
                    <span className="font-bold block text-indigo-900">1-on-1 Academic Collaboration</span>
                    Connect directly with your classmates, club peers, and class teacher to collaborate on homework, assignments, and exam revision.
                  </div>
                </div>
              )}

              {/* Tabs: Classmates vs Club Peers vs Tutors */}
              <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPeerTab('classmates')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    peerTab === 'classmates' 
                      ? 'bg-white text-neutral-900 shadow-xs' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {isStudent ? 'My Classmates' : 'All Scholars'}
                </button>
                <button
                  type="button"
                  onClick={() => setPeerTab('clubs')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    peerTab === 'clubs' 
                      ? 'bg-white text-neutral-900 shadow-xs' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {isStudent ? 'Club Peers' : 'Club Members'}
                </button>
                <button
                  type="button"
                  onClick={() => setPeerTab('tutors')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    peerTab === 'tutors' 
                      ? 'bg-white text-neutral-900 shadow-xs' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {isStudent ? 'Class Teacher & Tutors' : 'Faculty Tutors'}
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={peerSearchTerm}
                  onChange={(e) => setPeerSearchTerm(e.target.value)}
                  placeholder={
                    peerTab === 'classmates' ? "Search classmate by name..." :
                    peerTab === 'clubs' ? "Search club member by name..." :
                    "Search teacher by name or subject..."
                  }
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-100 border border-neutral-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* User Directory List */}
              <div className="space-y-2 pt-1">
                {peerTab === 'classmates' ? (
                  (() => {
                    const peerList = students.filter(s => {
                      if (s.id === currentUserId) return false;
                      // Students can only access their own class!
                      if (isStudent && currentStudent) {
                        const inSameClass = (currentStudent.classId && s.classId === currentStudent.classId) || 
                          (currentStudent.grade && s.grade === currentStudent.grade);
                        if (!inSameClass) return false;
                      }
                      const matchesSearch = s.name.toLowerCase().includes(peerSearchTerm.toLowerCase());
                      return matchesSearch;
                    });

                    if (peerList.length === 0) {
                      return (
                        <div className="p-8 text-center text-xs text-neutral-400 bg-neutral-50 rounded-2xl border border-neutral-100">
                          {isStudent ? "No classmates found in your class matching search." : "No scholars found."}
                        </div>
                      );
                    }

                    return peerList.map(s => {
                      const hasExistingChat = chatChannels.some(c => 
                        c.type === 'direct' && 
                        c.directParticipantIds?.includes(currentUserId) && 
                        c.directParticipantIds?.includes(s.id)
                      );

                      // Check student direct chat preference:
                      // Fellow students cannot chat if disabled, but admin/tutors can
                      const peerChatDisabled = isStudent && s.chatSettings?.allowDirectMessages === false;

                      return (
                        <div
                          key={s.id}
                          className="p-3 rounded-2xl border border-neutral-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition flex items-center justify-between gap-3 bg-white shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0 relative">
                              {s.name.charAt(0)}
                              {s.chatSettings?.showOnlineStatus !== false && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5 className="font-extrabold text-xs text-neutral-900 truncate">{s.name}</h5>
                                {s.prefectBadge && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                    {s.prefectBadge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-500 font-medium truncate">
                                {s.grade} • {s.house ? `${s.house} House` : 'Stanbax Standard'}
                              </p>
                            </div>
                          </div>

                          {peerChatDisabled ? (
                            <span 
                              className="px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-400 font-semibold text-xs cursor-not-allowed"
                              title="This scholar has chosen not to receive direct chats from fellow students."
                            >
                              Chat Disabled
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartDirectChat(s.id, s.name, 'student')}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Send className="w-3 h-3" />
                              <span>{hasExistingChat ? 'Open Chat' : 'Start Chat'}</span>
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()
                ) : peerTab === 'clubs' ? (
                  (() => {
                    // Club members in clubs that current student is in
                    const myClubs = clubs.filter(cl => 
                      cl.memberStudentIds?.includes(currentUserId) ||
                      cl.presidentStudentId === currentUserId ||
                      cl.vicePresidentStudentId === currentUserId ||
                      studentClubNames.includes(cl.name) ||
                      studentClubNames.includes(cl.id) ||
                      isAdmin
                    );

                    const clubMemberIds = Array.from(new Set(
                      myClubs.flatMap(c => [
                        ...(c.memberStudentIds || []),
                        ...(c.presidentStudentId ? [c.presidentStudentId] : []),
                        ...(c.vicePresidentStudentId ? [c.vicePresidentStudentId] : [])
                      ])
                    )).filter(id => id !== currentUserId);

                    const clubPeers = students.filter(s => 
                      clubMemberIds.includes(s.id) &&
                      s.name.toLowerCase().includes(peerSearchTerm.toLowerCase())
                    );

                    if (clubPeers.length === 0) {
                      return (
                        <div className="p-8 text-center text-xs text-neutral-400 bg-neutral-50 rounded-2xl border border-neutral-100">
                          {isStudent 
                            ? "No fellow club members found. Join or get added to an extracurricular club to connect with society peers!" 
                            : "No club scholars found."}
                        </div>
                      );
                    }

                    return clubPeers.map(s => {
                      const hasExistingChat = chatChannels.some(c => 
                        c.type === 'direct' && 
                        c.directParticipantIds?.includes(currentUserId) && 
                        c.directParticipantIds?.includes(s.id)
                      );

                      const peerChatDisabled = isStudent && s.chatSettings?.allowDirectMessages === false;

                      return (
                        <div
                          key={s.id}
                          className="p-3 rounded-2xl border border-neutral-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition flex items-center justify-between gap-3 bg-white shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm shrink-0">
                              {s.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-extrabold text-xs text-neutral-900 truncate">{s.name}</h5>
                              <p className="text-[11px] text-neutral-500 font-medium truncate">
                                {s.grade} • Club Peer
                              </p>
                            </div>
                          </div>

                          {peerChatDisabled ? (
                            <span className="px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-400 font-semibold text-xs cursor-not-allowed">
                              Chat Disabled
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartDirectChat(s.id, s.name, 'student')}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Send className="w-3 h-3" />
                              <span>{hasExistingChat ? 'Open Chat' : 'Start Chat'}</span>
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()
                ) : (
                  (() => {
                    const tutorList = tutors.filter(t => {
                      if (t.id === currentUserId) return false;
                      const matchesSearch = t.name.toLowerCase().includes(peerSearchTerm.toLowerCase()) ||
                        (t.assignedSubjects && t.assignedSubjects.some(sub => sub.toLowerCase().includes(peerSearchTerm.toLowerCase())));
                      return matchesSearch;
                    });

                    if (tutorList.length === 0) {
                      return (
                        <div className="p-8 text-center text-xs text-neutral-400 bg-neutral-50 rounded-2xl border border-neutral-100">
                          No tutors found matching your search.
                        </div>
                      );
                    }

                    return tutorList.map(t => {
                      const hasExistingChat = chatChannels.some(c => 
                        c.type === 'direct' && 
                        c.directParticipantIds?.includes(currentUserId) && 
                        c.directParticipantIds?.includes(t.id)
                      );

                      const isMyClassTeacher = studentClassTeacher?.id === t.id;

                      return (
                        <div
                          key={t.id}
                          className="p-3 rounded-2xl border border-neutral-200 hover:border-blue-300 hover:bg-blue-50/30 transition flex items-center justify-between gap-3 bg-white shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-black text-sm shrink-0">
                              {t.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5 className="font-extrabold text-xs text-neutral-900 truncate">{t.name}</h5>
                                {isMyClassTeacher && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                                    👨‍🏫 My Class Teacher
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-500 font-medium truncate">
                                Faculty Tutor • {t.assignedSubjects?.join(', ') || 'Academic Department'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStartDirectChat(t.id, t.name, 'tutor')}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-amber-300 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <Send className="w-3 h-3" />
                            <span>{hasExistingChat ? 'Open Chat' : 'Start Chat'}</span>
                          </button>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>

            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDirectPeerModal(false)}
                className="px-5 py-2 rounded-xl bg-neutral-900 text-white font-bold text-xs"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CLASS LEADERSHIP MODAL (ADMIN ONLY)                              */}
      {/* ========================================================================= */}
      {showClassLeadershipModal && activeClassObj && (
        <ClassLeadershipModal
          schoolClass={activeClassObj}
          onClose={() => setShowClassLeadershipModal(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CLUB LEADERSHIP MODAL (ADMIN ONLY)                               */}
      {/* ========================================================================= */}
      {showClubLeadershipModal && activeClubObj && (
        <ClubLeadershipModal
          club={activeClubObj}
          onClose={() => setShowClubLeadershipModal(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: SCHOOL PREFECTS & BADGES MODAL (PRINCIPAL ADMINISTRATOR)         */}
      {/* ========================================================================= */}
      {showPrefectBadgesModal && (
        <SchoolPrefectBadgesModal
          onClose={() => setShowPrefectBadgesModal(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: STUDENT CHAT PRIVACY & PRESENCE SETTINGS                         */}
      {/* ========================================================================= */}
      {showPrivacySettingsModal && currentStudent && (
        <StudentChatPrivacyModal
          student={currentStudent}
          onClose={() => setShowPrivacySettingsModal(false)}
        />
      )}

    </div>
  );
};
