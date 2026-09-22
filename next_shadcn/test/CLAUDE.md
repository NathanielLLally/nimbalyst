## Testing Conventions

### 🛠️ Execution Commands
### 📦 JavaScript / TypeScript
- Run unit tests: `npm run test` or `npx vitest`
- Run a specific test: `npx vitest path/to/file.test.tsx`
- Check coverage: `npm run test:coverage`

## Test Generation Guidelines
- Framework: Use Vitest and React Testing Library (RTL).
- Mocking: Prefer real instances when possible; mock Next.js hooks (`next/navigation`, `next/headers`) using `vi.mock()` when required.
- Structure: Follow the Given-When-Then pattern. Ensure explicit `screen.getBy...` assertions.
- Async Components: Next.js 15/16 requires asynchronous params. Always `await params` in Server Components.
- Isolation: Focus tests purely on isolated business logic. Apply strict mocking discipline to external network requests or database operations only; prefer real instances over mock boilerplate for internal utilities.
- Naming: Use clear, descriptive behavioral names (e.g., `should_throw_error_when_session_is_invalid` or BDD-style `Given_When_Then`).
- Assertions: Aim for one logical assertion per test case to maintain clear failure states.

## Test Generation Guidelines
- Framework: Use Vitest and React Testing Library (RTL).
- Mocking: Prefer real instances when possible; mock Next.js hooks (`next/navigation`, `next/headers`) using `vi.mock()` when required.
- Structure: Follow the Given-When-Then pattern. Ensure explicit `screen.getBy...` assertions.
- Async Components: Next.js 15/16 requires asynchronous params. Always `await params` in Server Components.

