# Architecture Review Checklist

You are an architecture reviewer for TickTask. Review the codebase against these four criteria and compile findings.

## Review Criteria

### 1. Layer Separation

**Check for violations:**
- Does any React component directly call `invoke()` from `@tauri-apps/api`?
  - VIOLATION: Components must only use `useTauriCommand` hook
- Does any Tauri Command (`src-tauri/src/commands/`) contain business logic?
  - VIOLATION: Commands are thin adapters; all logic goes in `src-tauri/src/core/`
- Does any Rust `core/` module directly access Tauri APIs (windows, tray)?
  - VIOLATION: Core is pure business logic; Tauri APIs only in commands or main.rs
- Does any React component read/write files directly?
  - VIOLATION: All I/O must go through Tauri commands

**Expected layer flow:**
```
React Component → useTauriCommand → invoke() → Tauri Command → Core Layer → OS/File
```

### 2. Error Handling Consistency

**Check for violations:**
- Do all Tauri Commands return `Result<T, AppError>`?
  - VIOLATION: Any command returning `Result<T, String>` or `Result<T, tauri::Error>`
- Is `AppError` defined in `src-tauri/src/error.rs` with `thiserror`?
  - VIOLATION: Error types scattered across modules
- Does the frontend handle errors uniformly?
  - VIOLATION: Some `invoke()` calls without try/catch; inconsistent error display
- Are `FileIO`, `Store`, `MarkdownParse`, `TaskNotFound` variants covered?

### 3. State Management Validity

**Check for violations:**
- Is `TimerContext` the single source of truth for timer state?
  - VIOLATION: Timer state duplicated in component local state
- Is `TaskListContext` the single source of truth for tasks?
  - VIOLATION: Tasks fetched independently in multiple components
- Is there unnecessary prop drilling (passing context values through 3+ component levels)?
  - VIOLATION: Use `useContext` instead
- Does `useTimer` update every second without memory leaks?
  - Check: `useEffect` with proper cleanup (`clearInterval`)

### 4. Markdown Update Safety

**Check for violations in `src-tauri/src/core/markdown.rs`:**
- Is there a read-before-write pattern?
  - VIOLATION: Writing without first reading the existing file
- Are section boundaries detected correctly?
  - Check: handles `---`, `##`, and EOF as section terminators
- Are same-name tasks merged into a single row?
  - VIOLATION: Duplicate task rows for tasks with pause/resume cycles
- Is the new file template applied when the file doesn't exist?
- Is the total row calculated correctly?

## Output Format

```markdown
# Architecture Review Findings

## 1. Layer Separation
- [PASS/FAIL] {finding}

## 2. Error Handling
- [PASS/FAIL] {finding}

## 3. State Management
- [PASS/FAIL] {finding}

## 4. Markdown Safety
- [PASS/FAIL] {finding}

## Summary
{N} violations found. Priority fixes: ...
```

Save findings to `docs/REVIEW-FINDINGS.md`.
