# 📦 Replica Full Project Blueprint

If you prefer uploading standard source files to GitHub rather than the single `index.html` file, create these files inside your project directory:

## 1. `package.json`
```json
{
  "name": "replica-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^10.8.0",
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "vite": "^5.1.4"
  }
}
```

## 2. `vite.config.js`
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

## 3. `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## 4. `postcss.config.js`
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## ⚡ Direct 1-Click Upload Steps for GitHub & Vercel

1. Go to [GitHub.com](https://github.com/new) and name your repository `replica-app`.
2. Click **"uploading an existing file"** link on GitHub.
3. Drag and drop the `index.html` file (or all project files) directly into GitHub and click **Commit changes**.
4. Open [Vercel.com](https://vercel.com), connect your GitHub account, click **Import** on `replica-app`, and click **Deploy**.