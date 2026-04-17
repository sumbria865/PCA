"""
run_pca.py
Entry point called by Node.js via child_process.spawn.
Usage:
  python3 run_pca.py \
    --analysis-id <mongoId> \
    --file <path/to/file.csv> \
    --components 2 \
    --sample-size 5000 \
    --mongo-uri mongodb+srv://...
"""

import argparse
import sys
from pca_engine import PCAEngine


def main():
    parser = argparse.ArgumentParser(description='Run PCA on mHealth dataset')
    parser.add_argument('--analysis-id', required=True)
    parser.add_argument('--file', required=True)
    parser.add_argument('--components', type=int, default=2)
    parser.add_argument('--sample-size', type=int, default=5000)
    parser.add_argument('--mongo-uri', required=True)
    args = parser.parse_args()

    print(f'[PCA] Starting analysis {args.analysis_id}')
    print(f'[PCA] File: {args.file}')
    print(f'[PCA] Components: {args.components} | Sample: {args.sample_size}')

    engine = PCAEngine(
        analysis_id=args.analysis_id,
        file_path=args.file,
        n_components=args.components,
        sample_size=args.sample_size,
        mongo_uri=args.mongo_uri,
    )
    engine.run()
    print(f'[PCA] Done.')


if __name__ == '__main__':
    main()