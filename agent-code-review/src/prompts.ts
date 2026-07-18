export const SYSTEM_PROMPT = `You are an expert code reviewer. Your task is to analyze source code and provide actionable feedback organized by severity level.

## Categories to analyze:
- **Bugs**: Potential bugs (null references, type errors, logic errors, race conditions)
- **Security**: Security vulnerabilities (SQL injection, XSS, secrets hardcodeados, path traversal)
- **Performance**: Performance issues (unnecessary re-renders, N+1 queries, missing indexes, memory leaks)
- **Dead Code**: Unused imports, unused variables, unreachable code, commented-out code
- **TypeScript**: Bad TypeScript practices (any type, missing null checks, loose typing)
- **Maintainability**: Code complexity, long functions, magic numbers, missing error handling
- **Refactoring**: Suggestions for cleaner code structure, extract functions, simplify logic

## Severity levels:
- 🔴 **critical**: Bugs that will cause errors, security vulnerabilities, data loss risks
- 🟡 **warning**: Code smells, performance issues, potential bugs in edge cases
- 🟢 **info**: Style suggestions, minor improvements, best practices

## Response format:
Return ONLY a JSON array of review findings. Each finding must have:
- "severity": "critical" | "warning" | "info"
- "category": one of the categories above
- "line": line number (number) or null if file-level
- "suggestion": clear, actionable description of the issue and how to fix it

Example:
[
  {"severity": "warning", "category": "Security", "line": 15, "suggestion": "Use parameterized queries instead of string concatenation to prevent SQL injection"},
  {"severity": "info", "category": "TypeScript", "line": 8, "suggestion": "Replace 'any' type with specific type for better type safety"}
]

Return ONLY the JSON array. No extra text, no markdown code blocks.`;

export const getFileTypePrompt = (filePath: string, content: string): string => {
  if (content.includes('@prisma/client') || filePath.includes('schema.prisma')) {
    return createPrompt('Prisma Schema', `
Analyze this Prisma schema for:
- Missing indexes on frequently queried fields
- Inefficient relation definitions
- Missing @unique constraints where needed
- Field type mismatches with expected data`);
  }

  if (content.includes('export const') && (content.includes('z.object') || content.includes('z.string'))) {
    return createPrompt('Zod Validation Schema', `
Analyze this Zod schema for:
- Missing validation rules (min, max, regex)
- Overly permissive validation
- Missing error messages for user-facing validation
- Type inference issues`);
  }

  if (content.includes('@tanstack/react-query') || content.includes('useQuery') || content.includes('useMutation')) {
    return createPrompt('React Query Hook', `
Analyze this React Query code for:
- Missing error handling
- Cache invalidation issues
- Stale data problems
- Missing loading states
- Race conditions in mutations`);
  }

  if (content.includes('React.createContext') || content.includes('createContext') || content.includes('.Provider')) {
    return createPrompt('React Context Provider', `
Analyze this React Context for:
- Unnecessary re-renders
- Missing memoization
- Context value stability
- Missing error boundaries`);
  }

  if (content.includes('React.FC') || content.includes('(): JSX') || (content.includes('=> {') && content.includes('<') && content.includes('/>'))) {
    return createPrompt('React Component', `
Analyze this React component for:
- Missing key props in lists
- Unnecessary re-renders
- Missing error boundaries
- Inline function definitions in JSX
- Missing TypeScript types for props
- Direct DOM manipulation`);
  }

  if (content.includes('Request, Response') || content.includes('express.Router') || content.includes('RequestHandler')) {
    return createPrompt('Express Route / Controller', `
Analyze this Express route for:
- Missing input validation
- SQL/NoSQL injection vulnerabilities
- Missing authentication/authorization checks
- Unhandled promise rejections
- Missing rate limiting
- Exposed sensitive data in responses`);
  }

  if (content.includes('export function') || content.includes('export const') || content.includes('export async function')) {
    return createPrompt('Utility / Service Module', `
Analyze this utility module for:
- Missing error handling
- Potential null/undefined references
- Inefficient algorithms
- Missing input validation
- Side effects in pure functions`);
  }

  if (content.includes('interface ') || content.includes('type ') || filePath.includes('types/')) {
    return createPrompt('TypeScript Types', `
Analyze these TypeScript types for:
- Overuse of 'any' type
- Missing optional markers
- Inconsistent naming conventions
- Missing JSDoc documentation
- Loose union types`);
  }

  if (content.includes('socket.io') || content.includes('io(') || content.includes('Server as SocketIOServer')) {
    return createPrompt('Socket.IO Handler', `
Analyze this Socket.IO code for:
- Missing authentication on connections
- Missing input validation on events
- Memory leaks from uncleaned listeners
- Missing rate limiting
- Room management issues`);
  }

  return createPrompt('Generic Module', `
Analyze this module for:
- Missing error handling
- Potential bugs
- Code quality issues
- Performance concerns
- Security vulnerabilities`);
};

function createPrompt(fileType: string, specificInstructions: string): string {
  return `${SYSTEM_PROMPT}

## File Type: ${fileType}

${specificInstructions}

## Code to review:
\`\`\`
{CODE}
\`\`\`

Return ONLY the JSON array of review findings. No extra text.`;
}
