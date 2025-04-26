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
  const trimmedInput = userInput.trim();

  // Transition from intro based on number selection
  if (currentState === 'intro' && ['1', '2', '3'].includes(trimmedInput)) {
    return `concept${trimmedInput}` as State;
  }

  // Transition between concepts or to wrap-up based on "next"
  if (currentState.startsWith('concept') && /next/i.test(trimmedInput)) {
    const currentConceptNumber = Number(currentState.slice(-1));
    if (currentConceptNumber < 3) {
      return `concept${currentConceptNumber + 1}` as State;
    }
    // If it was concept3 and user says next, move to wrap-up
    return 'wrap';
  }

  // Otherwise, remain in the current state
  return currentState;
}; 