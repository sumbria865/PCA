"""
run_rnn.py
Entry point called by Node.js via child_process.spawn.

Usage:
  python3 run_rnn.py \
    --rnn-id        <mongoId> \
    --file          <path/to/file.csv> \
    --pca-components 0 \
    --variance-threshold 0.85 \
    --sample-size   10000 \
    --epochs        30 \
    --batch-size    64 \
    --lstm-units    64 \
    --dropout       0.3 \
    --mongo-uri     mongodb+srv://...
"""

import argparse
from rnn_engine import RNNEngine


def main():
    parser = argparse.ArgumentParser(description='Train PCA + BiLSTM on mHealth')

    parser.add_argument('--rnn-id',              required=True)
    parser.add_argument('--file',                required=True)
    parser.add_argument('--pca-components',      type=int,   default=0,
                        help='0 = auto by variance threshold')
    parser.add_argument('--variance-threshold',  type=float, default=0.85,
                        help='Minimum cumulative variance to retain (paper uses 0.85)')
    parser.add_argument('--sample-size',         type=int,   default=10000)
    parser.add_argument('--epochs',              type=int,   default=30)
    parser.add_argument('--batch-size',          type=int,   default=64)
    parser.add_argument('--lstm-units',          type=int,   default=64)
    parser.add_argument('--dropout',             type=float, default=0.3)
    parser.add_argument('--mongo-uri',           required=True)

    args = parser.parse_args()

    print(f'[RNN] Starting job {args.rnn_id}')
    print(f'[RNN] File: {args.file}')
    print(f'[RNN] PCA components: {"auto" if args.pca_components == 0 else args.pca_components} '
          f'(variance≥{args.variance_threshold*100:.0f}%)')
    print(f'[RNN] Sample: {args.sample_size} | Epochs: {args.epochs} | '
          f'Batch: {args.batch_size} | LSTM units: {args.lstm_units}')

    engine = RNNEngine(
        rnn_id             = args.rnn_id,
        file_path          = args.file,
        n_pca_components   = args.pca_components,
        variance_threshold = args.variance_threshold,
        sample_size        = args.sample_size,
        epochs             = args.epochs,
        batch_size         = args.batch_size,
        lstm_units         = args.lstm_units,
        dropout_rate       = args.dropout,
        mongo_uri          = args.mongo_uri,
    )
    engine.run()
    print('[RNN] Script finished.')


if __name__ == '__main__':
    main()