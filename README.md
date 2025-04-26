# LDC Coach Bot

A DeepSeek-powered chatbot to coach Alberto Schilling (CEO, Banco BICE) on Leading Disruptive Change (LDC) concepts relevant to the Grupo Security merger.

## Project Structure

```
ldc-coach-bot/
├─ .env.example          # Environment variable keys
├─ data/                 # LDC & BICE context files (text)
├─ src/                  # Backend source code (TypeScript)
│   ├─ index.ts          # Entry point & streaming orchestrator
│   ├─ prompt.ts         # Dynamic prompt builder
│   ├─ retriever.ts      # Vector store retriever (DeepSeek embeddings)
│   └─ fsm.ts            # Finite-state machine for conversation flow
├─ ui/                   # Frontend source code (React + shadcn/ui)
│   ├─ App.tsx           # Main React chat component
│   └─ useChat.ts        # Chat state management hook
├─ package.json          # Project dependencies and scripts
├─ tsconfig.json         # TypeScript configuration
└─ README.md             # This file
```

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd ldc-coach-bot
    ```
2.  **Install dependencies:**
    ```bash
    npm install 
    # or yarn install
    ```
3.  **Set up environment variables:**
    *   Copy `.env.example` to `.env`
    *   Fill in your `DEEPSEEK_API_KEY`, `EMBED_API_KEY`, and desired `PORT`.
4.  **Add context data:**
    *   Place relevant `.txt` files containing LDC concepts and BICE/Security information into the `data/` directory.

## Running the Application

```bash
npm run dev
# or yarn dev
```

This should start both the backend server and the frontend development server (specific commands need to be configured in `package.json`).

## Key Features

*   **Conversational Flow:** Guided conversation through three specific LDC concepts.
*   **Contextual Explanations:** Uses retrieval augmentation (RAG) with DeepSeek embeddings to provide relevant examples.
*   **State Management:** Employs a finite-state machine (`fsm.ts`) to manage the conversation stage.
*   **Streaming Responses:** Uses Server-Sent Events (SSE) for smooth chatbot interaction.
*   **Creative AI Features:** Includes plans for tone mirroring, nightly retrieval refresh, and a "failure résumé" appendix. 