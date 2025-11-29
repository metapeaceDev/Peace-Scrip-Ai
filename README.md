# Peace Script AI

Peace Script is a professional AI-assisted screenwriting and pre-production tool designed to help creators generate detailed movie script outlines, characters, scenes, and storyboards.

## Features

- **Step-by-Step Creation**: Guided process from Genre selection to Final Output.
- **AI Character Generation**: Create detailed character profiles with psychological depth and AI-generated portraits.
- **Scene Generator**: Automatically generate scene breakdowns, dialogue, and shot lists.
- **Storyboard AI**: Generate visual storyboards (images and video previews) for every shot.
- **Cloud & Offline Sync**: Works offline using browser database (IndexedDB) and syncs when online.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **AI**: Google Gemini API (Flash 2.5, Pro 3, Veo Video)
- **Storage**: IndexedDB (Dexie-like implementation) for large media storage.

## Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/peace-script.git
    cd peace-script
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file (optional, if running locally outside of AI Studio):
    ```env
    API_KEY=your_google_gemini_api_key
    ```
    *Note: When running in the browser/AI Studio, the app handles API keys via the user interface.*

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

## Usage Guide

1.  **Genre**: Select your main and secondary genres.
2.  **Boundary**: Define the core premise, theme, and timeline.
3.  **Character**: detailed profiling with AI assistance.
4.  **Structure**: Edit the 9-point plot structure.
5.  **Output**: Generate full scenes, edit dialogue, and create storyboards.

## License

MIT
