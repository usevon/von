use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use base64::Engine;
use base64::engine::general_purpose::STANDARD as B64;
use sha2::{Digest, Sha256};
use std::sync::OnceLock;
use von_error::{Error, Result};

const CIPHER_PREFIX: &str = "enc:v1";
const IV_BYTES: usize = 12;
const TAG_BYTES: usize = 16;

static CIPHER_KEY: OnceLock<Option<[u8; 32]>> = OnceLock::new();

fn cipher_key() -> Result<&'static [u8; 32]> {
    CIPHER_KEY
        .get_or_init(|| {
            let material = std::env::var("SECRET_ENCRYPTION_KEY")
                .or_else(|_| std::env::var("BETTER_AUTH_SECRET"))
                .ok()?;
            let mut hasher = Sha256::new();
            hasher.update(material.as_bytes());
            Some(hasher.finalize().into())
        })
        .as_ref()
        .ok_or_else(|| {
            Error::Configuration(
                "SECRET_ENCRYPTION_KEY or BETTER_AUTH_SECRET is required to use secret encryption"
                    .to_owned(),
            )
        })
}

/// Node's GCM cipher emits the tag separately while the aead crate appends it to
/// the ciphertext, so the two halves are spliced apart to match the stored format.
pub fn encrypt_secret(value: &str) -> Result<String> {
    if value.starts_with(&format!("{CIPHER_PREFIX}:")) {
        return Ok(value.to_owned());
    }

    let key = Key::<Aes256Gcm>::from_slice(cipher_key()?);
    let cipher = Aes256Gcm::new(key);

    let mut iv = [0u8; IV_BYTES];
    rand::Rng::fill(&mut rand::thread_rng(), &mut iv[..]);
    let nonce = Nonce::from_slice(&iv);

    let mut sealed = cipher
        .encrypt(
            nonce,
            Payload {
                msg: value.as_bytes(),
                aad: &[],
            },
        )
        .map_err(|_| Error::Configuration("secret encryption failed".to_owned()))?;

    if sealed.len() < TAG_BYTES {
        return Err(Error::Configuration("secret encryption failed".to_owned()));
    }
    let tag = sealed.split_off(sealed.len() - TAG_BYTES);

    Ok(format!(
        "{CIPHER_PREFIX}:{}:{}:{}",
        B64.encode(iv),
        B64.encode(tag),
        B64.encode(sealed)
    ))
}

pub fn decrypt_secret(value: &str) -> Result<String> {
    if !value.starts_with(&format!("{CIPHER_PREFIX}:")) {
        return Ok(value.to_owned());
    }

    let parts: Vec<&str> = value.split(':').collect();
    if parts.len() != 5 || parts[0] != "enc" || parts[1] != "v1" {
        return Err(Error::Configuration(
            "invalid encrypted secret format".to_owned(),
        ));
    }

    let decode = |part: &str| {
        B64.decode(part)
            .map_err(|_| Error::Configuration("invalid encrypted secret payload".to_owned()))
    };
    let iv = decode(parts[2])?;
    let tag = decode(parts[3])?;
    let mut ciphertext = decode(parts[4])?;

    if iv.len() != IV_BYTES || tag.len() != TAG_BYTES {
        return Err(Error::Configuration(
            "invalid encrypted secret payload".to_owned(),
        ));
    }
    ciphertext.extend_from_slice(&tag);

    let key = Key::<Aes256Gcm>::from_slice(cipher_key()?);
    let cipher = Aes256Gcm::new(key);
    let plaintext = cipher
        .decrypt(
            Nonce::from_slice(&iv),
            Payload {
                msg: &ciphertext,
                aad: &[],
            },
        )
        .map_err(|_| Error::Configuration("secret decryption failed".to_owned()))?;

    String::from_utf8(plaintext)
        .map_err(|_| Error::Configuration("secret decryption failed".to_owned()))
}

pub fn generate_secret() -> String {
    format!("whsec_{}", uuid::Uuid::new_v4())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn with_key<T>(run: impl FnOnce() -> T) -> T {
        unsafe { std::env::set_var("SECRET_ENCRYPTION_KEY", "test-key-material") };
        run()
    }

    #[test]
    fn round_trips() {
        with_key(|| {
            let encrypted = encrypt_secret("whsec_abc").expect("encrypt");
            assert!(encrypted.starts_with("enc:v1:"));
            assert_eq!(decrypt_secret(&encrypted).expect("decrypt"), "whsec_abc");
        });
    }

    #[test]
    fn passes_through_already_encrypted_and_plaintext() {
        with_key(|| {
            assert_eq!(
                encrypt_secret("enc:v1:a:b:c").expect("noop"),
                "enc:v1:a:b:c"
            );
            assert_eq!(decrypt_secret("plain").expect("noop"), "plain");
        });
    }
}
