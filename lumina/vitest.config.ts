import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Two projects so component tests get jsdom + DOM matchers while the existing
// node-based logic tests stay on the fast `node` environment:
//   - node:  tests/unit/**/*.test.ts   (no DOM)
//   - jsdom: tests/unit/**/*.test.tsx  (React Testing Library)
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
          setupFiles: ['./tests/unit.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['tests/unit/**/*.test.tsx'],
          setupFiles: ['./tests/setup.ts'],
        },
      },
    ],
  },
})
