import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT, getFileTypePrompt } from '../src/prompts.ts';

describe('prompts', () => {
  describe('SYSTEM_PROMPT', () => {
    it('is a non-empty string', () => {
      expect(typeof SYSTEM_PROMPT).toBe('string');
      expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it('mentions Vitest', () => {
      expect(SYSTEM_PROMPT).toContain('Vitest');
    });

    it('mentions test best practices', () => {
      expect(SYSTEM_PROMPT).toContain('describe');
      expect(SYSTEM_PROMPT).toContain('it');
    });
  });

  describe('getFileTypePrompt', () => {
    it('detects Prisma schema by content', () => {
      const prompt = getFileTypePrompt('schema.prisma', 'model User { id Int }');
      expect(prompt).toContain('Prisma Schema');
    });

    it('detects Zod validator', () => {
      const prompt = getFileTypePrompt('validators.ts', "export const schema = z.object({ name: z.string() })");
      expect(prompt).toContain('Zod');
    });

    it('detects React Query hook', () => {
      const prompt = getFileTypePrompt('useTasks.ts', "import { useQuery } from '@tanstack/react-query'");
      expect(prompt).toContain('React Query');
    });

    it('detects React Context', () => {
      const prompt = getFileTypePrompt('AuthContext.tsx', 'const AuthContext = createContext()');
      expect(prompt).toContain('Context');
    });

    it('detects React Component', () => {
      const prompt = getFileTypePrompt('Button.tsx', 'export const Button: React.FC = () => <div />');
      expect(prompt).toContain('React Component');
    });

    it('detects Express route', () => {
      const prompt = getFileTypePrompt('routes.ts', "import { Request, Response } from 'express'; router.get('/api', (req: Request, res: Response) => {})");
      expect(prompt).toContain('Express');
    });

    it('detects utility functions', () => {
      const prompt = getFileTypePrompt('utils.ts', 'export function formatPriority(level: number): string { return "low"; }');
      expect(prompt).toContain('Utility');
    });

    it('returns Generic Module for unrecognized code', () => {
      const prompt = getFileTypePrompt('random.xyz', 'console.log("hello")');
      expect(prompt).toContain('Generic Module');
    });

    it('all prompts contain the code placeholder', () => {
      const types: [string, string][] = [
        ['schema.prisma', 'model User { id Int }'],
        ['validators.ts', "export const s = z.object({})"],
        ['hook.ts', "import { useQuery } from '@tanstack/react-query'"],
        ['ctx.tsx', 'createContext()'],
        ['Button.tsx', 'export const Button: React.FC = () => <div />'],
        ['routes.ts', "import { Request, Response } from 'express'; router.get('/api', (req, res) => {})"],
        ['types.ts', 'interface X { y: number }'],
        ['util.ts', 'export function foo() {}'],
        ['random.xyz', 'something'],
      ];
      for (const [file, content] of types) {
        const prompt = getFileTypePrompt(file, content);
        expect(prompt).toContain('{CODE}');
      }
    });
  });
});
