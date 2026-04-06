use std::fs;
use std::path::Path;

use crate::error::AppError;

const SECTION_HEADER: &str = "## ⏱ Work Time";

/// Update (or create) the `## ⏱ Work Time` section in a daily note file.
/// `entries` is a slice of `(task_name, total_seconds)`.
pub fn update_work_time_section(
    file_path: &str,
    date: &str,
    entries: &[(String, i64)],
) -> Result<(), AppError> {
    let new_section = build_section(entries);

    if !Path::new(file_path).exists() {
        // Create new file
        let content = format!("# {}\n\n---\n\n{}\n", date, new_section);
        if let Some(parent) = Path::new(file_path).parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(file_path, content)?;
        return Ok(());
    }

    // Read existing file
    let original = fs::read_to_string(file_path)?;

    let updated = replace_or_append_section(&original, &new_section);
    fs::write(file_path, updated)?;
    Ok(())
}

// ─── Section builder ─────────────────────────────────────────────────────────

fn format_time(secs: i64) -> String {
    let h = secs / 3600;
    let m = (secs % 3600) / 60;
    format!("{}:{:02}", h, m)
}

fn build_section(entries: &[(String, i64)]) -> String {
    let total: i64 = entries.iter().map(|(_, s)| s).sum();
    let mut rows = String::new();
    for (name, secs) in entries {
        rows.push_str(&format!("| {} | {} |\n", name, format_time(*secs)));
    }
    format!(
        "{}\n\n| Task | Time |\n|------|------|\n{}Total: {}\n",
        SECTION_HEADER,
        rows,
        format_time(total)
    )
}

// ─── Section replacement ─────────────────────────────────────────────────────

/// Find `## ⏱ Work Time` in `content`, replace it with `new_section`.
/// If not found, append `---\n\n{new_section}` to the end.
fn replace_or_append_section(content: &str, new_section: &str) -> String {
    let lines: Vec<&str> = content.lines().collect();

    // Find the start of the section
    let section_start = lines.iter().position(|l| *l == SECTION_HEADER);

    match section_start {
        None => {
            // Append
            let trimmed = content.trim_end();
            format!("{}\n\n---\n\n{}\n", trimmed, new_section)
        }
        Some(start_idx) => {
            // Find end of section: next `---`, next `##`, or EOF
            let end_idx = lines[start_idx + 1..]
                .iter()
                .position(|l| l.starts_with("---") || (l.starts_with("## ") && *l != SECTION_HEADER))
                .map(|i| start_idx + 1 + i)
                .unwrap_or(lines.len());

            let before = lines[..start_idx].join("\n");
            let after = if end_idx < lines.len() {
                lines[end_idx..].join("\n")
            } else {
                String::new()
            };

            let mut result = String::new();
            if !before.is_empty() {
                result.push_str(&before);
                result.push('\n');
                result.push('\n');
            }
            result.push_str(new_section);
            if !after.is_empty() {
                result.push('\n');
                result.push('\n');
                result.push_str(&after);
            }
            result.push('\n');
            result
        }
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_time() {
        assert_eq!(format_time(0), "0:00");
        assert_eq!(format_time(45 * 60), "0:45");
        assert_eq!(format_time(90 * 60), "1:30");
        assert_eq!(format_time(3600), "1:00");
    }

    #[test]
    fn test_build_section() {
        let entries = vec![
            ("Requirements".to_string(), 5400),
            ("Design Doc Edit".to_string(), 4500),
        ];
        let section = build_section(&entries);
        assert!(section.contains(SECTION_HEADER));
        assert!(section.contains("| Requirements | 1:30 |"));
        assert!(section.contains("| Design Doc Edit | 1:15 |"));
        assert!(section.contains("Total: 2:45"));
    }

    #[test]
    fn test_append_to_empty_file() {
        let content = "# 2026-04-03\n\nSome notes here.\n";
        let entries = vec![("Requirements".to_string(), 1800)];
        let section = build_section(&entries);
        let result = replace_or_append_section(content, &section);
        assert!(result.contains(SECTION_HEADER));
        assert!(result.contains("Some notes here."));
    }

    #[test]
    fn test_replace_existing_section() {
        let content = "# 2026-04-03\n\nNotes.\n\n---\n\n## ⏱ Work Time\n\n| Task | Time |\n|------|------|\n| Old Task | 0:30 |\nTotal: 0:30\n";
        let entries = vec![("New Task".to_string(), 3600)];
        let section = build_section(&entries);
        let result = replace_or_append_section(content, &section);
        assert!(result.contains("| New Task | 1:00 |"));
        assert!(!result.contains("| Old Task |"));
    }

    #[test]
    fn test_user_notes_preserved() {
        let content = "# 2026-04-03\n\nMy notes are here.\n\n---\n\n## ⏱ Work Time\n\n| Task | Time |\n|------|------|\n| Task A | 0:30 |\nTotal: 0:30\n\n---\n\nTomorrow's tasks\n";
        let entries = vec![("Task A".to_string(), 7200)];
        let section = build_section(&entries);
        let result = replace_or_append_section(content, &section);
        assert!(result.contains("My notes are here."));
        assert!(result.contains("Tomorrow's tasks"));
        assert!(result.contains("| Task A | 2:00 |"));
    }
}
