import React, { useState, useRef, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { ChatChannel, SchoolChatMessage, ChatChannelType } from '../../types';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Lock, 
  Hash, 
  Plus, 
  Trash2, 
  Flag, 
  ShieldCheck, 
  User, 
  GraduationCap, 
  BookOpen, 
  Sparkles, 
  Search, 
  X, 
  AlertCircle,
  Crown,
  CheckCircle2,
  Paperclip
} from '../RealIcons';

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
  const [showAdminChannelSettings, setShowAdminChannelSettings] = useState(false);

  // New Channel Form state (Admin or Authorized users)
  const [newChanName, setNewChanName] = useState('');
  const [newChanType, setNewChanType] = useState<ChatChannelType>('class');
  const [newChanDesc, setNewChanDesc] = useState('');
  const [newChanClassId, setNewChanClassId] = useState(classes[0]?.id || '');
  const [newChanClubId, setNewChanClubId] = useState(clubs[0]?.id || '');
  const [newChanDirectUser, setNewChanDirectUser] = useState('');
  const [newChanReadOnly, setNewChanReadOnly] = useState(false);

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

  // Filter channels based on user authorization
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

    // Class chats:
    // Students of that class, Tutors, Parents
    if (chan.type === 'class') {
      return true; // Transparent school community
    }

    // Club chats:
    if (chan.type === 'club') {
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChannel) return;

    // Check read-only lock
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

  return (
    <div className="bg-white rounded-3xl border border-[#EAE2CE] shadow-sm overflow-hidden flex flex-col md:flex-row h-[750px]">
      
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
                <span className="text-[10px] text-neutral-500 font-bold">
                  {currentUserRole.toUpperCase()} • {currentUserName}
                </span>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowNewChannelModal(true)}
                className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                title="Create Chat Channel"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[11px] hidden sm:inline">New Channel</span>
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search chat forums or groups..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Channel Type Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
            {(['all', 'class', 'club', 'direct', 'announcement'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setChannelFilter(tab)}
                className={`px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] whitespace-nowrap transition cursor-pointer ${
                  channelFilter === tab 
                    ? 'bg-neutral-900 text-white shadow-xs' 
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {tab === 'all' ? 'All' : tab === 'direct' ? 'Private' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {displayedChannels.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">
              No matching discussion channels found.
            </div>
          ) : (
            displayedChannels.map(chan => {
              const isSelected = activeChannel?.id === chan.id;
              const unreadDummy = false;

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
                      'bg-purple-100 text-purple-900'
                    }`}>
                      {chan.type === 'announcement' && <Sparkles className="w-4 h-4" />}
                      {chan.type === 'class' && <GraduationCap className="w-4 h-4" />}
                      {chan.type === 'club' && <Users className="w-4 h-4" />}
                      {chan.type === 'direct' && <Lock className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs truncate block">{chan.name}</span>
                        {chan.isReadOnly && (
                          <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 truncate block">
                        {chan.description || `${chan.type.toUpperCase()} discussion channel`}
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] px-1.5 py-0.5 rounded-md uppercase font-extrabold bg-neutral-100 text-neutral-600 shrink-0">
                    {chan.type === 'direct' ? '1:1' : chan.type}
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
        {/* Active Channel Header */}
        {activeChannel ? (
          <>
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between gap-4 bg-white/80 backdrop-blur-xs">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm sm:text-base text-neutral-900 truncate">
                    {activeChannel.name}
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    activeChannel.type === 'announcement' ? 'bg-amber-100 text-amber-900' :
                    activeChannel.type === 'class' ? 'bg-blue-100 text-blue-900' :
                    activeChannel.type === 'club' ? 'bg-emerald-100 text-emerald-900' :
                    'bg-purple-100 text-purple-900'
                  }`}>
                    {activeChannel.type}
                  </span>
                  {activeChannel.isReadOnly && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Read-Only
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 truncate mt-0.5">
                  {activeChannel.description || 'Welcome to this school discussion forum. Keep interactions respectful and academic.'}
                </p>
              </div>

              {/* Admin Channel Controls */}
              {isAdmin && (
                <div className="flex items-center gap-2 shrink-0">
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
                    <span>{activeChannel.isReadOnly ? 'Unlock Channel' : 'Lock Channel'}</span>
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
                </div>
              )}
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
                        'bg-red-600 text-white'
                      }`}>
                        {msg.senderName.charAt(0)}
                      </div>

                      {/* Message Bubble Container */}
                      <div className={`space-y-1 ${isMine ? 'items-end' : ''}`}>
                        {/* Meta header */}
                        <div className={`flex items-center gap-2 text-[11px] ${isMine ? 'justify-end' : ''}`}>
                          <span className="font-black text-neutral-900">{msg.senderName}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                            isMsgAdmin ? 'bg-neutral-900 text-white' :
                            isMsgTutor ? 'bg-blue-100 text-blue-900' :
                            isMsgParent ? 'bg-amber-100 text-amber-900' :
                            'bg-neutral-100 text-neutral-700'
                          }`}>
                            {msg.senderRole}
                          </span>
                          {msg.senderSubtext && (
                            <span className="text-neutral-400 font-medium truncate max-w-[150px]">
                              • {msg.senderSubtext}
                            </span>
                          )}
                          <span className="text-[10px] text-neutral-400">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Bubble */}
                        <div className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed relative group ${
                          isMine 
                            ? 'bg-neutral-900 text-white rounded-tr-xs shadow-sm' 
                            : msg.flaggedByAdmin
                            ? 'bg-rose-50 border border-rose-200 text-rose-950 rounded-tl-xs'
                            : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-xs shadow-xs'
                        }`}>
                          {msg.deletedByAdmin ? (
                            <span className="italic text-neutral-400">
                              [This message was removed by the School Administrator for violating conduct policy.]
                            </span>
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}

                          {/* Admin moderation quick actions */}
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

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW CHANNEL                                                 */}
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
    </div>
  );
};
