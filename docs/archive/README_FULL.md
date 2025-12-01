# Peace Script AI - Professional Screenwriting Tool

Peace Script is an AI-powered professional screenwriting and pre-production tool designed to help creators generate detailed movie script outlines, develop rich characters with psychological depth, create scene breakdowns, and produce visual storyboards.

## 🎬 Key Features

### Multi-Step Creation Workflow
- **Step 1: Genre Selection** - Choose main and secondary genres with AI-powered poster generation
- **Step 2: Story Boundary** - Define premise, theme, logline, and timeline
- **Step 3: Character Development** - Create detailed character profiles with AI-generated portraits and costumes
- **Step 4: Plot Structure** - Develop 9-point plot structure with scene planning
- **Step 5: Scene Output** - Generate scenes, dialogue, shot lists, and storyboards

### AI-Powered Features
- **Character Generation**: Create detailed character profiles with psychological depth (consciousness, subconscious, defilement metrics)
- **Portrait & Costume Design**: AI-generated character images with multiple style options (Cinematic, Anime, 3D, etc.)
- **Outfit Collection**: Generate and manage multiple costumes per character
- **Scene Generator**: Automatically generate scene breakdowns with dialogue and camera work
- **Storyboard AI**: Generate visual storyboards for every shot
- **Video Preview**: Create short video clips using Veo AI model

### Production Tools
- **Shot List Management**: Complete shot specifications (size, angle, movement, equipment, lens)
- **Cast & Costume Tracking**: Assign actors and outfits to scenes
- **Production Breakdown**: Organize props, locations, and set details
- **Team Manager**: Add and manage crew members with roles
- **Export Options**: 
  - Screenplay (TXT format)
  - Shot List (CSV)
  - Storyboard (HTML)
  - Project Backup (JSON)

### Data Management
- **Cloud Sync**: Save projects to cloud server (when available)
- **Offline Mode**: Full functionality using browser IndexedDB
- **Auto-save**: Automatic project saving every 2 seconds
- **Undo/Redo**: History tracking for all major edits
- **Import**: Load scripts from TXT, DOCX, PDF, or JSON backups

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Google Gemini API Key ([Get it here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/peace-script-basic-v1.git
   cd peace-script-basic-v1
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   > **Note**: When running in AI Studio environment, the app can use the selected API key from the studio interface.

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   
   The app will open at `http://localhost:5173`

5. **Build for Production**
   ```bash
   npm run build
   ```
   
   Preview the build:
   ```bash
   npm run preview
   ```

## 📖 Usage Guide

### Creating Your First Project

1. **Authentication**: Login with cloud account or continue as Guest (Offline)
2. **Create Project**: Choose project type (Movie, Series, Short Film, Commercial, etc.)
3. **Follow the 5-Step Workflow**:
   - **Genre**: Select genres and generate poster art
   - **Boundary**: Define the story's core elements
   - **Character**: Build character profiles with AI assistance
   - **Structure**: Plan your 9-point plot structure
   - **Output**: Generate scenes, edit dialogue, create storyboards

### AI Features

#### Character Development
- Click "Generate Full Profile" to auto-fill character details
- Use "Generate Portrait" for AI character images
- Generate multiple costume designs with "Generate Costume"
- Upload reference photos for facial consistency

#### Scene Generation
- Adjust scene count per plot point (1-3 scenes)
- Click "Generate All Scenes" or generate individually
- Edit dialogue inline with drag-and-drop reordering
- Assign characters to scenes

#### Storyboard Creation
- Select art style for consistency
- Generate images for all shots or specific shots
- Create short video previews (requires Veo API access)
- Export storyboard as printable HTML

### Keyboard Shortcuts
- `Ctrl/Cmd + S`: Manual save
- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Shift + Z`: Redo

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS (via CDN)
- **AI**: Google Gemini API
  - `gemini-2.5-flash` - Scene and character generation
  - `gemini-2.5-flash-image` - Image generation
  - `veo-3.1-fast-generate-preview` - Video generation
- **Build Tool**: Vite 4
- **Storage**: 
  - IndexedDB for offline projects
  - Cloud API (optional backend)
- **File Processing**: 
  - PDF.js for PDF parsing
  - Mammoth.js for DOCX parsing

## 📁 Project Structure

```
peace-script-basic-v1/
├── components/          # React components
│   ├── AuthPage.tsx
│   ├── Step1Genre.tsx
│   ├── Step2Boundary.tsx
│   ├── Step3Character.tsx
│   ├── Step4Structure.tsx
│   ├── Step5Output.tsx
│   ├── StepIndicator.tsx
│   ├── Studio.tsx
│   └── TeamManager.tsx
├── services/           # API and AI services
│   ├── api.ts
│   └── geminiService.ts
├── App.tsx            # Main application
├── types.ts           # TypeScript definitions
├── constants.ts       # App constants
├── index.tsx          # Entry point
├── index.html         # HTML template
├── index.css          # Global styles
├── vite.config.ts     # Vite configuration
└── tsconfig.json      # TypeScript config
```

## 🎨 Project Types Supported

- 🎥 **Movie** (ภาพยนตร์)
- 📺 **Series** (ซีรีส์)
- 🙏 **Moral Drama** (ละครคุณธรรม)
- 🎞️ **Short Film** (หนังสั้น)
- 📢 **Commercial** (โฆษณา)
- 🎵 **Music Video** (มิวสิควิดีโอ)
- 📱 **Reels/Shorts** (คลิปสั้น)

## 🌐 Deployment

### AI Studio (Google)
This project is optimized to run in Google AI Studio:
1. Upload project to AI Studio
2. Select your Gemini API key in the studio
3. The app will automatically use the selected key

### Static Hosting (Netlify, Vercel, etc.)
1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Set environment variable `VITE_GEMINI_API_KEY` in your hosting platform

## 🔒 Privacy & Data

- **Offline Mode**: All data stored locally in browser (IndexedDB)
- **Cloud Mode**: Projects sent to your backend API (optional)
- **AI Processing**: Script content sent to Google Gemini API for generation
- **No Analytics**: No tracking or analytics by default

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Credits

Built with ❤️ by Peace Script Team

Powered by:
- Google Gemini AI
- React & TypeScript
- Tailwind CSS

## 📞 Support

For issues or questions:
- GitHub Issues: [Report a bug](https://github.com/your-username/peace-script-basic-v1/issues)
- Email: support@peacescript.com

---

**Peace Script AI** - Empowering Storytellers with Professional Tools 🎬✨
