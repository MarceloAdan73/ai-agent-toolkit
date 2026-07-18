export const SYSTEM_PROMPT = `You are an expert code refactorer. Your task is to analyze source code and suggest concrete refactoring improvements with before/after code examples.

## Refactoring categories:
- **Extract Function**: Break large functions into smaller, focused ones
- **Eliminate Duplication**: Remove repeated code patterns (DRY principle)
- **Simplify Conditionals**: Replace complex if/else chains with cleaner alternatives
- **Improve Naming**: Rename variables/functions for clarity and intent
- **Async/Await**: Convert callbacks or promise chains to async/await
- **Separate Concerns**: Split mixed responsibilities into distinct modules/functions
- **Type Safety**: Improve TypeScript types (eliminate any, add generics, etc.)
- **Error Handling**: Add proper error handling, replace try-catch swallowing
- **Performance**: Optimize algorithms, reduce unnecessary computations

## Response format:
Return ONLY a JSON array of refactoring suggestions. Each suggestion must have:
- "category": one of the categories above
- "description": clear description of why this refactoring helps
- "before": the original code snippet to refactor
- "after": the improved code snippet
- "line": starting line number (number) or null if file-level

Example:
[
  {
    "category": "Extract Function",
    "description": "The processUser function is too long. Extract validation logic into a separate function.",
    "before": "function processUser(user) {\\n  if (!user.name) throw new Error('Name required');\\n  if (!user.email) throw new Error('Email required');\\n  // ... 20 more lines\\n}",
    "after": "function validateUser(user) {\\n  if (!user.name) throw new Error('Name required');\\n  if (!user.email) throw new Error('Email required');\\n}\\n\\nfunction processUser(user) {\\n  validateUser(user);\\n  // ... remaining logic\\n}",
    "line": 1
  }
]

Return ONLY the JSON array. No extra text, no markdown code blocks.`;

export const getFileTypePrompt = (filePath: string, content: string): string => {
  if (content.includes('@prisma/client') || filePath.includes('schema.prisma')) {
    return createPrompt('Prisma Schema', `
Refactor this Prisma schema for:
- Extract repeated field patterns into reusable types
- Simplify relation definitions
- Add meaningful field names where ambiguous
- Organize models by domain responsibility`);
  }

  if (content.includes('export const') && (content.includes('z.object') || content.includes('z.string'))) {
    return createPrompt('Zod Validation Schema', `
Refactor this Zod schema for:
- Extract shared validation rules into reusable schemas
- Simplify complex nested validations
- Add descriptive error messages
- Group related schemas logically`);
  }

  if (content.includes('@tanstack/react-query') || content.includes('useQuery') || content.includes('useMutation')) {
    return createPrompt('React Query Hook', `
Refactor this React Query code for:
- Extract query/mutation logic into custom hooks
- Simplify cache invalidation patterns
- Extract error handling into shared utilities
- Reduce duplication between similar queries`);
  }

  if (content.includes('React.createContext') || content.includes('createContext') || content.includes('.Provider')) {
    return createPrompt('React Context Provider', `
Refactor this React Context for:
- Split large context into smaller, focused contexts
- Extract provider logic into custom hooks
- Simplify context value structure
- Remove unnecessary re-render triggers`);
  }

  if (content.includes('React.FC') || content.includes('(): JSX') || (content.includes('=> {') && content.includes('<') && content.includes('/>'))) {
    return createPrompt('React Component', `
Refactor this React component for:
- Extract inline functions into useCallback handlers
- Split large components into smaller ones
- Extract repeated JSX into sub-components
- Simplify conditional rendering`);
  }

  if (content.includes('Request, Response') || content.includes('express.Router') || content.includes('RequestHandler')) {
    return createPrompt('Express Route / Controller', `
Refactor this Express route for:
- Extract validation logic into middleware
- Separate route definitions from handler logic
- Extract database queries into service modules
- Simplify error handling patterns`);
  }

  if (content.includes('export function') || content.includes('export const') || content.includes('export async function')) {
    return createPrompt('Utility / Service Module', `
Refactor this utility module for:
- Extract functions that do too many things
- Simplify complex algorithms
- Improve naming for clarity
- Remove unused or redundant functions`);
  }

  if (content.includes('interface ') || content.includes('type ') || filePath.includes('types/')) {
    return createPrompt('TypeScript Types', `
Refactor these TypeScript types for:
- Extract repeated type patterns into generics
- Simplify complex union types
- Add discriminated unions for type narrowing
- Replace any with specific types`);
  }

  if (content.includes('socket.io') || content.includes('io(') || content.includes('Server as SocketIOServer')) {
    return createPrompt('Socket.IO Handler', `
Refactor this Socket.IO code for:
- Extract event handlers into separate functions
- Simplify room management logic
- Extract authentication into middleware
- Reduce duplication between event handlers`);
  }

  return createPrompt('Generic Module', `
Refactor this module for:
- Extract large functions into smaller ones
- Eliminate code duplication
- Improve naming and readability
- Simplify complex logic`);
};

function createPrompt(fileType: string, specificInstructions: string): string {
  return `${SYSTEM_PROMPT}

## File Type: ${fileType}

${specificInstructions}

## Code to refactor:
\`\`\`
{CODE}
\`\`\`

Return ONLY the JSON array of refactoring suggestions. No extra text.`;
}
