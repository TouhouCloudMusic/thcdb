#[derive(Debug, derive_more::Display, derive_more::Error)]
#[display("Description must not be blank.")]
pub(crate) struct BlankSubmissionDescription;

#[derive(Debug)]
pub(crate) struct SubmissionDescription(String);

impl TryFrom<String> for SubmissionDescription {
    type Error = BlankSubmissionDescription;

    fn try_from(description: String) -> Result<Self, Self::Error> {
        if description.trim().is_empty() {
            return Err(BlankSubmissionDescription);
        }
        Ok(Self(description))
    }
}

impl From<SubmissionDescription> for String {
    fn from(description: SubmissionDescription) -> Self {
        description.0
    }
}
