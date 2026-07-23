use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use von_error::{Error, Result};

const BLOCKED_HOSTNAMES: [&str; 5] = [
    "localhost",
    "metadata.google.internal",
    "metadata.goog",
    "instance-data",
    "metadata.azure.com",
];

const PRIVATE_IPV4_RANGES: [(u32, u32); 9] = [
    (0x0000_0000, 0x00ff_ffff),
    (0x0a00_0000, 0x0aff_ffff),
    (0x6440_0000, 0x647f_ffff),
    (0x7f00_0000, 0x7fff_ffff),
    (0xa9fe_0000, 0xa9fe_ffff),
    (0xac10_0000, 0xac1f_ffff),
    (0xc0a8_0000, 0xc0a8_ffff),
    (0xc612_0000, 0xc613_ffff),
    (0xe000_0000, 0xffff_ffff),
];

fn is_private_ipv4(ip: Ipv4Addr) -> bool {
    let value = u32::from(ip);
    PRIVATE_IPV4_RANGES
        .iter()
        .any(|(start, end)| value >= *start && value <= *end)
}

fn is_private_ipv6(ip: Ipv6Addr) -> bool {
    // to_ipv4 also maps the deprecated compatible form, a bare ::a.b.c.d.
    if let Some(mapped) = ip.to_ipv4() {
        return is_private_ipv4(mapped);
    }
    let seg = ip.segments();
    // NAT64 64:ff9b::/96 embeds an IPv4 address in the last 32 bits.
    if seg[..6] == [0x64, 0xff9b, 0, 0, 0, 0] {
        return is_private_ipv4(Ipv4Addr::new(
            (seg[6] >> 8) as u8,
            seg[6] as u8,
            (seg[7] >> 8) as u8,
            seg[7] as u8,
        ));
    }
    if ip.is_unspecified() || ip.is_loopback() {
        return true;
    }
    let first = seg[0];
    // Covers unique local fc00::/7, link local fe80::/10, and multicast ff00::/8.
    (first & 0xfe00) == 0xfc00 || (first & 0xffc0) == 0xfe80 || (first & 0xff00) == 0xff00
}

fn is_private_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => is_private_ipv4(v4),
        IpAddr::V6(v6) => is_private_ipv6(v6),
    }
}

fn is_blocked_hostname(host: &str) -> bool {
    let lower = host.to_lowercase();
    BLOCKED_HOSTNAMES
        .iter()
        .any(|h| lower == *h || lower.ends_with(&format!(".{h}")))
}

struct ParsedUrl {
    host: String,
    port: u16,
}

/// Hand parsed because the scheme, host, and port are the only parts that matter
/// and pulling a url crate in for that would be the only use of it.
fn parse_http_url(url: &str) -> Option<ParsedUrl> {
    let (scheme, rest) = url.split_once("://")?;
    let default_port = match scheme.to_lowercase().as_str() {
        "http" => 80,
        "https" => 443,
        _ => return None,
    };

    let authority = rest
        .split(['/', '?', '#'])
        .next()
        .filter(|a| !a.is_empty())?;
    let authority = authority.rsplit_once('@').map_or(authority, |(_, a)| a);

    let (host, port) = if let Some(end) = authority.strip_prefix('[') {
        let (inside, tail) = end.split_once(']')?;
        let port = match tail.strip_prefix(':') {
            Some(p) => p.parse().ok()?,
            None if tail.is_empty() => default_port,
            None => return None,
        };
        (inside.to_owned(), port)
    } else {
        match authority.split_once(':') {
            Some((h, p)) => (h.to_owned(), p.parse().ok()?),
            None => (authority.to_owned(), default_port),
        }
    };

    if host.is_empty() {
        return None;
    }
    Some(ParsedUrl { host, port })
}

fn strip_zone(host: &str) -> &str {
    host.split_once('%').map_or(host, |(h, _)| h)
}

/// Rejects anything that resolves into a private range so a tenant cannot point a
/// webhook at internal services or a cloud metadata endpoint.
pub async fn assert_safe_webhook_url(url: &str) -> Result<()> {
    let reject = || {
        Error::BadRequest(
            "Invalid webhook URL: must be http(s) and not target private networks".to_owned(),
        )
    };

    let parsed = parse_http_url(url).ok_or_else(reject)?;
    if is_blocked_hostname(&parsed.host) {
        return Err(reject());
    }

    if let Ok(ip) = strip_zone(&parsed.host).parse::<IpAddr>() {
        if is_private_ip(ip) {
            return Err(reject());
        }
        return Ok(());
    }

    let addrs = tokio::net::lookup_host((parsed.host.as_str(), parsed.port))
        .await
        .map_err(|_| reject())?;

    let mut any = false;
    for addr in addrs {
        any = true;
        if is_private_ip(addr.ip()) {
            return Err(reject());
        }
    }

    if any { Ok(()) } else { Err(reject()) }
}

/// Re-vets a hostname target at send time because DNS can change after create.
/// An IP literal cannot rebind, so it is skipped and keeps its create-time verdict.
pub async fn assert_safe_delivery_target(url: &str) -> Result<()> {
    let is_ip_literal = parse_http_url(url)
        .is_some_and(|parsed| strip_zone(&parsed.host).parse::<IpAddr>().is_ok());
    if is_ip_literal {
        return Ok(());
    }
    assert_safe_webhook_url(url).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn rejects_private_and_blocked_targets() {
        for url in [
            "http://localhost/hook",
            "http://127.0.0.1/hook",
            "https://10.0.0.5/hook",
            "https://169.254.169.254/latest",
            "http://[::1]/hook",
            "http://[::127.0.0.1]/hook",
            "http://[64:ff9b::7f00:1]/hook",
            "https://metadata.google.internal/x",
            "ftp://example.com/hook",
            "not-a-url",
        ] {
            assert!(
                assert_safe_webhook_url(url).await.is_err(),
                "expected rejection for {url}"
            );
        }
    }

    #[tokio::test]
    async fn allows_public_addresses() {
        assert!(
            assert_safe_webhook_url("https://1.1.1.1/hook")
                .await
                .is_ok()
        );
        assert!(
            assert_safe_webhook_url("https://93.184.216.34:8443/hook")
                .await
                .is_ok()
        );
    }
}
