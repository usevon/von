package crypto

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"fmt"

	"github.com/usevon/von/pkg/types"
)

// GenerateSignature creates an HMAC signature for webhook payloads.
// Returns the signature as a hex-encoded string with the algorithm prefix.
func GenerateSignature(payload []byte, secret string, algo types.SignatureAlgo) (string, error) {
	switch algo {
	case types.SignatureAlgoSHA256:
		return generateSHA256(payload, secret), nil
	case types.SignatureAlgoSHA512:
		return generateSHA512(payload, secret), nil
	default:
		return "", fmt.Errorf("unsupported signature algorithm: %s", algo)
	}
}

// VerifySignature validates an HMAC signature against the expected payload and secret.
func VerifySignature(payload []byte, secret string, signature string, algo types.SignatureAlgo) (bool, error) {
	expected, err := GenerateSignature(payload, secret, algo)
	if err != nil {
		return false, err
	}
	return hmac.Equal([]byte(signature), []byte(expected)), nil
}

// generateSHA256 creates an HMAC-SHA256 signature with v1 prefix.
func generateSHA256(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return "v1," + hex.EncodeToString(mac.Sum(nil))
}

// generateSHA512 creates an HMAC-SHA512 signature with v1 prefix.
func generateSHA512(payload []byte, secret string) string {
	mac := hmac.New(sha512.New, []byte(secret))
	mac.Write(payload)
	return "v1," + hex.EncodeToString(mac.Sum(nil))
}
