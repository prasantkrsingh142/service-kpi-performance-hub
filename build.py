"""Build the dashboard with the settings from .env.

Usage:  python build.py            -> dist/ (local use)
        python build.py --publish  -> also updates the root file served by GitHub Pages
Reads .env (falls back to .env.example), injects the values into
src/Service_KPI_Performance_Hub.html and writes dist/Service_KPI_Performance_Hub.html.
Only the Python standard library is used.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src" / "Service_KPI_Performance_Hub.html"
DIST = ROOT / "dist" / "Service_KPI_Performance_Hub.html"
PAGES = ROOT / "Service_KPI_Performance_Hub.html"
BLOCK = re.compile(r"/\*@CONFIG-START\*/.*?/\*@CONFIG-END\*/", re.S)
# The built-in last-year (2025) baseline in the dashboard is NAM-only.
BASELINE_MARKETS = {"NAM"}


def read_env():
    path = ROOT / ".env"
    if not path.exists():
        path = ROOT / ".env.example"
        print("No .env found - using .env.example")
    env = {}
    for n, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            sys.exit(f"{path.name} line {n}: expected KEY=VALUE")
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def number(env, key, minimum=0.0):
    if key not in env or env[key] == "":
        sys.exit(f"Missing {key} in .env")
    try:
        v = float(env[key])
    except ValueError:
        sys.exit(f"{key} must be a number, got {env[key]!r}")
    if v < minimum or (key == "LABOR_RATE" and v <= 0):
        sys.exit(f"{key} must be above 0" if key == "LABOR_RATE" else f"{key} must be 0 or more")
    return v


def main():
    env = read_env()
    market = env.get("MARKET", "").upper()
    if not market:
        sys.exit("Missing MARKET in .env")
    if market not in BASELINE_MARKETS:
        sys.exit(f"MARKET={market} is not supported: the built-in last-year baseline is for "
                 f"{', '.join(sorted(BASELINE_MARKETS))} only.")
    cfg = {
        "market": market,
        "laborRate": number(env, "LABOR_RATE"),
        "targets": {
            "rr": number(env, "TARGET_RR"),
            "fnp": number(env, "TARGET_FVF_WITHOUT_PARTS"),
            "fwp": number(env, "TARGET_FVF_WITH_PARTS"),
        },
    }
    html = SRC.read_text(encoding="utf-8")
    if len(BLOCK.findall(html)) != 1:
        sys.exit("Config block not found exactly once in the source HTML")
    block = "/*@CONFIG-START*/var FCFG=" + json.dumps(cfg, separators=(",", ":")) + ";/*@CONFIG-END*/"
    html = BLOCK.sub(lambda _: block, html)
    DIST.parent.mkdir(exist_ok=True)
    DIST.write_text(html, encoding="utf-8", newline="")
    print(f"Built {DIST.relative_to(ROOT)}")
    if "--publish" in sys.argv[1:]:
        PAGES.write_text(html, encoding="utf-8", newline="")
        print(f"Updated {PAGES.name} (GitHub Pages) - commit and push it to publish")
    print(f"  Market {cfg['market']} | labor rate {cfg['laborRate']} EUR/h | FY targets "
          f"RR {cfg['targets']['rr']:,.2f}, FVF w/o parts {cfg['targets']['fnp']:,.2f}, "
          f"FVF with parts {cfg['targets']['fwp']:,.2f}")


if __name__ == "__main__":
    main()
