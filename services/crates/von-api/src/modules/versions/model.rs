use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use utoipa::ToSchema;
use von_error::{Error, Result};

const MAX_VERSION_LEN: usize = 50;

fn invalid(message: &str) -> Error {
    Error::BadRequest(message.to_owned())
}

#[derive(Serialize, ToSchema)]
pub struct TransformMappings {
    #[schema(value_type = std::collections::HashMap<String, String>)]
    pub rename: Option<Value>,
    pub remove: Option<Vec<String>>,
    #[schema(value_type = Object)]
    pub defaults: Option<Value>,
}

fn clean_mappings(mappings: &Value) -> Result<Value> {
    let Some(object) = mappings.as_object() else {
        return Err(invalid("each transform must be an object"));
    };

    let mut cleaned = Map::new();

    if let Some(rename) = object.get("rename").filter(|v| !v.is_null()) {
        let valid = rename
            .as_object()
            .is_some_and(|map| map.values().all(Value::is_string));
        if !valid {
            return Err(invalid("transform rename must map strings to strings"));
        }
        cleaned.insert("rename".to_owned(), rename.clone());
    }

    if let Some(remove) = object.get("remove").filter(|v| !v.is_null()) {
        let valid = remove
            .as_array()
            .is_some_and(|list| list.iter().all(Value::is_string));
        if !valid {
            return Err(invalid("transform remove must be an array of strings"));
        }
        cleaned.insert("remove".to_owned(), remove.clone());
    }

    if let Some(defaults) = object.get("defaults").filter(|v| !v.is_null()) {
        if !defaults.is_object() {
            return Err(invalid("transform defaults must be an object"));
        }
        cleaned.insert("defaults".to_owned(), defaults.clone());
    }

    Ok(Value::Object(cleaned))
}

/// Elysia validates against the mapping schema, which drops unknown keys and
/// emits the known ones in declaration order, so both services must serialize
/// byte for byte the same document.
pub fn clean_transforms(transforms: &Value) -> Result<Value> {
    let Some(object) = transforms.as_object() else {
        return Err(invalid("transforms must be an object"));
    };

    let mut cleaned = Map::new();
    for (event, mappings) in object {
        cleaned.insert(event.clone(), clean_mappings(mappings)?);
    }
    Ok(Value::Object(cleaned))
}

fn check_version(value: &str) -> Result<()> {
    if value.chars().count() > MAX_VERSION_LEN {
        return Err(invalid("version must be at most 50 characters"));
    }
    Ok(())
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateVersion {
    #[schema(max_length = 50, example = "2024-01-01")]
    pub version: String,
    #[schema(value_type = std::collections::HashMap<String, TransformMappings>)]
    pub transforms: Value,
}

impl CreateVersion {
    pub fn validate(&self) -> Result<Value> {
        check_version(&self.version)?;
        clean_transforms(&self.transforms)
    }
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVersion {
    #[schema(value_type = std::collections::HashMap<String, TransformMappings>)]
    pub transforms: Value,
}

impl UpdateVersion {
    pub fn validate(&self) -> Result<Value> {
        clean_transforms(&self.transforms)
    }
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct WebhookVersion {
    #[schema(format = "uuid")]
    pub id: String,
    pub version: String,
    #[schema(value_type = std::collections::HashMap<String, TransformMappings>)]
    pub transforms: Value,
    #[schema(format = "date-time")]
    pub created_at: String,
    #[schema(format = "date-time")]
    pub updated_at: String,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct VersionList {
    pub versions: Vec<WebhookVersion>,
    pub next_cursor: Option<String>,
}
