# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
from urllib.parse import urlsplit
import nh3
from bs4 import BeautifulSoup
from django.conf import settings


def parse_url(value):
    try:
        return urlsplit(value)
    except ValueError:
        return urlsplit("")


def client_html(html, assets, asset_base, asset_query=""):
    """Only parent-bound images survive; internal identities and embeds never leave Plane."""
    soup = BeautifulSoup(html or "", "html.parser")
    for element in list(soup.find_all(True)):
        if not element.attrs:
            continue
        kind = str(element.get("data-type", "")) + str(element.get("data-mention-type", ""))
        if (
            "mention" in kind
            or "embed" in kind
            or element.name == "mention-component"
            or element.has_attr("entity_identifier")
            or element.has_attr("data-entity-identifier")
        ):
            element.decompose()
    image_urls = {}
    for asset in assets:
        if asset.attributes.get("type") in ("image/png", "image/jpeg", "image/webp", "image/gif"):
            image_urls[parse_url(asset.asset_url).path] = f"{asset_base}{asset.id}/{asset_query}"
    for img in list(soup.find_all("img")):
        target = image_urls.get(parse_url(img.get("src", "")).path)
        if target:
            img.attrs = {"src": target, "alt": img.get("alt", "")[:300]}
        else:
            img.decompose()
    internal_hosts = {urlsplit(getattr(settings, k, "") or "").hostname for k in ("WEB_URL", "APP_BASE_URL")}
    internal_hosts.add(getattr(settings, "DOMAIN_NAME", ""))
    internal_hosts.add("portal.refract.group")
    for link in soup.find_all("a"):
        parsed = parse_url(link.get("href", ""))
        if parsed.scheme not in ("https", "http") or not parsed.hostname or parsed.hostname in internal_hosts:
            link.unwrap()
    return nh3.clean(
        str(soup),
        tags={
            "p",
            "br",
            "strong",
            "em",
            "s",
            "u",
            "h1",
            "h2",
            "h3",
            "h4",
            "ul",
            "ol",
            "li",
            "blockquote",
            "pre",
            "code",
            "a",
            "img",
            "table",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
            "hr",
        },
        attributes={
            "a": {"href", "title"},
            "img": {"src", "alt"},
            "th": {"colspan", "rowspan"},
            "td": {"colspan", "rowspan"},
        },
        url_schemes={"https", "http"},
        link_rel="noopener noreferrer",
    )
