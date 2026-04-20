# UniFi Network API Endpoints (v10.1.84)

> Source: https://developer.ui.com/network/v10.1.84
> Extracted: 2026-04-20
> Base path for Cloud Connector: `/v1/connector/consoles/{consoleId}/proxy/network/integration`
> Local path prefix: `/v1/sites/{siteId}/...`

## Application Info
| Method | Path | Name | Read-only |
|--------|------|------|-----------|
| GET | `/v1/info` | Get Application Info | ✅ |

## Sites
| Method | Path | Name | Read-only |
|--------|------|------|-----------|
| GET | `/v1/sites` | List Local Sites | ✅ |

## UniFi Devices
| Method | Path | Name | Read-only |
|--------|------|------|-----------|
| GET | `/v1/sites/{siteId}/devices` | List Adopted Devices | ✅ |
| POST | `/v1/sites/{siteId}/devices` | Adopt Devices | ❌ |
| POST | `/v1/sites/{siteId}/devices/{deviceId}/interfaces/ports/{portIdx}/actions` | Execute Port Action | ❌ |
| POST | `/v1/sites/{siteId}/devices/{deviceId}/actions` | Execute Device Action | ❌ |
| GET | `/v1/sites/{siteId}/devices/{deviceId}` | Get Device Details | ✅ |
| DELETE | `/v1/sites/{siteId}/devices/{deviceId}` | Remove (Unadopt) Device | ❌ |
| GET | `/v1/sites/{siteId}/devices/{deviceId}/statistics/latest` | Get Device Statistics | ✅ |
| GET | `/v1/pending-devices` | List Pending Devices | ✅ |

## Clients
| Method | Path | Name | Read-only |
|--------|------|------|-----------|
| POST | `/v1/sites/{siteId}/clients/{clientId}/actions` | Execute Client Action | ❌ |
| GET | `/v1/sites/{siteId}/clients` | List Connected Clients | ✅ |
| GET | `/v1/sites/{siteId}/clients/{clientId}` | Get Client Details | ✅ |

## Networks
| Method | Path | Name | Read-only |
|--------|------|------|-----------|
| GET | `/v1/sites/{siteId}/networks/{networkId}` | Get Network Details | ✅ |
| PUT | `/v1/sites/{siteId}/networks/{networkId}` | Update Network | ❌ |
| DELETE | `/v1/sites/{siteId}/networks/{networkId}` | Delete Network | ❌ |
| GET | `/v1/sites/{siteId}/networks` | List Networks | ✅ |
| POST | `/v1/sites/{siteId}/networks` | Create Network | ❌ |
| GET | `/v1/sites/{siteId}/networks/{networkId}/references` | Get Network References | ✅ |

## WiFi Broadcasts
| Method | Path | Name | Read-only |
|--------|------|------|-----------|
| GET | `/v1/sites/{siteId}/wifi/broadcasts/{wifiBroadcastId}` | Get WiFi Broadcast Details | ✅ |
| PUT | `/v1/sites/{siteId}/wifi/broadcasts/{wifiBroadcastId}` | Update WiFi Broadcast | ❌ |
| DELETE | `/v1/sites/{siteId}/wifi/broadcasts/{wifiBroadcastId}` | Delete WiFi Broadcast | ❌ |
| GET | `/v1/sites/{siteId}/wifi/broadcasts` | List WiFi Broadcasts | ✅ |
| POST | `/v1/sites/{siteId}/wifi/broadcasts` | Create WiFi Broadcast | ❌ |

## Hotspot (Vouchers)
| Method | Path | Name | Read-only |
|--------|------|------|-----------|
| GET | `/v1/sites/{siteId}/hotspot/vouchers` | List Vouchers | ✅ |
| POST | `/v1/sites/{siteId}/hotspot/vouchers` | Generate Vouchers | ❌ |
| DELETE | `/v1/sites/{siteId}/hotspot/vouchers` | Delete Vouchers (bulk) | ❌ |
| GET | `/v1/sites/{siteId}/hotspot/vouchers/{voucherId}` | Get Voucher Details | ✅ |
| DELETE | `/v1/sites/{siteId}/hotspot/vouchers/{voucherId}` | Delete Voucher | ❌ |

## Firewall
| Method | Path | Name | Read-only |
|--------|------|------|-----------|
| GET | `/v1/sites/{siteId}/firewall/zones/{firewallZoneId}` | Get Firewall Zone | ✅ |
| PUT | `/v1/sites/{siteId}/firewall/zones/{firewallZoneId}` | Update Firewall Zone | ❌ |
| DELETE | `/v1/sites/{siteId}/firewall/zones/{firewallZoneId}` | Delete Firewall Zone | ❌ |
| GET | `/v1/sites/{siteId}/firewall/policies/{firewallPolicyId}` | Get Firewall Policy | ✅ |
| PUT | `/v1/sites/{siteId}/firewall/policies/{firewallPolicyId}` | Update Firewall Policy | ❌ |
| DELETE | `/v1/sites/{siteId}/firewall/policies/{firewallPolicyId}` | Delete Firewall Policy | ❌ |
| PATCH | `/v1/sites/{siteId}/firewall/policies/{firewallPolicyId}` | Patch Firewall Policy | ❌ |
| GET | `/v1/sites/{siteId}/firewall/policies/ordering` | Get Policy Ordering | ✅ |
| PUT | `/v1/sites/{siteId}/firewall/policies/ordering` | Reorder Policies | ❌ |
| GET | `/v1/sites/{siteId}/firewall/zones` | List Firewall Zones | ✅ |
| POST | `/v1/sites/{siteId}/firewall/zones` | Create Firewall Zone | ❌ |
| GET | `/v1/sites/{siteId}/firewall/policies` | List Firewall Policies | ✅ |
| POST | `/v1/sites/{siteId}/firewall/policies` | Create Firewall Policy | ❌ |

