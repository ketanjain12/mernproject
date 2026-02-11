import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Layout from '../components/Layout';
import client from '../api/client';
import toast from 'react-hot-toast';

function formatTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '';
  }
}

function makeTempId() {
  return `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getOtherMember(room, meId) {
  if (!room || room.type !== 'direct') return null;
  const mems = Array.isArray(room.members) ? room.members : [];
  return mems.find((m) => Number(m.id) !== Number(meId)) || null;
}

function initials(name) {
  const n = String(name || '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || '?';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (a + b).toUpperCase();
}

function Avatar({ name }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-slate-200 dark:text-slate-900">
      {initials(name)}
    </div>
  );
}

function IconButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="grid h-10 w-10 place-items-center rounded-xl border bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
    >
      {children}
    </button>
  );
}

function CircleDot({ className = '' }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${className}`} />;
}

export default function ChatPage() {
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);

  const listRef = useRef(null);
  const socketRef = useRef(null);
  const joinedRoomIdRef = useRef(null);
  const activeRoomIdRef = useRef(null);
  const fileInputRef = useRef(null);

  const token = useMemo(() => localStorage.getItem('token') || '', []);
  const me = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }, []);

  const activeRoom = useMemo(() => rooms.find((r) => Number(r.id) === Number(activeRoomId)) || null, [rooms, activeRoomId]);
  const activeRoomTitle = useMemo(() => {
    if (!activeRoom) return 'Chat';
    if (activeRoom.type === 'group') return activeRoom.name || 'Group';
    const other = getOtherMember(activeRoom, me?.id);
    return other?.name || 'Direct Chat';
  }, [activeRoom, me]);

  const activeOther = useMemo(() => getOtherMember(activeRoom, me?.id), [activeRoom, me]);

  const loadRooms = async () => {
    try {
      const res = await client.get('/chat/rooms');
      setRooms(res.data || []);
      if (!activeRoomId && (res.data || []).length > 0) {
        setActiveRoomId(res.data[0].id);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load rooms');
    }
  };

  const loadUsers = async () => {
    try {
      const res = await client.get('/chat/users', { params: { q } });
      setUsers(res.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load users');
    }
  };

  const loadMessages = async (roomId) => {
    if (!roomId) return;
    try {
      const res = await client.get(`/chat/rooms/${roomId}/messages`, { params: { limit: 50 } });
      setMessages(res.data || []);
      try {
        await client.post(`/chat/rooms/${roomId}/read`);
      } catch (_) {}
      setRooms((prev) => prev.map((r) => (Number(r.id) === Number(roomId) ? { ...r, unreadCount: 0 } : r)));
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 0);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load messages');
    }
  };

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (!activeRoomId) return;
    activeRoomIdRef.current = activeRoomId;
    loadMessages(activeRoomId);

    if (socketRef.current && socketRef.current.connected) {
      const prev = joinedRoomIdRef.current;
      if (prev && Number(prev) !== Number(activeRoomId)) {
        socketRef.current.emit('room:leave', { roomId: prev });
      }
      socketRef.current.emit('room:join', { roomId: activeRoomId });
      joinedRoomIdRef.current = activeRoomId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId]);

  useEffect(() => {
    if (!token) return;

    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    const joinActiveRoomIfNeeded = () => {
      const rid = activeRoomIdRef.current;
      if (!rid) return;
      const prev = joinedRoomIdRef.current;
      if (prev && Number(prev) !== Number(rid)) {
        socket.emit('room:leave', { roomId: prev });
      }
      socket.emit('room:join', { roomId: rid });
      joinedRoomIdRef.current = rid;
    };

    socket.on('connect', () => {
      joinActiveRoomIfNeeded();
    });

    socket.on('connect_error', () => {
      // ignore noisy errors
    });

    socket.on('room:message', (msg) => {
      const rid = Number(msg?.room_id);
      if (!rid) return;

      const tempId = msg?.tempId ? String(msg.tempId) : '';

      setRooms((prev) =>
        prev.map((r) => {
          if (Number(r.id) !== rid) return r;
          const mine = Number(msg.sender_id) === Number(me?.id);
          const isActive = Number(activeRoomId) === rid;
          const nextUnread = isActive || mine ? 0 : Math.min(999, Number(r.unreadCount || 0) + 1);
          return {
            ...r,
            lastMessage: { id: msg.id, sender_id: msg.sender_id, body: msg.body, created_at: msg.created_at },
            unreadCount: nextUnread,
          };
        })
      );

      if (Number(activeRoomIdRef.current) === rid) {
        if (tempId) {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => String(m.id) === tempId);
            if (idx === -1) return [...prev, msg];
            const next = prev.slice();
            next[idx] = msg;
            return next;
          });
        } else {
          setMessages((prev) => [...prev, msg]);
        }
        try {
          client.post(`/chat/rooms/${rid}/read`).catch(() => {});
        } catch (_) {}
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        }, 0);
      }
    });

    return () => {
      try {
        const prev = joinedRoomIdRef.current;
        if (prev) {
          socket.emit('room:leave', { roomId: prev });
        }
        socket.disconnect();
      } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const startDirect = async (userId) => {
    try {
      const res = await client.post('/chat/rooms/direct', { userId });
      const room = res.data;
      setRooms((prev) => {
        const exists = prev.some((r) => Number(r.id) === Number(room.id));
        return exists ? prev : [room, ...prev];
      });
      setActiveRoomId(room.id);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to start chat');
    }
  };

  const toggleGroupMember = (id) => {
    setGroupMembers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createGroup = async () => {
    try {
      const res = await client.post('/chat/rooms/group', { name: groupName, memberIds: groupMembers });
      const room = res.data;
      setRooms((prev) => [room, ...prev]);
      setActiveRoomId(room.id);
      setGroupOpen(false);
      setGroupName('');
      setGroupMembers([]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create group');
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!activeRoomId) return;

    if (!text && !attachment) return;

    const tempId = makeTempId();
    let uploaded = null;

    if (attachment) {
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', attachment);
        const res = await client.post('/chat/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploaded = res.data;
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Upload failed');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const optimistic = {
      id: tempId,
      room_id: activeRoomId,
      sender_id: me?.id,
      sender_name: me?.name,
      sender_role: me?.role,
      body: text,
      created_at: new Date().toISOString(),
      _optimistic: true,
      attachment_url: uploaded?.url,
      attachment_name: uploaded?.name,
      attachment_mime: uploaded?.mime,
      attachment_size: uploaded?.size,
    };

    setMessages((prev) => [...prev, optimistic]);
    setRooms((prev) =>
      prev.map((r) =>
        Number(r.id) === Number(activeRoomId)
          ? { ...r, lastMessage: { id: tempId, sender_id: me?.id, body: text, created_at: optimistic.created_at }, unreadCount: 0 }
          : r
      )
    );
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 0);

    setInput('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (socketRef.current) {
      if (socketRef.current.connected) {
        const joined = joinedRoomIdRef.current;
        if (!joined || Number(joined) !== Number(activeRoomId)) {
          socketRef.current.emit('room:join', { roomId: activeRoomId });
          joinedRoomIdRef.current = activeRoomId;
        }
      }
      socketRef.current.emit('room:message', {
        roomId: activeRoomId,
        body: text,
        tempId,
        attachment: uploaded
          ? {
              url: uploaded.url,
              name: uploaded.name,
              mime: uploaded.mime,
              size: uploaded.size,
            }
          : undefined,
      });
      return;
    }

    try {
      const res = await client.post(`/chat/rooms/${activeRoomId}/messages`, {
        body: text,
        attachmentUrl: uploaded?.url,
        attachmentName: uploaded?.name,
        attachmentMime: uploaded?.mime,
        attachmentSize: uploaded?.size,
      });
      setMessages((prev) => {
        const idx = prev.findIndex((m) => String(m.id) === tempId);
        if (idx === -1) return [...prev, res.data];
        const next = prev.slice();
        next[idx] = res.data;
        return next;
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send');
      setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
    }
  };

  return (
    <Layout>
      <div className="rounded-[28px] border bg-white/70 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/55">
        <div className="grid h-[calc(100vh-140px)] min-h-[620px] max-h-[860px] min-h-0 overflow-hidden grid-cols-1 md:grid-cols-[72px_320px_1fr] xl:grid-cols-[72px_320px_1fr_320px]">
          <div className="hidden flex-col items-center justify-between border-r p-3 dark:border-slate-800 md:flex">
            <div className="flex flex-col items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-sm font-semibold text-white dark:bg-slate-200 dark:text-slate-900">
                SS
              </div>
              <IconButton title="Chats" onClick={() => {}}>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </IconButton>
              <IconButton title="Search" onClick={() => {}}>
                <div className="h-4 w-4 rounded-md border border-slate-300 dark:border-slate-700" />
              </IconButton>
              <IconButton title="Settings" onClick={() => {}}>
                <div className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-700" />
              </IconButton>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{me?.role || ''}</div>
              <Avatar name={me?.name || 'You'} />
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-col border-b p-4 dark:border-slate-800 md:border-b-0 md:border-r">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-semibold">Messages</div>
                <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  All chats ({rooms.length})
                </div>
              </div>
              {me?.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => setGroupOpen((v) => !v)}
                  className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  + Create group
                </button>
              ) : null}
            </div>

            <div className="mt-3">
              <div className="rounded-2xl border bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={me?.role === 'admin' ? 'Search users/admins...' : 'Search admins...'}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="mt-3 max-h-44 overflow-auto rounded-2xl border bg-white/70 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/40">
                {users.length === 0 ? (
                  <div className="p-3 text-xs text-slate-600 dark:text-slate-300">No users</div>
                ) : (
                  users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => startDirect(u.id)}
                      className="flex w-full items-center gap-3 border-b px-3 py-2 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                    >
                      <Avatar name={u.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{u.name}</div>
                        <div className="truncate text-xs text-slate-600 dark:text-slate-300">{u.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CircleDot className={u.role === 'admin' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'} />
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{u.role}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {groupOpen ? (
              <div className="mt-4 rounded-2xl border bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="text-sm font-semibold">Create group</div>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-900"
                />
                <div className="mt-2 max-h-40 overflow-auto rounded-xl border dark:border-slate-800">
                  {users.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 border-b px-3 py-2 text-sm dark:border-slate-800">
                      <input type="checkbox" checked={groupMembers.includes(u.id)} onChange={() => toggleGroupMember(u.id)} />
                      <span className="flex-1">{u.name}</span>
                      <span className="text-xs text-slate-600 dark:text-slate-300">{u.role}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={createGroup} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupOpen(false)}
                    className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 text-xs font-semibold text-slate-600 dark:text-slate-300">All messages</div>
            <div className="mt-2 flex-1 min-h-0 overflow-auto pr-1">
              {rooms.length === 0 ? (
                <div className="rounded-2xl border bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  Start a new chat from the search above.
                </div>
              ) : (
                rooms.map((r) => {
                  const isActive = Number(r.id) === Number(activeRoomId);
                  const other = getOtherMember(r, me?.id);
                  const title = r.type === 'group' ? r.name : other?.name || 'Direct';
                  const subtitle = r.lastMessage?.body ? r.lastMessage.body : r.type === 'group' ? `${r.members?.length || 0} members` : other?.email;
                  const unread = Number(r.unreadCount || 0);
                  const avatarName = r.type === 'group' ? r.name : other?.name;

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setActiveRoomId(r.id)}
                      className={
                        'mb-2 w-full rounded-2xl border p-3 text-left shadow-sm transition ' +
                        (isActive
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-200'
                          : 'bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900')
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={avatarName} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-sm font-semibold">{title}</div>
                            <div className="flex items-center gap-2">
                              {unread > 0 ? (
                                <div
                                  className={
                                    'min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold ' +
                                    (isActive ? 'bg-white text-slate-900' : 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900')
                                  }
                                  title="Unread"
                                >
                                  {unread > 99 ? '99+' : unread}
                                </div>
                              ) : null}
                              <div className={isActive ? 'text-[10px] text-white/80' : 'text-[10px] text-slate-500 dark:text-slate-400'}>
                                {r.lastMessage?.created_at ? formatTime(r.lastMessage.created_at) : ''}
                              </div>
                            </div>
                          </div>
                          <div className={isActive ? 'mt-1 truncate text-xs text-white/80' : 'mt-1 truncate text-xs text-slate-600 dark:text-slate-300'}>
                            {subtitle}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="border-b p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {activeRoom ? <Avatar name={activeRoom.type === 'group' ? activeRoom.name : activeOther?.name} /> : <Avatar name="Chat" />}
                  <div>
                    <div className="text-lg font-semibold">{activeRoomTitle}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      {activeRoom?.type === 'group'
                        ? `${activeRoom?.members?.length || 0} members`
                        : activeRoom?.type === 'direct'
                          ? activeOther?.role
                            ? `Direct • ${activeOther.role}`
                            : 'Direct'
                          : 'Select a chat'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadRooms}
                    className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-950"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="relative flex-1 min-h-0 overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 25px 25px, rgba(148,163,184,0.18) 2px, transparent 2px), radial-gradient(circle at 60px 60px, rgba(148,163,184,0.12) 2px, transparent 2px)',
                  backgroundSize: '90px 90px',
                }}
              />

              <div ref={listRef} className="relative z-10 h-full overflow-auto p-4">
                {activeRoomId ? (
                  messages.length === 0 ? (
                    <div className="rounded-2xl border bg-white/70 p-4 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200">
                      No messages yet. Say hi!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((m) => {
                        const mine = Number(m.sender_id) === Number(me?.id);
                        return (
                          <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                            <div className={mine ? 'flex max-w-[85%] flex-row-reverse items-end gap-2' : 'flex max-w-[85%] items-end gap-2'}>
                              {!mine ? <Avatar name={m.sender_name || 'User'} /> : null}
                              <div
                                className={
                                  'rounded-[22px] px-4 py-2 text-sm shadow-sm ' +
                                  (mine
                                    ? 'bg-slate-900 text-white'
                                    : 'border bg-white/90 text-slate-900 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100')
                                }
                              >
                                {!mine ? (
                                  <div className="mb-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                    {m.sender_name || 'User'}
                                  </div>
                                ) : null}
                                {m.attachment_url ? (
                                  <div className="mb-2">
                                    {String(m.attachment_mime || '').startsWith('image/') ? (
                                      <a href={m.attachment_url} target="_blank" rel="noreferrer">
                                        <img
                                          src={m.attachment_url}
                                          alt={m.attachment_name || 'image'}
                                          className="max-h-56 w-full rounded-xl border object-cover dark:border-slate-800"
                                          loading="lazy"
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        href={m.attachment_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between gap-3 rounded-xl border bg-white/70 px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100"
                                      >
                                        <span className="truncate">{m.attachment_name || 'Attachment'}</span>
                                        <span className="text-[10px] text-slate-600 dark:text-slate-300">Open</span>
                                      </a>
                                    )}
                                  </div>
                                ) : null}

                                {m.body ? <div className="whitespace-pre-wrap break-words break-all">{m.body}</div> : null}
                                <div
                                  className={
                                    mine
                                      ? 'mt-1 text-right text-[10px] text-white/70'
                                      : 'mt-1 text-right text-[10px] text-slate-500 dark:text-slate-400'
                                  }
                                >
                                  {m.created_at ? formatTime(m.created_at) : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="text-sm text-slate-600 dark:text-slate-300">Select a chat to start messaging.</div>
                )}
              </div>
            </div>

            <div className="border-t p-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    if (f.size > 25 * 1024 * 1024) {
                      toast.error('Max file size is 25MB');
                      e.target.value = '';
                      return;
                    }
                    setAttachment(f);
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={!activeRoomId || uploading}
                  className="rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-sm disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950"
                  title="Attach file"
                >
                  Attach
                </button>

                <div className="flex-1 rounded-2xl border bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  {attachment ? (
                    <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border bg-white/70 px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100">
                      <div className="min-w-0 truncate">{attachment.name}</div>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachment(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-[10px] underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') send();
                    }}
                    placeholder={activeRoomId ? 'Type a message...' : 'Select a room...'}
                    disabled={!activeRoomId}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 disabled:opacity-50 dark:placeholder:text-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={send}
                  disabled={!activeRoomId || (!input.trim() && !attachment) || uploading}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Send'}
                </button>
              </div>
            </div>
          </div>

          <div className="hidden border-l p-4 dark:border-slate-800 xl:block">
            <div className="text-sm font-semibold">Details</div>
            {!activeRoom ? (
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">Select a chat to see info.</div>
            ) : activeRoom.type === 'group' ? (
              <>
                <div className="mt-3 rounded-2xl border bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center gap-3">
                    <Avatar name={activeRoom.name} />
                    <div>
                      <div className="font-semibold">{activeRoom.name}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">{activeRoom?.members?.length || 0} members</div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">Members</div>
                  <div className="mt-2 space-y-2">
                    {(activeRoom.members || []).map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl border bg-white/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{m.name}</div>
                          <div className="truncate text-xs text-slate-600 dark:text-slate-300">{m.email}</div>
                        </div>
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{m.role}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mt-3 rounded-2xl border bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center gap-3">
                    <Avatar name={activeOther?.name} />
                    <div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">Direct chat with</div>
                      <div className="mt-0.5 font-semibold">{activeOther?.name || 'User'}</div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{activeOther?.email || ''}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
