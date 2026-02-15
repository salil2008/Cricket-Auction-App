# Contributing to BWPL Auction System

First off, thank you for considering contributing to the BWPL Auction System! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Coding Guidelines](#coding-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/bwpl-auction.git
   cd bwpl-auction
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL-OWNER/bwpl-auction.git
   ```

## Development Setup

### Prerequisites

- Node.js v18 or higher
- npm (comes with Node.js)
- Git

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The app will be available at http://localhost:5173
```

### Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── common/     # Button, Card, Modal, Input, etc.
│   └── layout/     # AdminLayout, Sidebar, Header
├── db/             # Dexie.js database layer
├── hooks/          # Custom React hooks
├── pages/          # Page components
│   ├── admin/      # Admin panel pages
│   └── presentation/  # Presenter view pages
├── stores/         # Zustand state management
└── utils/          # Utility functions
```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/player-stats-popup` - New features
- `fix/purse-calculation-bug` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/auction-control` - Code refactoring

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auction): add keyboard shortcuts for bidding
fix(teams): correct purse calculation after player sale
docs(readme): update installation instructions
```

## Submitting Changes

1. **Keep your fork in sync**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** and commit them

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request** on GitHub

### Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Include screenshots for UI changes
- Ensure all tests pass
- Keep PRs focused on a single feature/fix

## Coding Guidelines

### JavaScript/React

- Use functional components with hooks
- Follow existing code style
- Use meaningful variable names
- Add comments for complex logic

### CSS/Tailwind

- Use Tailwind utility classes
- Follow existing design patterns
- Maintain responsive design
- Use CSS custom properties for theming

### File Organization

- One component per file
- Keep files under 300 lines when possible
- Group related files in directories
- Use index.js for exports

### Example Component

```jsx
import { useState } from 'react';
import { Button } from '../common';

/**
 * PlayerCard displays player information
 * @param {Object} player - Player data object
 * @param {Function} onSelect - Callback when player is selected
 */
export default function PlayerCard({ player, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    onSelect(player.id);
  };

  return (
    <div 
      className="p-4 rounded-lg bg-gray-800 hover:bg-gray-700"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <h3 className="text-white font-semibold">{player.name}</h3>
      <p className="text-gray-400">{player.role}</p>
    </div>
  );
}
```

## Reporting Bugs

### Before Submitting

- Check if the bug has already been reported
- Try to reproduce in the latest version
- Collect relevant information

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Version: [e.g., 1.0.0]

**Additional context**
Any other relevant information.
```

## Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives you've considered**
Other solutions you've thought about.

**Additional context**
Any mockups, examples, or other information.
```

---

## Questions?

Feel free to open an issue for any questions or reach out to the maintainers.

Thank you for contributing! 🏏
