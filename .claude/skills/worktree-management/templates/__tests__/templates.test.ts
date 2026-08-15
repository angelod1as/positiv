import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Plan Templates', () => {
  const templatesDir = path.join(__dirname, '..');

  it('should have all required template files', () => {
    const templates = ['plan-full.md', 'plan-prd.md', 'plan-impl.md'];

    templates.forEach(template => {
      const filepath = path.join(templatesDir, template);
      expect(fs.existsSync(filepath)).toBe(true);
    });
  });

  it('should have valid markdown structure in plan-full.md', () => {
    const content = fs.readFileSync(
      path.join(templatesDir, 'plan-full.md'),
      'utf-8'
    );

    // Check required sections exist
    expect(content).toContain('## 1. Product Requirements (PRD)');
    expect(content).toContain('## 2. Implementation Plan');
    expect(content).toContain('## 3. Implementation Steps (TDD - Baby Steps)');
    expect(content).toContain('## 4. Testing Strategy');
    expect(content).toContain('## 5. Risks & Mitigations');
  });

  it('should have valid markdown structure in plan-prd.md', () => {
    const content = fs.readFileSync(
      path.join(templatesDir, 'plan-prd.md'),
      'utf-8'
    );

    // Check required sections exist
    expect(content).toContain('## Product Requirements Document (PRD)');
    expect(content).toContain('### User Stories');
    expect(content).toContain('### Acceptance Criteria');
    expect(content).toContain('### Scope');
  });

  it('should have valid markdown structure in plan-impl.md', () => {
    const content = fs.readFileSync(
      path.join(templatesDir, 'plan-impl.md'),
      'utf-8'
    );

    // Check required sections exist
    expect(content).toContain('## Implementation Plan');
    expect(content).toContain('## Implementation Steps (TDD - Baby Steps)');
    expect(content).toContain('## Testing Strategy');
  });

  it('should have proper placeholder syntax', () => {
    const content = fs.readFileSync(
      path.join(templatesDir, 'plan-full.md'),
      'utf-8'
    );

    // Placeholders should be in {curly braces}
    const placeholders = content.match(/\{[^}]+\}/g);
    expect(placeholders).toBeTruthy();
    expect(placeholders!.length).toBeGreaterThan(0);
  });

  it('should include task number and title placeholders', () => {
    const templates = ['plan-full.md', 'plan-prd.md', 'plan-impl.md'];

    templates.forEach(template => {
      const content = fs.readFileSync(
        path.join(templatesDir, template),
        'utf-8'
      );

      expect(content).toContain('{task-number}');
      expect(content).toContain('{task-title}');
      expect(content).toContain('{timestamp}');
      expect(content).toContain('{linear-url}');
    });
  });

  it('should include delete reminder in checklist', () => {
    const templates = ['plan-full.md', 'plan-impl.md'];

    templates.forEach(template => {
      const content = fs.readFileSync(
        path.join(templatesDir, template),
        'utf-8'
      );

      expect(content.toLowerCase()).toContain('delete this plan');
    });
  });
});
