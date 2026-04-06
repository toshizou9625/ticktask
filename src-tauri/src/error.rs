use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("File I/O error: {0}")]
    FileIO(#[from] std::io::Error),
    #[error("Store error: {0}")]
    Store(String),
    #[allow(dead_code)]
    #[error("Markdown parse error: {0}")]
    MarkdownParse(String),
    #[error("Task not found: {0}")]
    TaskNotFound(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
