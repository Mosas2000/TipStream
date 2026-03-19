# Contributing to TipStream Documentation

Guidelines for contributors maintaining TipStream documentation.

## Documentation Principles

1. **Accuracy First**: All claims testable against running code
2. **Consistency**: Match established style and structure
3. **Clarity**: Explain "why" not just "what"
4. **Currency**: Update when code changes
5. **Completeness**: No orphaned or broken references

## Directory Structure

```
/docs
├── README.md                           # Documentation index
├── JUDGES_SUMMARY.md                   # Judge-facing overview
├── DEPLOYMENT_VERIFICATION.md          # Pre/post-deployment checklist
├── ARCHITECTURE_DECISIONS.md           # Architecture Decision Records
├── DOCS_MAINTENANCE.md                 # Documentation maintenance checklist
├── FEATURE_STATUS.md                   # Feature status matrix
├── API_RESILIENCE_TROUBLESHOOTING.md  # Troubleshooting guide
├── PERFORMANCE_BASELINE.md             # Performance metrics and targets
├── CONTRIBUTING.md (this file)         # How to contribute
├── ADMIN_OPERATIONS.md                 # Admin runbook (planned)
├── CONFIGURATION_REFERENCE.md          # Config and environment (planned)
└── /admin
    └── MONITORING.md                   # Operator's monitoring guide
```

## Before Creating New Documentation

1. **Check existing docs**: Review DOCS_AUDIT_REPORT.md for known gaps
2. **Define audience**: Who is this for? (judges, contributors, operators, users)
3. **Link from index**: Update docs/README.md to include new doc
4. **Follow naming**: Use SCREAMING_SNAKE_CASE.md for guides

## Documentation Standards

### File Format

- **Extension**: `.md` (GitHub-flavored Markdown)
- **Line length**: Soft wrap at 100 chars (for readability)
- **Headers**: Use `# H1` for title, `## H2` for sections, etc.
- **Encoding**: UTF-8, LF line endings

### Header Requirements

Every doc should start with:

```markdown
# Title (Single H1)

Brief description (1-2 sentences).

## Overview

Longer introduction or context.
```

And end with:

```markdown
---

**Last Updated:** MMM YYYY
**Maintained by:** Role/Team
**Next Review:** Date or Frequency
```

### Code Blocks

- Use fenced blocks (triple backticks) with language specifier
- For JavaScript: ` ```javascript`
- For Clarity: ` ```clarity`
- For Shell: ` ```bash`

Example:

````markdown
```javascript
const example = 'code'
```
````

### Lists

- Use `- ` for bullet points (not `* `)
- Use `1. ` for numbered lists
- Indent sublists with 2 spaces

### Tables

Use GitHub-flavored markdown tables:

```markdown
| Column 1 | Column 2 | Column 3 |
|---|---|---|
| Value 1 | Value 2 | Value 3 |
```

- Always use `|---|---|---|` for alignment
- Minimize columns (less than 5 typically)

### Links

- Internal docs: `[link text](FILENAME.md)` or `[link text](FILENAME.md#section)`
- External: `[link text](https://example.com)`
- GitHub issues: `[Issue #123](https://github.com/Mosas2000/TipStream/issues/123)`

### Emoji & Formatting

- ❌ No emoji in documentation (unless explicitly requested)
- ✅ Use **bold** for emphasis
- ✅ Use `code backticks` for variable/function names
- ✅ Use > for blockquotes (sparingly)

## Common Sections

### For Feature Documentation

```markdown
# Feature Name

Brief description.

## Overview

What does it do and why.

## How It Works

Technical explanation with diagram if helpful.

## Usage

Examples showing how to use.

## Configuration

Any env vars, settings, or options.

## Known Limitations

What it doesn't do.

## References

Links to related docs or issues.
```

### For Troubleshooting Guides

```markdown
# Troubleshooting: [Topic]

Overview of topic.

## [Scenario]: [Description]

### Symptoms

What user sees wrong.

### Diagnostic Steps

How to check what's happening.

### Common Causes

Table of causes with indicators and fixes.

### Resolution

How to fix it.
```

### For API/Architecture Docs

```markdown
# [Component Name]

Brief description.

## Overview

What it is and why.

## Architecture

Diagram or structure.

## Implementation Details

Key files and functions.

## Configuration

Settings and options.

## Examples

Usage examples.

## Performance Characteristics

Speed, memory, etc.

## References

Links to code or related docs.
```

## Accuracy Verification Checklist

Before submitting a documentation change:

- [ ] Run any code snippets to verify they work
- [ ] Check test/function counts against actual codebase
- [ ] Verify URLs and links are current (test by visiting)
- [ ] Confirm diagrams match actual structure
- [ ] Update "Last Updated" date
- [ ] Cross-reference related docs for consistency
- [ ] No references to removed features or old versions
- [ ] All claims are verifiable against running code

## Testing Your Documentation

### For Code Examples

```bash
# Copy code blocks from your doc
# Paste into actual codebase and test
npm test
npm run build
```

### For Installation Steps

```bash
# Test on a clean checkout:
rm -rf temp-test
git clone <repo> temp-test
cd temp-test
# Follow your documentation steps exactly
```

### For API Endpoints

```bash
# Use `curl` or Postman to test live endpoints
# Document actual response bodies
curl https://tipstream.xyz/api/stats
```

### Broken Link Detection

```bash
# Install and run markdown-link-check
npm install -g markdown-link-check
markdown-link-check docs/YOUR_FILE.md
```

## Common Mistakes to Avoid

### ❌ Vagueness

**Bad**: "The system caches things for performance"

**Good**: "Message cache has 5-minute TTL; page cache has 2-minute TTL (see eventPageCache.js)"

### ❌ Orphaned References

**Bad**: "See the performance section" (but no such section exists)

**Good**: "See [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md#bottleneck-analysis)"

### ❌ Outdated Counts

**Bad**: "The system has 23 tests" (actually 88 now)

**Good**: "88 contract tests and 40+ frontend unit tests (as of March 2026)"

### ❌ Tense Inconsistency

**Bad**: "The system will cache tips. It caches everything."

**Good**: "The system caches tips. Caching serves to improve performance."

### ❌ Missing Context

**Bad**: "Configuration is in .env"

**Good**: "Configuration is in `.env` (see CONFIGURATION_REFERENCE.md for all options)"

## Review Checklist for Maintainers

When reviewing documentation PRs:

1. **Accuracy**: Does it match current code?
2. **Completeness**: Does it address the full topic?
3. **Clarity**: Could a newcomer understand it?
4. **Consistency**: Matches style/structure of other docs?
5. **Format**: Headers, links, code blocks correct?
6. **Links**: All references valid and current?
7. **Examples**: Code works when tested?
8. **Metadata**: Last updated date filled in?

## Documentation Update Schedule

### After Each Feature Release

1. Update CHANGELOG.md
2. Update ROADMAP.md status
3. Update FEATURE_STATUS.md
4. Update README.md if applicable

### Monthly

1. Review and update any polling intervals
2. Check for new FAQ topics
3. Update performance metrics if changed

### Quarterly

1. Run full DOCS_MAINTENANCE.md checklist
2. Update all "Last Updated" dates
3. Review for broken links
4. File issues for any needed updates

## Questions?

- For general questions: Open a GitHub discussion
- For specific docs: File an issue with `docs:` label
- For ideas: Start a conversation in Discord

## License

All documentation is provided under the same license as the TipStream project.

---

**Last Updated:** March 2026
**Maintained by:** Documentation Team
**Next Review:** June 2026

