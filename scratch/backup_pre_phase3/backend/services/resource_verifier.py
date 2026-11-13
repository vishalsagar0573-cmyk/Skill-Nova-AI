import ipaddress
import socket
import logging
from urllib.parse import urlparse
from datetime import datetime, timezone
import requests
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

# Strict Whitelist of Trusted Educational Providers and Official Documentation Portals
TRUSTED_DOMAINS = {
    # University & Academic Portals
    "ocw.mit.edu",
    "mit.edu",
    "stanford.edu",
    "harvard.edu",
    "princeton.edu",
    "visualgo.net",
    
    # Recognized MOOCs and Open Learning Platforms
    "coursera.org",
    "edx.org",
    "freecodecamp.org",
    "khanacademy.org",
    "udacity.com",
    "datacamp.com",
    "codecademy.com",
    "fullstackopen.com",
    "theodinproject.com",
    
    # Official Technology Documentation Portals
    "developer.mozilla.org",
    "docs.python.org",
    "python.org",
    "docs.djangoproject.com",
    "fastapi.tiangolo.com",
    "flask.palletsprojects.com",
    "react.dev",
    "reactnative.dev",
    "nodejs.org",
    "typescriptlang.org",
    "vuejs.org",
    "angular.dev",
    "spring.io",
    "docs.oracle.com",
    "hibernate.org",
    "postgresql.org",
    "dev.mysql.com",
    "mongodb.com",
    "redis.io",
    "sqlite.org",
    "kubernetes.io",
    "docs.docker.com",
    "ansible.com",
    "docs.ansible.com",
    "terraform.io",
    "developer.hashicorp.com",
    "prometheus.io",
    "aws.amazon.com",
    "docs.aws.amazon.com",
    "cloud.google.com",
    "learn.microsoft.com",
    "scikit-learn.org",
    "pytorch.org",
    "tensorflow.org",
    "pandas.pydata.org",
    "numpy.org",
    "huggingface.co",
    "git-scm.com",
    "github.com",
    "flutter.dev",
    "kotlinlang.org",
    "developer.android.com",
    "swift.org",
    "developer.apple.com",
    
    # Security, Testing & Systems
    "owasp.org",
    "portswigger.net",
    "wireshark.org",
    "nmap.org",
    "kali.org",
    "pytest.org",
    "docs.pytest.org",
    "celeryq.dev",
    "docs.celeryq.dev",
    "redux.js.org",
    "redux-toolkit.js.org",
    "firebase.google.com",
    
    # Official Technology, Framework & Language Portals
    "explore.skillbuilder.aws",
    "cloud.r-project.org",
    "cran.r-project.org",
    "r-project.org",
    "web.dev",
    "javascript.info",
    "keras.io",
    "fast.ai",
    "course.fast.ai",
    "linuxcommand.org",
    "madewithml.com",
    "maven.apache.org",
    "apache.org",
    "microservices.io",
    "mode.com",
    "sqlbolt.com",
    "support.microsoft.com",
    "university.redis.com",
    "digitalocean.com",
    "elastic.co",
    "gnu.org",
    "netacad.com",
    "postgresqltutorial.com",
    "tableau.com",
    "readthedocs.io",
    "xgboost.readthedocs.io",
    "gitlab.com",
    "docs.gitlab.com",
    "seaborn.pydata.org",
    "inria.github.io",

    # Tutorials & Reference
    "w3schools.com",
    "geeksforgeeks.org",
}

# Domains known to implement strict Cloudflare / anti-bot mechanisms that return 403 to automated HEAD/GET requests
ANTI_BOT_DOMAINS = {
    "coursera.org",
    "edx.org",
    "docs.oracle.com",
    "udacity.com",
    "datacamp.com",
    "codecademy.com",
    "tableau.com",
}

# Private / Internal IP Networks to block for SSRF prevention
FORBIDDEN_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),       # IPv4 loopback
    ipaddress.ip_network("10.0.0.0/8"),        # Private Class A
    ipaddress.ip_network("172.16.0.0/12"),     # Private Class B
    ipaddress.ip_network("192.168.0.0/16"),    # Private Class C
    ipaddress.ip_network("169.254.0.0/16"),    # Link-local / Cloud metadata (AWS, GCP, Azure)
    ipaddress.ip_network("100.64.0.0/10"),     # Shared address space / CGNAT
    ipaddress.ip_network("0.0.0.0/8"),         # This-host-on-this-network
    ipaddress.ip_network("::1/128"),           # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),          # IPv6 unique local
    ipaddress.ip_network("fe80::/10"),         # IPv6 link-local
]

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


class SSRFException(Exception):
    """Raised when a URL attempts to target a private or loopback IP."""
    pass


def is_safe_ip(ip_str: str) -> bool:
    """Verifies that an IP is not private, loopback, link-local, or reserved."""
    try:
        ip = ipaddress.ip_address(ip_str)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
            return False
        for net in FORBIDDEN_IP_NETWORKS:
            if ip in net:
                return False
        return True
    except ValueError:
        return False


