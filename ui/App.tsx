// ui/App.tsx
// Main React chat component with professional UI

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import useChat from './useChat.ts';
import { stateDisplayNames } from '../src/fsm';

console.log('App.tsx loaded - Professional UI implemented with enhanced features');

function App() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, state, setState, setMessages } = useChat();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // Initialize chat with a welcome message if empty
  useEffect(() => {
    if (messages.length === 0) {
      // Add a welcome message as if it came from the assistant
      setMessages([
        { 
          role: 'assistant', 
          content: `# Welcome to the LDC Coach Bot! 👋

Welcome, leader! I'm your personal LDC (Leading Disruptive Change) implementation coach.

## How I can help you:
- Discuss and explore the three core LDC concepts
- Provide tailored guidance for implementing these concepts at Banco BICE
- Answer questions and provide examples related to leadership during change

To get started, you can select a concept from the left panel or ask me any questions about Leading Disruptive Change. What would you like to explore today?`
        }
      ]);
    }
  }, [messages]);
  
  // Scroll to bottom when messages change or when loading
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };
  
  // Automatically scroll to bottom when messages change or when loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);
  // Function to handle concept selection - now sends just the number to match FSM conditions
  const selectConcept = (conceptNum: number) => {
    // Only allow selecting a concept if it's the next one in sequence or already completed
    if (
      (state === 'intro' && conceptNum === 1) || 
      (state === 'concept1' && conceptNum <= 2) || 
      (state === 'concept2' && conceptNum <= 3) || 
      (state === 'concept3') ||
      isConceptCompleted(conceptNum)
    ) {
      handleSubmit({
        preventDefault: () => {},
        target: {}
      } as React.FormEvent<HTMLFormElement>, `${conceptNum}`);
    }
  };
  // Function to check if a concept has been completed
  const isConceptCompleted = (conceptNum: number): boolean => {
    // If current state is a later concept or wrap, consider previous concepts completed
    if (state === 'concept2' && conceptNum === 1) return true;
    if (state === 'concept3' && (conceptNum === 1 || conceptNum === 2)) return true;
    if (state === 'wrap') return conceptNum <= 3; // All concepts are completed in wrap-up
    
    return false;
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh', 
      backgroundColor: '#f9fafb',
      overflow: 'hidden'
    }}>
      {/* Header */}      <header style={{
        backgroundColor: '#0f2d52',
        color: 'white',
        padding: '12px 16px', /* Increased vertical padding */
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50px' /* Set minimum height for header */
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '20px', 
          fontWeight: 600,
        }}>Leading Disruptive Change - Integrative Assignment</h1>
      </header>

      {/* Main Content Area */}
      <div style={{ 
        display: 'flex',
        flexGrow: 1,
        overflow: 'hidden'
      }}>
        {/* Concept List Card - Fixed width panel */}
        <div style={{ 
          width: '280px', /* Fixed width as requested */
          minWidth: '280px', /* Ensure it doesn't shrink */
          backgroundColor: 'white',
          borderRight: '1px solid #e5e7eb',
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Banco BICE Logo and Branding */}
          <div style={{
            marginBottom: '20px',
            textAlign: 'center',
            padding: '10px 0',
            borderBottom: '1px solid #e5e7eb'
          }}>            {/* Logo container with fixed dimensions - white background with blue border */}
            <div style={{
              width: '100%',
              height: '60px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '8px',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #0c1f3d',
              padding: '8px'            }}>{/* Use the PNG logo which is more compatible */}
              <img 
                src="/assets/Bice-300x200-1.png" 
                alt="Banco BICE Logo" 
                style={{
                  maxWidth: '90%',
                  maxHeight: '90%',
                  objectFit: 'contain'
                }}
              />
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280'
            }}>
              LDC Implementation Coach
            </div>
          </div>
          
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 600,
            margin: '10px 0 15px',
            color: '#0f2d52'
          }}>LDC Concepts</h2>            <div style={{
              backgroundColor: '#f0f9ff',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '16px',
              border: '1px solid #e1effe',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ 
                fontSize: '14px',
                color: '#6b7280'
              }}>Current Stage:</div>
              <div style={{ 
                fontWeight: 600,
                color: '#0f2d52',
                fontSize: '16px'
              }}>{stateDisplayNames[state] || state}</div>
              
              {state === 'intro' && (
                <button 
                  onClick={() => selectConcept(1)} 
                  style={{
                    marginTop: '8px',
                    backgroundColor: '#0f2d52',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  Start with Concept 1
                </button>
              )}
              
              {state === 'concept3' && (
                <button 
                  onClick={() => {
                    handleSubmit({
                      preventDefault: () => {},
                      target: {}
                    } as React.FormEvent<HTMLFormElement>, "next");
                  }}
                  style={{
                    marginTop: '8px',
                    backgroundColor: '#0f2d52',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  Go to Wrap-up
                </button>
              )}
            </div>
            <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            
            {/* Concept 1 Button */}            <button 
              onClick={() => selectConcept(1)} 
              style={{
                padding: '12px',
                backgroundColor: state === 'concept1' ? '#e1effe' : 'white',
                border: '1px solid #d1d5db',
                borderLeft: state === 'concept1' ? '4px solid #1a56db' : '1px solid #d1d5db',
                borderRadius: '6px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                boxShadow: state === 'concept1' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                position: 'relative' // For positioning the check mark
              }}
            >
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600, color: '#0f2d52' }}>Concept 1</span>
                {isConceptCompleted(1) && (
                  <span style={{
                    color: '#10b981', // Green color
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    ✓
                  </span>
                )}
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', marginTop: '4px' }}>Change to Remain Unchanged</div>
            </button>
            
            {/* Concept 2 Button */}<button 
              onClick={() => selectConcept(2)} 
              style={{
                padding: '12px',
                backgroundColor: state === 'concept2' ? '#e1effe' : 'white',
                border: '1px solid #d1d5db',
                borderLeft: state === 'concept2' ? '4px solid #1a56db' : '1px solid #d1d5db',
                borderRadius: '6px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                boxShadow: state === 'concept2' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                position: 'relative' // For positioning the check mark
              }}
            >
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600, color: '#0f2d52' }}>Concept 2</span>
                {isConceptCompleted(2) && (
                  <span style={{
                    color: '#10b981', // Green color
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    ✓
                  </span>
                )}
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', marginTop: '4px' }}>Strategic Sparring Sessions</div>
            </button>
            
            {/* Concept 3 Button */}
            <button 
              onClick={() => selectConcept(3)} 
              style={{
                padding: '16px',
                backgroundColor: state === 'concept3' ? '#e1effe' : 'white',
                border: '1px solid #d1d5db',
                borderLeft: state === 'concept3' ? '4px solid #1a56db' : '1px solid #d1d5db',
                borderRadius: '6px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                boxShadow: state === 'concept3' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600, color: '#0f2d52' }}>Concept 3</span>
                {isConceptCompleted(3) && (
                  <span style={{
                    color: '#10b981', // Green color
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    ✓
                  </span>
                )}
              </div>              <div style={{ fontSize: '14px', color: '#4b5563', marginTop: '4px' }}>Adaptive Space</div>
            </button>

            {/* Wrap Button */}
            <button 
              onClick={() => {
                handleSubmit({
                  preventDefault: () => {},
                  target: {}
                } as React.FormEvent<HTMLFormElement>, "Go to wrap-up");
              }}
              style={{
                padding: '12px',
                backgroundColor: state === 'wrap' ? '#e1effe' : 'white',
                border: '1px solid #d1d5db',
                borderLeft: state === 'wrap' ? '4px solid #1a56db' : '1px solid #d1d5db',
                borderRadius: '6px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                boxShadow: state === 'wrap' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600, color: '#0f2d52' }}>Wrap</span>
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', marginTop: '4px' }}>Summary & Conclusion</div>
            </button>
          </div>
        </div>

        {/* Chat Pane */}
        <div style={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%',
          maxWidth: 'calc(100% - 280px)',
          position: 'relative'
        }}>          <div 
            ref={messagesContainerRef}
            style={{ 
            flexGrow: 1, 
            overflowY: 'auto', 
            padding: '12px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>{messages.map((m, index) => (
              <div key={index} style={{ 
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'center', /* This vertically centers the message bubble */
                maxWidth: '100%',
                marginBottom: '2px'
              }}>                <div style={{
                  backgroundColor: m.role === 'user' ? '#1a56db' : 'white',
                  color: m.role === 'user' ? 'white' : '#111827',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  borderTopLeftRadius: m.role === 'assistant' ? '4px' : '12px',
                  borderTopRightRadius: m.role === 'user' ? '4px' : '12px',
                  maxWidth: '80%',
                  boxShadow: m.role === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
                  border: m.role === 'assistant' ? '1px solid #e5e7eb' : 'none',                  
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  <div className="markdown-content" style={{
                    lineHeight: '1.2',
                  }}>                    <ReactMarkdown components={{
                      h1: ({ node, ...props }) => <h1 style={{ fontSize: '16px', marginTop: '2px', marginBottom: '2px', lineHeight: '1.1' }} {...props} />,
                      h2: ({ node, ...props }) => <h2 style={{ fontSize: '14px', marginTop: '2px', marginBottom: '2px', lineHeight: '1.1' }} {...props} />,
                      p: ({ node, ...props }) => <p style={{ margin: '2px 0', lineHeight: '1.1' }} {...props} />,
                      ul: ({ node, ...props }) => <ul style={{ margin: '2px 0', paddingLeft: '16px' }} {...props} />,
                      li: ({ node, ...props }) => <li style={{ margin: '0', padding: '0', lineHeight: '1.1' }} {...props} />,
                    }}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ 
                alignSelf: 'flex-start',
                backgroundColor: 'white',
                color: '#6b7280',
                padding: '12px 16px',
                borderRadius: '12px',
                borderTopLeftRadius: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#1a56db',
                  animation: 'pulse 1.5s infinite ease-in-out'
                }}></div>
                <span>Thinking...</span>
              </div>
            )}
          </div>
          
          {/* Message Input */}
          <form onSubmit={handleSubmit} style={{ 
            borderTop: '1px solid #e5e7eb',
            padding: '16px 24px',
            backgroundColor: 'white',
            display: 'flex',
            gap: '12px'
          }}>
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Send a message..."
              disabled={isLoading}
              style={{ 
                flexGrow: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                outline: 'none',
                fontSize: '16px'
              }}
            />
            <button 
              type="submit" 
              disabled={isLoading}
              style={{
                backgroundColor: '#0f2d52',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0 20px',
                fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
      
      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #e5e7eb',
        padding: '16px 24px',
        backgroundColor: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        <div>Tuck School of Business at Dartmouth</div>
        <div>Hernan Ovalle Valdes</div>
      </footer>
    </div>
  );
}

export default App;