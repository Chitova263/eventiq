import { useState } from 'react';
import { useEventiqContext } from 'eventiq';

export function Sender() {
  const { emit } = useEventiqContext();
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      emit('message', { text: message, timestamp: Date.now() });
      setMessage('');
    }
  };

  return (
    <div className="card">
      <h2>Sender</h2>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Type a message..."
      />
      <button onClick={handleSend}>Send Event</button>
      <button onClick={() => emit('ping')}>Ping</button>
    </div>
  );
}
