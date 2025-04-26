// ui/useChat.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import type { State } from '../src/fsm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [state, setState] = useState<State>('intro'); 
  
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>, customMessage?: string) => {
    e.preventDefault();
    const messageText = customMessage || input.trim();
    if (!messageText) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    // Add a temporary "thinking" message from the assistant
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '...' }
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          currentState: state,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Get the response body as a readable stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not available as a stream');
      }
      
      // Variable to accumulate the response
      let assistantResponse = '';
      let decoder = new TextDecoder();
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Process the chunk (might contain multiple SSE messages)
        const lines = chunk.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              // Parse the SSE data
              const data = JSON.parse(line.substring(6));
              
              // Handle chunk of text
              if (data.chunk) {
                assistantResponse += data.chunk;
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  { role: 'assistant', content: assistantResponse }
                ]);
              }
              
              // Handle completion
              if (data.done) {
                if (data.finalState && data.finalState !== state) {
                  console.log(`State changing from ${state} to ${data.finalState}`);
                  setState(data.finalState as State);
                }
              }
              
              // Handle errors
              if (data.error) {
                console.error('Error from server:', data.error);
                throw new Error(data.error);
              }
            } catch (err) {
              console.error('Error parsing SSE message:', err, line);
            }
          }
        }
      }

    } catch (err) {
      console.error('Error fetching chat response:', err);
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      
      // Update the temporary message with an error
      setMessages((prev) => [
        ...prev.slice(0, -1), // Remove the temporary message
        { role: 'assistant', content: 'Sorry, I encountered an error connecting to the server. Please try again later.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, state]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    state,
    setState,
    setMessages,
  };
}

export default useChat;