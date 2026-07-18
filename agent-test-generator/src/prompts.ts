export const SYSTEM_PROMPT = `You are an expert unit test developer. Your task is to generate comprehensive unit tests for the given source code using Vitest. Follow best practices for testing.

## Conventions to follow:
- Use Vitest as the test framework (import from 'vitest').
- Use describe/it blocks for organization.
- Use descriptive test names that explain the expected behavior.
- Mock external dependencies when necessary (vi.mock, vi.fn).
- Test both happy path and edge cases.
- Test error handling and edge cases.
- Use beforeEach/afterEach for setup/cleanup.
- Group related tests in describe blocks.
- Aim for high coverage of exported functions and components.

## Response format:
Return ONLY the test code wrapped in a markdown code block with the appropriate language tag. Include all necessary imports at the top.`;

export const getFileTypePrompt = (filePath: string, content: string): string => {
  if (content.includes('@prisma/client') || filePath.includes('schema.prisma')) {
    return createPrompt('Prisma Schema', `
Generate tests for Prisma schema definitions:
- Test model field types and constraints
- Test relations between models
- Test enum values
- Use vitest with mocked Prisma client`);
  }

  if (content.includes('export const') && (content.includes('z.object') || content.includes('z.string'))) {
    return createPrompt('Zod Validation Schema', `
Generate tests for Zod validation schemas:
- Test valid inputs pass validation
- Test invalid inputs fail validation
- Test edge cases for each field constraint
- Test error messages for invalid inputs`);
  }

  if (content.includes('@tanstack/react-query') || content.includes('useQuery') || content.includes('useMutation')) {
    return createPrompt('React Query Hook', `
Generate tests for React Query hooks:
- Test loading, success, and error states
- Test refetch behavior
- Test cache invalidation
- Mock API responses with vi.fn()`);
  }

  if (content.includes('React.createContext') || content.includes('createContext') || content.includes('.Provider')) {
    return createPrompt('React Context Provider', `
Generate tests for React Context:
- Test context provides correct values
- Test consumer components receive context
- Test default values
- Test provider state updates`);
  }

  if (content.includes('React.FC') || content.includes('(): JSX') || (content.includes('=> {') && content.includes('<') && content.includes('/>'))) {
    return createPrompt('React Component', `
Generate tests for React components:
- Test rendering with different props
- Test user interactions (click, input, etc.)
- Test conditional rendering
- Test event handlers are called correctly
- Use @testing-library/react if applicable`);
  }

  if (content.includes('Request, Response') || content.includes('express.Router') || content.includes('RequestHandler')) {
    return createPrompt('Express Route / Controller', `
Generate tests for Express routes:
- Test each HTTP method (GET, POST, PUT, DELETE)
- Test request/response handling
- Test error responses (400, 404, 500)
- Mock req/res objects with vi.fn()`);
  }

  if (content.includes('export function') || content.includes('export const') || content.includes('export async function')) {
    return createPrompt('Utility / Service Module', `
Generate tests for utility functions:
- Test with valid inputs
- Test with edge cases (empty, null, undefined)
- Test error handling
- Test async functions with await`);
  }

  if (content.includes('interface ') || content.includes('type ') || filePath.includes('types/')) {
    return createPrompt('TypeScript Types', `
Generate type validation tests:
- Test that objects conform to the interface
- Test optional fields
- Test union types
- Use type guards if applicable`);
  }

  if (content.includes('socket.io') || content.includes('io(') || content.includes('Server as SocketIOServer')) {
    return createPrompt('Socket.IO Handler', `
Generate tests for Socket.IO:
- Test connection events
- Test custom event handlers
- Test room management
- Mock socket objects`);
  }

  return createPrompt('Generic Module', `
Generate tests for the module exports:
- Test each exported function/constant
- Test with typical inputs
- Test edge cases
- Test error conditions`);
};

function createPrompt(fileType: string, specificInstructions: string): string {
  return `${SYSTEM_PROMPT}

## File Type: ${fileType}

${specificInstructions}

## Code to test:
\`\`\`
{CODE}
\`\`\`

Return ONLY the complete test code in a single markdown code block. Do not include any extra text or explanations.`;
}
