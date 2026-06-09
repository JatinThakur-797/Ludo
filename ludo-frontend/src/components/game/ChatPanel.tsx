import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

interface ChatPanelProps {
  code: string;
  user: { id: string; displayName: string } | null;
  activePanel?: 'log' | 'chat';
  setActivePanel?: (panel: 'log' | 'chat') => void;
  variant: 'lobby' | 'game';
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  code,
  user,
  setActivePanel,
  variant,
}) => {
  const { isConnected, subscribe, sendMessage } = useWebSocket();
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat container via scrollTop (avoid window scroll viewport jumps)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Handle WebSocket subscription for chat
  useEffect(() => {
    if (!isConnected || !code) return;

    const chatSub = subscribe(`/topic/room/${code}`, (message: unknown) => {
      const env = message as Record<string, unknown>;
      const eventType = (env.type || env.eventType) as string;
      const data = env.data || env.payload;

      if (eventType === 'CHAT_MESSAGE') {
        const cd = data as { sender?: string; content?: string };
        const senderName = cd.sender || 'Anonymous';
        setChatMessages((p) => [...p, { sender: senderName, content: cd.content || '' }]);

        // Open chat panel automatically if it's from another player
        if (senderName !== user?.displayName) {
          setActivePanel?.('chat');
        }
      }
    });

    return () => {
      chatSub?.unsubscribe();
    };
  }, [isConnected, code, user?.displayName, subscribe, setActivePanel]);

  const handleSendChat = () => {
    if (!chatInput.trim() || !code) return;
    sendMessage(`/app/room/${code}/chat`, { content: chatInput });
    setChatInput('');
  };

  const isLobby = variant === 'lobby';

  const chatBody = (
    <>
      <div
        ref={chatContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 12,
        }}
      >
        {chatMessages.length === 0 && (
          <p style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: isLobby ? 12 : 11,
            marginTop: isLobby ? 50 : 30,
            fontStyle: 'italic'
          }}>
            {isLobby ? 'Say hello to your opponents! 👋' : 'No messages yet'}
          </p>
        )}
        {chatMessages.map((msg, i) => {
          const isMe = msg.sender === user?.displayName;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
                animation: 'slideInUp 0.2s ease-out',
              }}
            >
              <span style={{ fontSize: isLobby ? 10 : 9, color: 'var(--text-muted)', marginBottom: 3, fontWeight: 600 }}>
                {isMe ? 'You' : msg.sender}
              </span>
              <div
                className={isMe ? 'chat-bubble-mine' : 'chat-bubble-other'}
                style={isLobby ? undefined : { fontSize: 12, padding: '6px 12px' }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: isLobby ? 8 : 7, flexShrink: 0 }}>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
          placeholder={isLobby ? 'Type a message...' : 'Message...'}
          className="input-field"
          style={{ fontSize: 13, padding: isLobby ? '12px 16px' : '8px 12px' }}
        />
        <button
          onClick={handleSendChat}
          className="btn-primary"
          style={{
            padding: isLobby ? '10px 16px' : '8px 14px',
            fontSize: 13,
            borderRadius: isLobby ? 12 : 11,
            flexShrink: 0,
          }}
        >
          {isLobby ? 'Send' : '→'}
        </button>
      </div>
    </>
  );

  if (isLobby) {
    return (
      <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', height: 500 }}>
        <div className="section-label">Lobby Chat</div>
        {chatBody}
      </div>
    );
  }

  return <>{chatBody}</>;
};
