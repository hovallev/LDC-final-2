// src/fsm.ts
// Finite-state machine for conversation flow

/**
 * Defines the possible states of the conversation.
 */
export type State = 'intro' | 'concept1' | 'concept2' | 'concept3' | 'wrap';

/**
 * Maps state values to display names
 */
export const stateDisplayNames = {
  'intro': 'Introduction',
  'concept1': 'Concept 1',
  'concept2': 'Concept 2',
  'concept3': 'Concept 3',
  'wrap': 'Wrap'
};

/**
 * Calculates the next state based on the current state and user input.
 * @param currentState The current conversation state.
 * @param userInput The user's latest message text.
 * @returns The next conversation state.
 */
export const nextState = (currentState: State, userInput: string): State => {
  const trimmedInput = userInput.trim().toLowerCase();
  
  // Handle direct number inputs (1, 2, 3)
  if (['1', '2', '3'].includes(trimmedInput)) {
    return `concept${trimmedInput}` as State;
  }
  
  // Handle "concept X" style inputs
  const conceptMatch = trimmedInput.match(/concept\s*([1-3])/i);
  if (conceptMatch) {
    return `concept${conceptMatch[1]}` as State;
  }
  
  // Transition between concepts or to wrap-up based on "next"
  if (/next/i.test(trimmedInput) || /go to wrap-?up/i.test(trimmedInput)) {
    if (currentState === 'concept1') {
      return 'concept2';
    } else if (currentState === 'concept2') {
      return 'concept3';
    } else if (currentState === 'concept3') {
      return 'wrap';
    }
  }
  
  // Handle direct wrap-up request
  if (/wrap-?up/i.test(trimmedInput)) {
    return 'wrap';
  }

  // Otherwise, remain in the current state
  return currentState;
};