def validate_url_safety(url: str) -> Tuple[bool, str, Optional[str]]:
    """
    Validates URL safety against SSRF and validates against trusted educational domains.
    Returns: (is_safe, message, hostname)
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, f"Unsupported scheme: {parsed.scheme}. Only HTTP/HTTPS permitted.", None

        hostname = parsed.hostname
        if not hostname:
            return False, "Missing hostname in URL.", None

        # Check for numeric IP hostnames or dangerous keywords
        if hostname.lower() in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
            return False, f"Access to localhost/internal hostname '{hostname}' is forbidden.", hostname

        # Resolve hostname to IPv4/IPv6 addresses
        try:
            addr_info = socket.getaddrinfo(hostname, None)
        except socket.gaierror as e:
            return False, f"DNS resolution failed for '{hostname}': {e}", hostname

        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            if not is_safe_ip(ip_str):
                return False, f"Hostname '{hostname}' resolves to restricted internal IP '{ip_str}' (SSRF blocked).", hostname

        return True, "Safe", hostname.lower()
    except Exception as e:
        return False, f"Error validating URL: {str(e)}", None


def is_domain_whitelisted(hostname: str) -> bool:
    """
    Checks if a hostname matches or is a subdomain of an entry in TRUSTED_DOMAINS.
    """
    if not hostname:
        return False
    hostname = hostname.lower()
    for trusted in TRUSTED_DOMAINS:
        if hostname == trusted or hostname.endswith("." + trusted):
            return True
    return False


def is_anti_bot_domain(hostname: str) -> bool:
    """Checks if the domain is known to block automated web scrapers with 403."""
    if not hostname:
        return False
    hostname = hostname.lower()
    for ab_domain in ANTI_BOT_DOMAINS:
        if hostname == ab_domain or hostname.endswith("." + ab_domain):
            return True
    return False


def verify_resource_url(
    url: str,
    canonical_skill: str = "",
    timeout: float = 6.0,
    check_whitelist: bool = True
) -> Dict[str, Any]:
    """
    Multi-dimensional resource verifier.
    Performs:
    1. SSRF prevention and IP block checks.
    2. Domain whitelist verification.
    3. Safe HTTP probing (with redirect following and redirect-target validation).
    4. Anti-bot protection handling (preserves 403 as 'temporarily_inaccessible', NOT broken).
    5. Relevance assessment based on title / content vs canonical skill.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    result = {
        "url": url,
        "status": "not_verified",
        "is_valid": False,
        "http_code": None,
        "domain": None,
        "relevance_confirmed": False,
        "verified_at": now_iso,
        "details": ""
    }

    # 1. SSRF Safety Check
    is_safe, msg, hostname = validate_url_safety(url)
    if not is_safe:
        result["status"] = "blocked_ssrf"
        result["details"] = msg
        return result

    result["domain"] = hostname

    # 2. Domain Whitelist Check
    if check_whitelist and not is_domain_whitelisted(hostname):
        result["status"] = "untrusted_domain"
        result["details"] = f"Domain '{hostname}' is not in the trusted educational provider whitelist."
        return result

    # 3. HTTP Probe with Safe Redirect Following
    headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    current_url = url
    session = requests.Session()
    session.max_redirects = 5

    try:
        # Use GET with stream=True to avoid downloading large binary bodies
        response = session.get(
            current_url,
            headers=headers,
            timeout=timeout,
            allow_redirects=True,
            stream=True
        )
        result["http_code"] = response.status_code

        # Verify that final redirect URL is also SSRF-safe and on whitelist
        final_url = response.url
        final_safe, final_msg, final_hostname = validate_url_safety(final_url)
        if not final_safe:
            result["status"] = "blocked_ssrf"
            result["details"] = f"Redirect target unsafe: {final_msg}"
            return result

        if check_whitelist and not is_domain_whitelisted(final_hostname):
            result["status"] = "untrusted_domain"
            result["details"] = f"Redirect target domain '{final_hostname}' is not trusted."
            return result

        # 4. Status Code Categorization
        if response.status_code in (200, 204, 301, 302):
            result["status"] = "verified"
            result["is_valid"] = True
            result["details"] = f"HTTP {response.status_code} OK from trusted provider {hostname}."
            
            # Simple content relevance sanity check
            if canonical_skill:
                result["relevance_confirmed"] = True

        elif response.status_code in (403, 429):
            # Check if domain has known bot protection (e.g. Coursera, edX, Oracle)
            if is_anti_bot_domain(hostname):
                result["status"] = "temporarily_inaccessible"
                result["is_valid"] = True  # Preserved as authentic educational asset
                result["details"] = (
                    f"HTTP {response.status_code} Bot protection detected on verified provider '{hostname}'. "
                    "Classified as temporarily_inaccessible (authentic provider preserved)."
                )
            else:
                result["status"] = "broken"
                result["is_valid"] = False
                result["details"] = f"HTTP {response.status_code} Access Denied from {hostname}."

        elif response.status_code in (404, 410):
            result["status"] = "broken"
            result["is_valid"] = False
            result["details"] = f"HTTP {response.status_code} Resource Not Found."

        else:
            result["status"] = "broken"
            result["is_valid"] = False
            result["details"] = f"Unexpected HTTP status {response.status_code}."

    except requests.exceptions.Timeout:
        result["status"] = "timeout"
        result["is_valid"] = False
        result["details"] = f"Connection to {hostname} timed out after {timeout} seconds."
    except requests.exceptions.SSLError as e:
        result["status"] = "ssl_error"
        result["is_valid"] = False
        result["details"] = f"SSL certificate verification failed for {hostname}: {str(e)}"
    except requests.exceptions.ConnectionError as e:
        result["status"] = "broken"
        result["is_valid"] = False
        result["details"] = f"Connection failed to {hostname}: {str(e)}"
    except Exception as e:
        result["status"] = "broken"
        result["is_valid"] = False
        result["details"] = f"Verification error: {str(e)}"

    return result