## Access Control (ACL Rules)
| Method | Path | Name | Read-only |
|--------|------|------|-----------|
| GET | `/v1/sites/{siteId}/acl-rules/{aclRuleId}` | Get ACL Rule | ✅ |
| PUT | `/v1/sites/{siteId}/acl-rules/{aclRuleId}` | Update ACL Rule | ❌ |
| DELETE | `/v1/sites/{siteId}/acl-rules/{aclRuleId}` | Delete ACL Rule | ❌ |
| GET | `/v1/sites/{siteId}/acl-rules/ordering` | Get ACL Ordering | ✅ |
| PUT | `/v1/sites/{siteId}/acl-rules/ordering` | Reorder ACL Rules | ❌ |
| GET | `/v1/sites/{siteId}/acl-rules` | List ACL Rules | ✅ |
| POST | `/v1/sites/{siteId}/acl-rules` | Create ACL Rule | ❌ |

## DNS Policies
| Method | Path | Name | Read-only |
|--------|------|------|-----------|
| GET | `/v1/sites/{siteId}/dns/policies/{dnsPolicyId}` | Get DNS Policy | ✅ |
| PUT | `/v1/sites/{siteId}/dns/policies/{dnsPolicyId}` | Update DNS Policy | ❌ |
| DELETE | `/v1/sites/{siteId}/dns/policies/{dnsPolicyId}` | Delete DNS Policy | ❌ |
| GET | `/v1/sites/{siteId}/dns/policies` | List DNS Policies | ✅ |
| POST | `/v1/sites/{siteId}/dns/policies` | Create DNS Policy | ❌ |

## Traffic Matching Lists
| Method | Path | Name | Read-only |
|--------|------|------|-----------|
| GET | `/v1/sites/{siteId}/traffic-matching-lists/{id}` | Get Traffic Matching List | ✅ |
| PUT | `/v1/sites/{siteId}/traffic-matching-lists/{id}` | Update Traffic Matching List | ❌ |
| DELETE | `/v1/sites/{siteId}/traffic-matching-lists/{id}` | Delete Traffic Matching List | ❌ |
| GET | `/v1/sites/{siteId}/traffic-matching-lists` | List Traffic Matching Lists | ✅ |
| POST | `/v1/sites/{siteId}/traffic-matching-lists` | Create Traffic Matching List | ❌ |

## Supporting Resources
| Method | Path | Name | Read-only |
|--------|------|------|-----------|
| GET | `/v1/sites/{siteId}/wans` | List WAN Interfaces | ✅ |
| GET | `/v1/sites/{siteId}/vpn/site-to-site-tunnels` | List VPN Tunnels | ✅ |
| GET | `/v1/sites/{siteId}/vpn/servers` | List VPN Servers | ✅ |
| GET | `/v1/sites/{siteId}/radius/profiles` | List RADIUS Profiles | ✅ |
| GET | `/v1/sites/{siteId}/device-tags` | List Device Tags | ✅ |
| GET | `/v1/dpi/categories` | List DPI Categories | ✅ |
| GET | `/v1/dpi/applications` | List DPI Applications | ✅ |
| GET | `/v1/countries` | List Countries | ✅ |

---

## Summary

| | Total | GET (read) | POST/PUT/DELETE/PATCH (write) |
|---|---|---|---|
| **All endpoints** | 66 | 37 | 29 |
| **Read-only (our scope)** | 37 | 37 | — |

## Cloud Connector Path Mapping

Documentation shows the connector path pattern:
```
https://api.ui.com/v1/connector/consoles/{consoleId}/proxy/network/integration/v1/sites/{siteId}/...
```

So for our connector client, the `appPath` parameter should be:
```
network/integration/v1/sites/{localSiteId}/clients
network/integration/v1/sites/{localSiteId}/devices
network/integration/v1/sites/{localSiteId}/networks
network/integration/v1/sites/{localSiteId}/wifi/broadcasts    ← NOT "wifibroadcasts"
network/integration/v1/sites/{localSiteId}/firewall/policies
network/integration/v1/sites/{localSiteId}/firewall/zones
network/integration/v1/sites/{localSiteId}/acl-rules
network/integration/v1/sites/{localSiteId}/dns/policies
network/integration/v1/sites/{localSiteId}/traffic-matching-lists
network/integration/v1/sites/{localSiteId}/hotspot/vouchers
network/integration/v1/sites/{localSiteId}/wans
network/integration/v1/sites/{localSiteId}/vpn/site-to-site-tunnels
network/integration/v1/sites/{localSiteId}/vpn/servers
network/integration/v1/sites/{localSiteId}/radius/profiles
network/integration/v1/sites/{localSiteId}/device-tags
network/integration/v1/sites/{localSiteId}/devices/{deviceId}/statistics/latest
network/integration/v1/info
network/integration/v1/pending-devices
network/integration/v1/dpi/categories
network/integration/v1/dpi/applications
network/integration/v1/countries
```

## WiFi Path Correction

Earlier test got 404 on `wifi` — the correct path is `wifi/broadcasts` (not `wifibroadcasts`).
