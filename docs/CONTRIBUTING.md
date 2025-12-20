# Contributing to Peace Script AI

Thank you for your interest in contributing to Peace Script AI! 🎬

## Development Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for backend)
- Git

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/metapeaceDev/Peace-Scrip-Ai.git
   cd Peace-Scrip-Ai
   ```

2. **Install dependencies**

   ```bash
   # Frontend
   npm install

   # Backend
   cd backend && npm install
   ```

3. **Setup environment**

   ```bash
   # Frontend
   cp .env.example .env
   # Add your VITE_GEMINI_API_KEY

   # Backend
   cd backend
   cp .env.example .env
   ```

4. **Run development servers**

   ```bash
   # Frontend (http://localhost:5173)
   npm run dev

   # Backend (http://localhost:5000)
   cd backend && docker-compose up
   ```

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types where possible
- Add proper type definitions

### React Components

- Use functional components with hooks
- Keep components small and focused
- Add prop types

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Testing

```bash
# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Place tests in `src/test/` directory
- Name test files as `ComponentName.test.tsx`
- Aim for >80% code coverage

## Commit Guidelines

Use conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples:**

```bash
git commit -m "feat(character): add AI portrait generation"
git commit -m "fix(api): resolve CORS issue in production"
git commit -m "docs(readme): update installation instructions"
```

## Pull Request Process

1. Create a feature branch

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes
3. Run tests and linting

   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

4. Commit your changes
5. Push to your fork
6. Create a Pull Request

### PR Requirements

- ✅ All tests pass
- ✅ No linting errors
- ✅ TypeScript compiles without errors
- ✅ Code is formatted
- ✅ New features have tests
- ✅ Documentation is updated

## Project Structure

```
peace-script-basic-v1/
├── components/          # React components
├── services/           # API & AI services
├── backend/            # Node.js backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   └── middleware/
│   └── Dockerfile
├── .github/workflows/  # CI/CD
└── docs/              # Documentation
```

## Questions?

- 📧 Email: support@peacescript.app
- 💬 GitHub Issues: [Report a bug](https://github.com/metapeaceDev/Peace-Scrip-Ai/issues)
- 📖 Documentation: See README.md

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
