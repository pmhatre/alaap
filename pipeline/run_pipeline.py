"""Pipeline orchestrator CLI.

Usage:
    uv run python run_pipeline.py --all              # Run everything
    uv run python run_pipeline.py --scrape            # Scrape all sources
    uv run python run_pipeline.py --scrape --source wikipedia  # Scrape one source
    uv run python run_pipeline.py --reconcile         # Reconcile staging files
    uv run python run_pipeline.py --load              # Load into Neo4j
"""

import argparse
import logging
import sys
from pathlib import Path

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Source name → scraper module
SCRAPERS = {
    "bollywood_lyrics": "scrapers.bollywood_lyrics",
    "carvaan": "scrapers.carvaan",
    "chandrakantha": "scrapers.chandrakantha",
    "wikipedia": "scrapers.wikipedia",
}


def run_scrape(sources: list[str] | None = None):
    """Run scrapers for specified sources (or all)."""
    import importlib

    targets = sources or list(SCRAPERS.keys())
    for name in targets:
        if name not in SCRAPERS:
            logger.error(f"Unknown source: {name}. Available: {list(SCRAPERS.keys())}")
            continue
        logger.info(f"=== Scraping: {name} ===")
        module = importlib.import_module(SCRAPERS[name])
        module.run()
        logger.info(f"=== Done: {name} ===\n")


def run_reconcile():
    """Run the reconciler."""
    import reconcile

    logger.info("=== Reconciling staging files ===")
    reconcile.run()
    logger.info("=== Reconciliation complete ===\n")


def run_load():
    """Run the Neo4j loader."""
    from loaders.neo4j_loader import run as loader_run

    logger.info("=== Loading into Neo4j ===")
    loader_run()
    logger.info("=== Load complete ===\n")


def main():
    # Load .env.local for Neo4j credentials
    env_path = Path(__file__).resolve().parent.parent / ".env.local"
    if env_path.exists():
        load_dotenv(env_path)
        logger.info(f"Loaded env from {env_path}")

    parser = argparse.ArgumentParser(description="Alaap data pipeline orchestrator")
    parser.add_argument("--scrape", action="store_true", help="Run scrapers")
    parser.add_argument("--reconcile", action="store_true", help="Reconcile staging files")
    parser.add_argument("--load", action="store_true", help="Load into Neo4j")
    parser.add_argument("--all", action="store_true", help="Run full pipeline (scrape → reconcile → load)")
    parser.add_argument("--source", type=str, help="Scrape only this source (used with --scrape)")

    args = parser.parse_args()

    if not any([args.scrape, args.reconcile, args.load, args.all]):
        parser.print_help()
        sys.exit(1)

    if args.all:
        run_scrape()
        run_reconcile()
        run_load()
    else:
        if args.scrape:
            sources = [args.source] if args.source else None
            run_scrape(sources)
        if args.reconcile:
            run_reconcile()
        if args.load:
            run_load()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    main()
