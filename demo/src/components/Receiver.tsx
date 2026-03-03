import { useEffect, useState } from 'react';
import { useEventiqContext } from 'eventiq';

interface Message {
  text: string;
  timestamp: number;
}

export function Receiver() {
  const { on } = useEventiqContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pings, setPings] = useState(0);

  useEffect(() => {
    const offMessage = on<Message>('message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    const offPing = on('ping', () => {
      setPings((prev) => prev + 1);
    });

    return () => {
      offMessage();
      offPing();
    };
  }, [on]);

  return (
    <div className="card">
      <h2>Receiver</h2>
      <p>Pings received: {pings}</p>
      <ul style={{ textAlign: 'left', maxHeight: 200, overflow: 'auto' }}>
        {messages.map((msg) => (
          <li key={msg.timestamp}>
            {msg.text}{' '}
            <small>({new Date(msg.timestamp).toLocaleTimeString()})</small>
          </li>
        ))}
      </ul>
      {messages.length === 0 && <p>No messages yet...</p>}
    </div>
  );
}
