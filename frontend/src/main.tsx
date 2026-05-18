import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// NOTE: <StrictMode> intentionally omitted around <Canvas>.
// Per skill (r3f-patterns.md): Strict Mode double-invokes effects → double-allocates GPU
// resources. Either disable it for the Canvas subtree or explicitly .dispose() in cleanup.
// We disable globally for v1; revisit when component count grows enough to warrant per-canvas isolation.

createRoot(document.getElementById('root')!).render(<App />)
