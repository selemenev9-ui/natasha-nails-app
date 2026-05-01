import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../utils/config.js';
import { haptic } from '../utils/haptic.js';
import styles from './ChatDrawer.module.css';

// ── SVG иконки ───────────────────────────────────────────────────────────
function IconBack() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18L9 12L15 6" />
    </svg>
  );
}

function IconSmile() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5s1 1.5 3.5 1.5 3.5-1.5 3.5-1.5" />
      <circle cx="9.5" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IconMic({ active }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
      stroke={active ? '#FF3B30' : 'currentColor'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M19 10a7 7 0 0 1-14 0" />
      <path d="M12 19v3M8 22h8" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: 'rotate(45deg) translateY(-1px)' }}>
      <path d="M12 19V5" />
      <path d="M5 12L12 5L19 12" />
    </svg>
  );
}

const BookingCard = memo(function BookingCard({ raw }) {
  let data = {};
  try {
    data = JSON.parse(raw);
  } catch {}
  const { service_title, date, price } = data;
  const formatted = date
    ? new Date(date).toLocaleString('ru-RU', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';
  return (
    <div className={styles.bookingCard}>
      <div className={styles.bookingCardHeader}>
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#4CD964" strokeWidth="2" strokeLinecap="round">
          <path d="M2 8L6 12L14 4" />
        </svg>
        <span>Запись создана</span>
      </div>
      <p className={styles.bookingCardService}>{service_title || '—'}</p>
      <div className={styles.bookingCardMeta}>
        <span>{formatted}</span>
        <span>{price} ₽</span>
      </div>
    </div>
  );
});

const AudioBubble = memo(function AudioBubble({ url }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play()?.then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const formatTime = (sec) => {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    const minutes = Math.floor(sec / 60).toString().padStart(2, '0');
    const seconds = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180 }}>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={(e) => {
          const current = e.target.currentTime;
          const total = e.target.duration || 1;
          setProgress(Math.min(current / total, 1));
        }}
        onLoadedMetadata={(e) => setDuration(e.target.duration || 0)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
      />
      <motion.button
        type="button"
        onClick={toggle}
        whileTap={{ scale: 0.88 }}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(237,244,255,0.9)',
          flexShrink: 0
        }}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M8 5l11 7-11 7V5z" />
          </svg>
        )}
      </motion.button>
      <div style={{ flex: 1 }}>
        <div style={{
          height: 3,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            borderRadius: 2,
            background: 'rgba(140,200,255,0.7)',
            width: `${progress * 100}%`,
            transition: 'width 0.1s'
          }} />
        </div>
        <div style={{ fontSize: 10, color: 'rgba(140,200,255,0.5)', marginTop: 3 }}>
          {playing ? formatTime(audioRef.current?.currentTime || 0) : formatTime(duration)}
        </div>
      </div>
    </div>
  );
});

const EMOJIS = [
  '😊','❤️','💅','✨','🌸','💕','👍','🙏','🔥','😍',
  '💖','🥰','😘','💋','🌺','🌷','💐','🎀','👏','🫶',
  '💯','🙌','😁','🥳','🤩','💎','👑','🌟','⭐','✅',
  '😂','🫠','🤗','😇','🥹','💃','🎉','🍀','🫐','🦋'
];

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

