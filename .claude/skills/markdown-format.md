# Markdown File Format Specification

## File Location

`{outputDir}/YYYY-MM-DD.md` — one file per calendar day (local time).

## File Structure

```markdown
# 2026-04-03

(user's free-form notes — NEVER touch this area)

---

## ⏱ Work Time

| Task | Time |
|------|------|
| Requirements | 1:30 |
| Design Doc Edit | 1:15 |
| Code Review | 0:45 |

Total: 3:30

---

(user's free-form notes continue here — NEVER touch)
```

## Section Detection Rules

1. Search for line starting with `## ⏱ Work Time`
2. Section ends at the next `---`, `##`, or EOF
3. Replace ONLY that section; everything else is untouched

## Update Algorithm (Read-Modify-Write)

```
1. Read entire file (if exists)
2. Find "## ⏱ Work Time" section boundaries
3. Build new section content from todayAccumulated
4. Replace section in memory
5. Write entire file back
```

## New File Template

When file does not exist:

```markdown
# YYYY-MM-DD

---

## ⏱ Work Time

| Task | Time |
|------|------|
| TaskName | H:MM |

Total: H:MM
```

## Time Format

- `H:MM` — hours (no zero-padding) : minutes (zero-padded)
- Examples: `0:05`, `1:30`, `10:00`
- Conversion: total_seconds → `format!("{}:{:02}", secs/3600, (secs%3600)/60)`

## Merge Rules

- Same-named tasks within one day are merged into a single row
- Task order = order first worked on that day
- Totals row = sum of all tasks

## Midnight Rollover

When date changes during active tracking:
1. Split interval at `23:59:59` / `00:00:00`
2. Old-date portion → write to old date file
3. New-date portion → initialize new `todayAccumulated`
4. Multi-day gaps (2+ days inactive) → all time attributed to last-operation date

## Obsidian Compatibility

- Obsidian auto-reloads on file change — no special sync needed
- Never write partial files; always write the complete file atomically
- Preserve all user content outside the `## ⏱ Work Time` section
