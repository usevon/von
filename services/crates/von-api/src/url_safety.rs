use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};
use von_error::{Error, Result};

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
    if let Some(mapped) = ip.to_ipv4() {
        return is_private_ipv4(mapped);
    }
    let seg = ip.segments();
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
    (first & 0xfe00) == 0xfc00 || (first & 0xffc0) == 0xfe80 || (first & 0xff00) == 0xff00
}

fn is_private_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => is_private_ipv4(v4),
        IpAddr::V6(v6) => is_private_ipv6(v6),
    }
}

struct ParsedUrl {
    host: String,
    port: u16,
}

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

pub struct PinnedTarget {
    pub host: String,
    pub port: u16,
    pub addrs: Vec<SocketAddr>,
}

fn reject() -> Error {
    Error::BadRequest(
        "Invalid webhook URL: must be http(s) and not target private networks".to_owned(),
    )
}

fn blocks_private() -> bool {
    // The loopback allowance for tests is compiled out of release builds, so a
    // production binary can never be talked into delivering to a private address.
    if cfg!(debug_assertions) && std::env::var("VON_ALLOW_PRIVATE_TARGETS").is_ok_and(|v| v == "1")
    {
        return false;
    }
    true
}

pub async fn assert_safe_webhook_url(url: &str) -> Result<()> {
    vet_delivery_target(url).await.map(|_| ())
}

pub async fn vet_delivery_target(url: &str) -> Result<PinnedTarget> {
    let parsed = parse_http_url(url).ok_or_else(reject)?;
    let block = blocks_private();

    if let Ok(ip) = strip_zone(&parsed.host).parse::<IpAddr>() {
        if block && is_private_ip(ip) {
            return Err(reject());
        }
        return Ok(PinnedTarget {
            host: parsed.host,
            port: parsed.port,
            addrs: Vec::new(),
        });
    }

    let addrs: Vec<SocketAddr> = tokio::net::lookup_host((parsed.host.as_str(), parsed.port))
        .await
        .map_err(|_| reject())?
        .collect();
    if addrs.is_empty() || (block && addrs.iter().any(|a| is_private_ip(a.ip()))) {
        return Err(reject());
    }
    Ok(PinnedTarget {
        host: parsed.host,
        port: parsed.port,
        addrs,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn rejects_private_and_malformed_targets() {
        for url in [
            "http://127.0.0.1/hook",
            "https://10.0.0.5/hook",
            "https://169.254.169.254/latest",
            "http://[::1]/hook",
            "http://[::127.0.0.1]/hook",
            "http://[64:ff9b::7f00:1]/hook",
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

    #[tokio::test]
    async fn a_public_literal_pins_with_no_override_needed() {
        let pinned = vet_delivery_target("https://1.1.1.1/hook")
            .await
            .expect("public literal");
        assert_eq!(pinned.host, "1.1.1.1");
        assert_eq!(pinned.port, 443);
        assert!(pinned.addrs.is_empty());

        assert!(vet_delivery_target("https://10.0.0.5/hook").await.is_err());
    }
}
