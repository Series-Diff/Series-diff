# utils/time_utils.py
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Dict, Any


def parse_iso_maybe_z(ts: str) -> datetime:
    """
    Parse ISO timestamp possibly ending with 'Z' into an aware datetime in UTC.
    """
    if ts.endswith("Z"):
        # replace Z with +00:00 so fromisoformat accepts it
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    # if it already has offset, fromisoformat handles it; if naive, assume naive = local?
    # We'll treat naive strings as UTC to be safe.
    try:
        dt = datetime.fromisoformat(ts)
    except ValueError:
        # fallback: try removing milliseconds or other common variants
        raise
    if dt.tzinfo is None:
        # assume UTC for purely naive timestamps coming from upstream
        return dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt


def convert_timeseries_keys_timezone(data: Dict[str, Any], tz_str: str = "Europe/Warsaw", keep_offset: bool = False) -> Dict[str, Any]:
    """
    Convert top-level timestamp keys of a nested timeseries dict to specified timezone.
    - data: { "2024-11-01T23:00:01.000Z": { "Value": { "file": val } }, ... }
    - tz_str: IANA timezone, e.g. "Europe/Warsaw" or "UTC"
    - keep_offset: if True -> resulting keys include offset e.g. +01:00; if False -> naive local ISO (no tz).
    Returns a new dict with converted keys; nested structure preserved.
    """
    if not isinstance(data, dict):
        return data

    target_tz = ZoneInfo(tz_str)
    out: Dict[str, Any] = {}
    for key, value in data.items():
        try:
            dt_utc = parse_iso_maybe_z(key)  # aware (UTC)
        except Exception:
            # if key is not a timestamp, keep as-is
            out[key] = value
            continue

        # convert to target tz
        dt_local = dt_utc.astimezone(target_tz)

        if keep_offset:
            new_key = dt_local.isoformat(timespec='seconds')
        else:
            # produce naive local ISO (no tz info) e.g. 2024-11-02T00:00:01
            new_key = dt_local.replace(tzinfo=None).isoformat(timespec='seconds')

        # avoid key collision (if two UTC keys map to same local timestamp)
        # if collision, append a suffix (rare)
        if new_key in out:
            suffix = 1
            candidate = f"{new_key}-{suffix}"
            while candidate in out:
                suffix += 1
                candidate = f"{new_key}-{suffix}"
            new_key = candidate

        out[new_key] = value

    return out