export default function ChatDrawer({ appointmentId, currentUserId, currentUserName, contactName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const typingRef = useRef(0);
  const prevCountRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micError, setMicError] = useState(null);
  const [sendError, setSendError] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const sendErrorTimerRef = useRef(null);
  const stopRequestedRef = useRef(false);
  const swipeReplyRef = useRef({ active: false });
  const [reactionPicker, setReactionPicker] = useState({ messageId: null, x: 0, y: 0 });
  const holdTimerRef = useRef(null);
  const pollIntervalRef = useRef(10000);
  const pollTimerRef = useRef(null);
  const lastTsRef = useRef(0);
  const hasMoreRef = useRef(false);
  const oldestTsRef = useRef(null);
  const isLoadingOlderRef = useRef(false);
  const scrollContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);

  const load = async (forceFull = false, beforeTs = 0) => {
    if (!appointmentId) return;
    try {
      const viewerQuery = currentUserId ? `&viewer_id=${currentUserId}` : '';
      const sinceQuery = !forceFull && !beforeTs && lastTsRef.current > 0 ? `&since_ts=${lastTsRef.current}` : '';
      const beforeQuery = beforeTs > 0 ? `&before_ts=${beforeTs}` : '';
      const res = await fetch(`${API_URL}?action=get_messages&appointment_id=${appointmentId}${viewerQuery}${sinceQuery}${beforeQuery}`);
      if (res.status === 503) {
        pollIntervalRef.current = Math.min(pollIntervalRef.current * 2, 120000);
        return;
      }
      if (!res.ok) throw new Error('not_ok');
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        if (data.incremental) {
          if (data.messages.length > 0) {
            setMessages((prev) => {
              const newIds = new Set(data.messages.map((m) => m.id));
              const base = prev.filter((m) => !m._pending && !newIds.has(m.id));
              return [...base, ...data.messages];
            });
            const maxTs = Math.max(...data.messages.map((m) => Number(m.created_at)));
            if (maxTs > lastTsRef.current) lastTsRef.current = maxTs;
          }
        } else if (beforeTs > 0) {
          setMessages((prev) => [...data.messages, ...prev]);
          if (data.messages.length > 0) {
            const minTs = Math.min(...data.messages.map((m) => Number(m.created_at)));
            oldestTsRef.current = minTs;
          }
          hasMoreRef.current = data.has_more === true;
        } else {
          setMessages(data.messages);
          hasMoreRef.current = data.has_more === true;
          if (data.messages.length > 0) {
            const maxTs = Math.max(...data.messages.map((m) => Number(m.created_at)));
            lastTsRef.current = maxTs;
            const minTs = Math.min(...data.messages.map((m) => Number(m.created_at)));
            oldestTsRef.current = minTs;
          }
        }
      }
      setPeerTyping((data.typing || []).length > 0);
      pollIntervalRef.current = 10000;
    } catch {
      setPeerTyping(false);
      pollIntervalRef.current = Math.min(pollIntervalRef.current * 2, 120000);
    }
  };

  const loadOlder = async () => {
    if (!hasMoreRef.current || isLoadingOlderRef.current || !oldestTsRef.current) return;
    isLoadingOlderRef.current = true;
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    await load(false, oldestTsRef.current);
    isLoadingOlderRef.current = false;
    if (container) {
      const newScrollHeight = container.scrollHeight;
      container.scrollTop = newScrollHeight - prevScrollHeight;
    }
  };

  useEffect(() => {
    if (!appointmentId || !currentUserId) return;
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', appointment_id: appointmentId, viewer_id: currentUserId })
    }).catch(() => {});
  }, [appointmentId, currentUserId]);

  useEffect(() => {
    lastTsRef.current = 0;
    oldestTsRef.current = null;
    hasMoreRef.current = false;
    pollIntervalRef.current = 10000;
    const schedule = () => {
      pollTimerRef.current = setTimeout(async () => {
        await load();
        schedule();
      }, pollIntervalRef.current);
    };
    load();
    schedule();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        load().then(() => schedule());
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [appointmentId, currentUserId]);

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: isLoadingOlderRef.current ? 'auto' : 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
      if (scrollTop < 80 && hasMoreRef.current && !isLoadingOlderRef.current) {
        loadOlder();
      }
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [appointmentId]);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    if (prevCount !== null && messages.length > prevCount) {
      if (isLoadingOlderRef.current) {
        prevCountRef.current = messages.length;
        return;
      }
      const newest = messages[messages.length - 1];
      if (newest && String(newest.sender_id) !== String(currentUserId)) {
        haptic.medium?.();
        fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mark_read',
            appointment_id: appointmentId,
            viewer_id: currentUserId
          })
        }).catch(() => {});
      }
    }
    prevCountRef.current = messages.length;
  }, [messages, currentUserId, appointmentId]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }, [text]);

  const showSendError = () => {
    setSendError('Не удалось отправить сообщение. Попробуй ещё раз');
    if (sendErrorTimerRef.current) {
      clearTimeout(sendErrorTimerRef.current);
    }
    sendErrorTimerRef.current = setTimeout(() => {
      setSendError(null);
      sendErrorTimerRef.current = null;
    }, 3000);
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    const msgText = text.trim();
    const replyRef = replyTo;
    const tempId = `temp_${Date.now()}`;
    const tempMsg = {
      id: tempId, sender_id: String(currentUserId), sender_name: currentUserName,
      text: msgText, created_at: Math.floor(Date.now() / 1000),
      is_read: false, reactions: [],
      reply_to_id: replyRef?.id || null, reply_to_text: replyRef?.text || null,
      _pending: true
    };
    setMessages((prev) => [...prev, tempMsg]);
    setText('');
    setShowEmoji(false);
    setReplyTo(null);
    setSending(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          appointment_id: appointmentId,
          sender_id: currentUserId,
          sender_name: currentUserName,
          text: msgText,
          reply_to_id: replyRef?.id || null,
          reply_to_text: replyRef?.text || null
        })
      });
      if (!res.ok) throw new Error('send_message_failed');
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(msgText);
      showSendError();
    }
    setSending(false);
  };

  const compressImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const sendPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || sending) return;
    setSending(true);
    try {
      const dataUrl = await compressImage(file);
      const base64 = dataUrl.split(',')[1];
      const uploadRes = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_photo',
          image_base64: base64,
          content_type: 'image/jpeg',
          appointment_id: appointmentId
        })
      });
      if (!uploadRes.ok) throw new Error('upload_photo_failed');
      const { url } = await uploadRes.json();
      if (url) {
        const tempId = `temp_${Date.now()}`;
        const replyRef = replyTo;
        setMessages((prev) => [...prev, {
          id: tempId,
          sender_id: String(currentUserId),
          sender_name: currentUserName,
          text: `[photo]${url}`,
          created_at: Math.floor(Date.now() / 1000),
          is_read: false,
          reactions: [],
          reply_to_id: replyRef?.id || null,
          reply_to_text: replyRef?.text || null,
          _pending: true
        }]);
        setReplyTo(null);
        fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_message',
            appointment_id: appointmentId,
            sender_id: currentUserId,
            sender_name: currentUserName,
            text: `[photo]${url}`,
            reply_to_id: replyRef?.id || null,
            reply_to_text: replyRef?.text || null
          })
        }).catch(() => {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          showSendError();
        });
      }
    } catch {
      showSendError();
    }
    setSending(false);
    e.target.value = '';
  };

  const sendAudio = async (blob, mimeType) => {
    setSending(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error('no audio data'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const uploadRes = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_audio',
          audio_base64: base64,
          appointment_id: appointmentId,
          content_type: mimeType || 'audio/webm'
        })
      });
      if (!uploadRes.ok) throw new Error('upload_audio_failed');
      const { url } = await uploadRes.json();
      if (url) {
        const tempId = `temp_${Date.now()}`;
        const replyRef = replyTo;
        setMessages((prev) => [...prev, {
          id: tempId,
          sender_id: String(currentUserId),
          sender_name: currentUserName,
          text: `[audio]${url}`,
          created_at: Math.floor(Date.now() / 1000),
          is_read: false,
          reactions: [],
          reply_to_id: replyRef?.id || null,
          reply_to_text: replyRef?.text || null,
          _pending: true
        }]);
        setReplyTo(null);
        fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_message',
            appointment_id: appointmentId,
            sender_id: currentUserId,
            sender_name: currentUserName,
            text: `[audio]${url}`,
            reply_to_id: replyRef?.id || null,
            reply_to_text: replyRef?.text || null
          })
        }).catch(() => {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          showSendError();
        });
      }
    } catch {
      showSendError();
    }
    setSending(false);
  };

  const startRecording = async () => {
    if (recording || !navigator?.mediaDevices?.getUserMedia) return;
    stopRequestedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (stopRequestedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4'
      ].find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const mediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, mediaRecorderOptions);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = async () => {
        const chunks = [...audioChunksRef.current];
        audioChunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        await sendAudio(blob, mimeType);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingTime(0);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
      haptic.medium?.();
    } catch (err) {
      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError'
      ) {
        setMicError('Разрешите доступ к микрофону в настройках');
      } else if (err?.name === 'NotFoundError') {
        setMicError('Микрофон не найден');
      } else {
        setMicError('Не удалось начать запись');
      }
      setTimeout(() => setMicError(null), 3000);
    }
  };

  const stopRecording = () => {
    stopRequestedRef.current = true;
    if (!mediaRecorderRef.current) {
      setRecording(false);
      setRecordingTime(0);
      return;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    try {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch {}
    setRecording(false);
    setRecordingTime(0);
  };

  const cancelRecording = () => {
    stopRequestedRef.current = true;
    if (!mediaRecorderRef.current && !recordingTimerRef.current) {
      setRecording(false);
      setRecordingTime(0);
      return;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current = null;
    }
    setRecording(false);
    setRecordingTime(0);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const insertEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleTextChange = (e) => {
    const next = e.target.value;
    setText(next);
    if (!appointmentId || !currentUserId) return;
    const now = Date.now();
    if (typingRef.current && now - typingRef.current < 10000) return;
    typingRef.current = now;
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_typing', room_id: appointmentId, user_id: currentUserId })
    }).catch(() => {});
  };

  const formatTs = (ts) => {
    if (!ts) return '';
    const ms = ts > 1e10 ? ts : ts * 1000;
    return new Date(ms).toLocaleTimeString('ru-RU', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMsgDate = (ts) => {
    if (!ts) return '';
    const ms = ts > 1e10 ? ts : ts * 1000;
    const d = new Date(ms);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return 'Сегодня';
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const displayName = contactName || 'Чат';
  const hasText = text.trim().length > 0;

  const describeContent = (raw) => {
    if (!raw) return { type: 'text', preview: '', raw: '' };
    if (raw.startsWith('[photo]')) return { type: 'photo', preview: '📷 Фото', raw };
    if (raw.startsWith('[audio]')) return { type: 'audio', preview: '🎤 Голосовое', raw };
    return { type: 'text', preview: raw, raw };
  };

  const startReply = (msg) => {
    if (!msg) return;
    const meta = describeContent(msg.text || '');
    setReplyTo({
      id: msg.id,
      text: msg.text || '',
      preview: meta.preview || (msg.text || ''),
      sender_name: msg.sender_name || 'Собеседник',
      type: meta.type
    });
  };

  const handleReplyPointerDown = (msg, event) => {
    const pointer = event?.touches?.[0] || event;
    const clientX = pointer?.clientX ?? 0;
    const clientY = pointer?.clientY ?? 0;
    swipeReplyRef.current = {
      startX: clientX,
      startY: clientY,
      triggered: false,
      message: msg,
      element: event.currentTarget
    };
  };

  const handleReplyPointerMove = (event) => {
    if (!swipeReplyRef.current.startX) return;
    const pointer = event?.touches?.[0] || event;
    const clientX = pointer?.clientX ?? 0;
    const clientY = pointer?.clientY ?? 0;
    const delta = clientX - swipeReplyRef.current.startX;
    const deltaY = Math.abs(clientY - (swipeReplyRef.current.startY || clientY));
    if (deltaY > 20) {
      if (swipeReplyRef.current.element) {
        swipeReplyRef.current.element.style.transition = 'transform 0.2s ease';
        swipeReplyRef.current.element.style.transform = '';
      }
      swipeReplyRef.current = {};
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      return;
    }
    if (Math.abs(delta) > 8 && holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (delta > 0 && swipeReplyRef.current.element) {
      const offset = Math.min(delta, 70);
      swipeReplyRef.current.element.style.transition = 'none';
      swipeReplyRef.current.element.style.transform = `translateX(${offset}px)`;
    }
    if (delta > 40) {
      swipeReplyRef.current.triggered = true;
    }
  };

  const handleReplyPointerUp = () => {
    if (swipeReplyRef.current.element) {
      swipeReplyRef.current.element.style.transition = 'transform 0.25s ease';
      swipeReplyRef.current.element.style.transform = '';
    }
    if (swipeReplyRef.current.triggered && swipeReplyRef.current.message) {
      startReply(swipeReplyRef.current.message);
    }
    swipeReplyRef.current = {};
  };

  const closeReactionPicker = () => setReactionPicker({ messageId: null, x: 0, y: 0 });

  const handleReactionToggle = async (messageId, emoji, hasReaction) => {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m;
      const reactions = m.reactions || [];
      if (hasReaction) {
        return {
          ...m,
          reactions: reactions.filter(
            (r) => !(r.emoji === emoji && String(r.user_id) === String(currentUserId))
          )
        };
      }
      return {
        ...m,
        reactions: [...reactions, { emoji, user_id: String(currentUserId) }]
      };
    }));
    closeReactionPicker();

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: hasReaction ? 'remove_reaction' : 'add_reaction',
          message_id: messageId,
          user_id: currentUserId,
          emoji
        })
      });
    } catch {}
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null;
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        } catch {}
        mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
      }
      if (sendErrorTimerRef.current) {
        clearTimeout(sendErrorTimerRef.current);
        sendErrorTimerRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        <motion.div
          className={styles.drawer}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        >
          {/* ── Header ── */}
          <div className={styles.header}>
            <motion.button
              type="button"
              onClick={onClose}
              className={styles.backButton}
              whileTap={{ scale: 0.88 }}
            >
              <IconBack />
            </motion.button>
            <div className={styles.avatarWrap}>
              <div className={styles.avatar}>N</div>
              <span className={styles.onlineDot} />
            </div>
            <div className={styles.headerInfo}>
              <p className={styles.headerTitle}>{displayName}</p>
              <p className={styles.headerSubtitle}>Онлайн</p>
            </div>
          </div>

          {/* ── Messages ── */}
          <div className={styles.messageList} ref={scrollContainerRef}>
            {messages.length === 0 && (
              <motion.div
                className={styles.emptyState}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className={styles.emptyIcon}>
                  <svg viewBox="0 0 48 48" width="48" height="48" fill="none"
                    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 8h28a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H18l-8 8v-8a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z" />
                    <path d="M17 21h14M17 27h8" />
                  </svg>
                </div>
                <p>Начните диалог</p>
                <span>Напишите Наташе — она ответит!</span>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m, index) => {
                const prev = messages[index - 1];
                const curMs = m.created_at > 1e10 ? m.created_at : m.created_at * 1000;
                const prevMs = prev?.created_at
                  ? (prev.created_at > 1e10 ? prev.created_at : prev.created_at * 1000)
                  : null;
                const showDate = !prevMs || new Date(curMs).toDateString() !== new Date(prevMs).toDateString();
                const isOwn = String(m.sender_id) === String(currentUserId);
                const replyMeta = describeContent(m.reply_to_text || '');

                return (
                  <motion.div
                    key={m.id || `${curMs}-${index}`}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  >
                    {showDate && (
                      <div className={styles.dateDivider}>
                        <span className={styles.dateLine} />
                        <span className={styles.dateLabel}>{formatMsgDate(m.created_at)}</span>
                        <span className={styles.dateLine} />
                      </div>
                    )}
                    <div className={`${styles.messageGroup} ${isOwn ? styles.messageGroupOwn : styles.messageGroupPeer}`}>
                      {!isOwn && (
                        <span className={styles.senderName}>{m.sender_name || 'Собеседник'}</span>
                      )}
                      <div
                        className={`${styles.bubble} ${isOwn ? styles.bubbleOwner : styles.bubblePeer}`}
                        style={{ ...(m._pending ? { opacity: 0.6 } : {}), touchAction: 'pan-y' }}
                        onPointerDown={(e) => {
                          try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                          handleReplyPointerDown(m, e);
                          if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                          const rect = e.currentTarget.getBoundingClientRect();
                          holdTimerRef.current = setTimeout(() => {
                            setReactionPicker({ messageId: m.id, x: rect.left + rect.width / 2, y: rect.top - 10 });
                          }, 500);
                        }}
                        onPointerMove={handleReplyPointerMove}
                        onPointerUp={(e) => {
                          handleReplyPointerUp();
                          if (holdTimerRef.current) {
                            clearTimeout(holdTimerRef.current);
                            holdTimerRef.current = null;
                          }
                        }}
                        onPointerLeave={() => {
                          handleReplyPointerUp();
                          if (holdTimerRef.current) {
                            clearTimeout(holdTimerRef.current);
                            holdTimerRef.current = null;
                          }
                        }}
                        onPointerCancel={() => {
                          handleReplyPointerUp();
                          if (holdTimerRef.current) {
                            clearTimeout(holdTimerRef.current);
                            holdTimerRef.current = null;
                          }
                        }}
                        onDoubleClick={() => startReply(m)}
                      >
                        {m.reply_to_text && (
                          <div
                            style={{
                              display: 'flex',
                              gap: 10,
                              alignItems: 'flex-start',
                              padding: '6px 10px',
                              marginBottom: 6,
                              borderRadius: 10,
                              background: 'rgba(0,0,0,0.12)'
                            }}
                          >
                            <span
                              style={{
                                width: 3,
                                borderRadius: 2,
                                background: 'rgba(140,200,255,0.8)',
                                flexShrink: 0,
                                minHeight: 32
                              }}
                            />
                            <div>
                              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Ответ</p>
                              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                                {replyMeta.preview}
                              </p>
                            </div>
                          </div>
                        )}
                        {m.text?.startsWith('[booking_card]') ? (
                          <BookingCard raw={m.text.replace('[booking_card]', '')} />
                        ) : m.text?.startsWith('[photo]') ? (
                          <img
                            src={m.text.replace('[photo]', '')}
                            alt="фото"
                            className={styles.bubbleImage}
                            onClick={() => setLightboxUrl(m.text.replace('[photo]', ''))}
                          />
                        ) : m.text?.startsWith('[audio]') ? (
                          <AudioBubble url={m.text.replace('[audio]', '')} />
                        ) : (
                          m.text
                        )}
                      </div>
                      <div className={`${styles.metaRow} ${isOwn ? styles.metaRowOwn : ''}`}>
                        <span className={styles.timestamp}>{formatTs(m.created_at)}</span>
                        {isOwn && (
                          <span className={`${styles.readStatus} ${m.is_read ? styles.read : styles.unread}`}>
                            {m.is_read ? (
                              <svg viewBox="0 0 16 10" width="16" height="10" fill="none">
                                <path d="M1 5L5 9L11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M6 5L10 9L15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 12 10" width="12" height="10" fill="none">
                                <path d="M1 5L5 9L11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                        )}
                      </div>
                      {m.reactions && m.reactions.length > 0 && (
                        <div className={styles.reactionBar}>
                          {[...new Map(m.reactions.map((r) => [r.emoji, r])).keys()].map((emoji) => {
                            const count = m.reactions.filter((r) => r.emoji === emoji).length;
                            const has = m.reactions.some((r) => r.emoji === emoji && String(r.user_id) === String(currentUserId));
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleReactionToggle(m.id, emoji, has)}
                                className={`${styles.reactionPill} ${has ? styles.reactionPillActive : ''}`}
                              >
                                <span>{emoji}</span>
                                <span>{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <AnimatePresence>
              {peerTyping && (
                <motion.div
                  className={styles.typingWrap}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={styles.typingBubble}>
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          <AnimatePresence>
            {sendError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  position: 'absolute',
                  left: 16,
                  right: 16,
                  bottom: 90,
                  padding: '10px 16px',
                  background: 'rgba(255,59,48,0.85)',
                  borderRadius: 14,
                  color: '#fff',
                  fontSize: 14,
                  boxShadow: '0 10px 30px rgba(255,59,48,0.35)'
                }}
              >
                {sendError}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  margin: '0 16px 12px',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    width: 4,
                    borderRadius: 3,
                    background: 'rgba(140,200,255,0.85)',
                    alignSelf: 'stretch'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                    {replyTo.sender_name || 'Собеседник'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.95)' }}>
                    {replyTo.preview || replyTo.text}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  style={{
                    border: 'none',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: 16,
                    lineHeight: '28px'
                  }}
                >
                  ×
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Emoji Panel ── */}
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                key="emoji-panel"
                className={styles.emojiPanel}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <div className={styles.emojiGrid}>
                  {EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className={styles.emojiButton}
                      onClick={() => { setText((t) => t + em); setShowEmoji(false); inputRef.current?.focus(); }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Input Bar ── */}
          <div className={styles.inputBar}>
            <motion.button
              type="button"
              onClick={() => setShowEmoji((v) => !v)}
              className={`${styles.iconButton} ${showEmoji ? styles.iconButtonActive : ''}`}
              whileTap={{ scale: 0.86 }}
            >
              <IconSmile />
            </motion.button>
            {!hasText && !recording && (
              <label className={styles.iconButton} style={{ cursor: 'pointer' }}>
                <input type="file" accept="image/*" className={styles.fileInput} onChange={sendPhoto} />
                <IconCamera />
              </label>
            )}
            {recording ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}
              >
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF3B30' }}
                />
                <span style={{ color: 'rgba(237,244,255,0.8)', fontSize: 15 }}>
                  {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
                </span>
                <span style={{ flex: 1, color: 'rgba(140,200,255,0.4)', fontSize: 13 }}>
                  Отпустите чтобы отправить
                </span>
                <button type="button" onClick={cancelRecording} className={styles.iconButton}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            ) : (
              <textarea
                ref={inputRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKey}
                placeholder="Написать..."
                rows={1}
                className={styles.textarea}
              />
            )}
            {hasText ? (
              <motion.button
                type="button"
                onClick={send}
                disabled={sending || !hasText}
                className={`${styles.sendButton} ${hasText ? styles.sendButtonActive : ''}`}
                whileTap={{ scale: 0.88 }}
                animate={hasText ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <IconSend />
              </motion.button>
            ) : (
              <motion.button
                type="button"
                className={`${styles.sendButton} ${recording ? styles.sendButtonRecording : ''}`}
                onPointerDown={startRecording}
                onPointerUp={stopRecording}
                onPointerCancel={cancelRecording}
                onPointerLeave={(e) => { if (recording && e.buttons === 0) stopRecording(); }}
                whileTap={{ scale: 0.9 }}
                animate={recording ? {
                  scale: [1, 1.15, 1],
                  boxShadow: ['0 0 0 0 rgba(255,59,48,0)', '0 0 0 12px rgba(255,59,48,0.3)', '0 0 0 0 rgba(255,59,48,0)']
                } : { scale: 1, boxShadow: '0 0 0 0 rgba(255,59,48,0)' }}
                transition={recording ? { duration: 1, repeat: Infinity } : { duration: 0.2 }}
                disabled={sending}
              >
                <IconMic active={recording} />
              </motion.button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {reactionPicker.messageId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeReactionPicker}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 250,
              background: 'transparent'
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: reactionPicker.x - 120,
                top: Math.max(reactionPicker.y - 60, 60),
                width: 240,
                padding: '10px 12px',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.8)',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 6
              }}
            >
              {QUICK_REACTIONS.map((emoji) => {
                const message = messages.find((msg) => msg.id === reactionPicker.messageId);
                const hasReaction = message?.reactions?.some(
                  (r) => r.emoji === emoji && String(r.user_id) === String(currentUserId)
                );
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReactionToggle(reactionPicker.messageId, emoji, hasReaction)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: 'none',
                      background: hasReaction ? 'rgba(255,255,255,0.2)' : 'transparent',
                      color: '#fff',
                      fontSize: 20,
                      cursor: 'pointer'
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxUrl(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 300,
              background: 'rgba(0,0,0,0.92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(12px)'
            }}
          >
            <motion.img
              src={lightboxUrl}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: 16, objectFit: 'contain' }}
              onClick={(e) => e.stopPropagation()}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.y) > 80) setLightboxUrl(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
