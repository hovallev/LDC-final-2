// FSM implementation for conversation state management

/**
 * Defines the possible states of the conversation.
 * In JS we don't need type definitions, so removing the TypeScript syntax
 */

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
 * @param {string} currentState The current conversation state.
 * @param {string} userInput The user's latest message text.
 * @returns {string} The next conversation state.
 */
export const nextState = (currentState, userInput) => {
  const trimmedInput = userInput.trim().toLowerCase();
  
  // Handle direct number inputs (1, 2, 3)
  if (['1', '2', '3'].includes(trimmedInput)) {
    return `concept${trimmedInput}`;
  }
  
  // Handle "next" keyword to progress to the next concept
  if (trimmedInput.includes('next') || trimmedInput.includes('move on')) {
    switch (currentState) {
      case 'intro':
        return 'concept1';
      case 'concept1':
        return 'concept2';
      case 'concept2':
        return 'concept3';
      case 'concept3':
        return 'wrap';
      default:
        return currentState;
    }
  }
  
  // Handle specific concept requests (e.g., "tell me about concept 2")
  if (trimmedInput.includes('concept')) {
    if (trimmedInput.includes('1') || 
        trimmedInput.includes('one') || 
        trimmedInput.includes('first')) {
      return 'concept1';
    } else if (trimmedInput.includes('2') || 
              trimmedInput.includes('two') || 
              trimmedInput.includes('second')) {
      return 'concept2';
    } else if (trimmedInput.includes('3') || 
              trimmedInput.includes('three') || 
              trimmedInput.includes('third')) {
      return 'concept3';
    }
  }
  
  // Default: remain in the current state
  return currentState;
};
