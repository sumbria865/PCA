"""
rnn_engine.py
─────────────────────────────────────────────────────────────────────────────
Implements the pipeline from:
  Aljarrah, A.A. & Ali, A.H. (2019).
  "Human Activity Recognition using PCA and BiLSTM Recurrent Neural Networks"
  IEEE IICETA 2019, pp. 156-160. DOI: 10.1109/IICETA47481.2019.9012979

Pipeline:
  1. Load & sample mHealth dataset
  2. StandardScaler normalization
  3. PCA dimensionality reduction (retain >= 85% variance by default)
  4. Sequence windowing (reshape into [samples, timesteps, features])
  5. BiLSTM model training
  6. Evaluation: accuracy, loss curves, confusion matrix, classification report
  7. Save all results to MongoDB

Dataset:  mHealth (UCI) — 12 sensor features, 13 activity classes, 10 subjects
─────────────────────────────────────────────────────────────────────────────
"""

import numpy as np
import pandas as pd
import json
import os
import time
import zipfile
import tempfile
import traceback

from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.decomposition import PCA
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score
)

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (
    Bidirectional, LSTM, Dense, Dropout, BatchNormalization
)
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, Callback
from tensorflow.keras.optimizers import Adam

from pymongo import MongoClient
from bson import ObjectId

# ── Constants ─────────────────────────────────────────────────────────────
FEATURE_COLS = ['alx', 'aly', 'alz', 'glx', 'gly', 'glz',
                'arx', 'ary', 'arz', 'grx', 'gry', 'grz']

ACTIVITY_LABELS = {
    0: 'Null',           1: 'Standing Still',  2: 'Sitting & Relaxing',
    3: 'Lying Down',     4: 'Walking',         5: 'Climbing Stairs',
    6: 'Waist Bends',    7: 'Elevation Arms',  8: 'Knees Bending',
    9: 'Cycling',        10: 'Jogging',        11: 'Running',
    12: 'Jump Front & Back'
}

WINDOW_SIZE   = 10   # timesteps per sequence (sliding window)
WINDOW_STEP   = 5    # step between windows


# ── MongoDB progress logger callback ──────────────────────────────────────
class MongoProgressCallback(Callback):
    """Writes per-epoch metrics to MongoDB so the frontend can poll live."""

    def __init__(self, col, oid, total_epochs):
        super().__init__()
        self.col          = col
        self.oid          = oid
        self.total_epochs = total_epochs
        self.history      = {'loss': [], 'accuracy': [], 'val_loss': [], 'val_accuracy': []}

    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        for k in self.history:
            self.history[k].append(float(logs.get(k, 0)))

        progress = int(((epoch + 1) / self.total_epochs) * 100)
        self.col.update_one({'_id': self.oid}, {'$set': {
            'status':           'training',
            'trainingProgress': progress,
            'currentEpoch':     epoch + 1,
            'liveMetrics': {
                'loss':         float(logs.get('loss', 0)),
                'accuracy':     float(logs.get('accuracy', 0)),
                'val_loss':     float(logs.get('val_loss', 0)),
                'val_accuracy': float(logs.get('val_accuracy', 0)),
            },
            'trainingHistory':  self.history,
        }})
        print(f"  Epoch {epoch+1}/{self.total_epochs} — "
              f"loss: {logs.get('loss', 0):.4f}  acc: {logs.get('accuracy', 0):.4f}  "
              f"val_loss: {logs.get('val_loss', 0):.4f}  val_acc: {logs.get('val_accuracy', 0):.4f}")


# ── Main Engine ────────────────────────────────────────────────────────────
class RNNEngine:

    def __init__(self, rnn_id: str, file_path: str,
                 n_pca_components: int, variance_threshold: float,
                 sample_size: int, epochs: int, batch_size: int,
                 lstm_units: int, dropout_rate: float,
                 mongo_uri: str):

        self.rnn_id             = rnn_id
        self.file_path          = file_path
        self.n_pca_components   = n_pca_components       # 0 = auto by variance threshold
        self.variance_threshold = variance_threshold     # e.g. 0.85
        self.sample_size        = sample_size
        self.epochs             = epochs
        self.batch_size         = batch_size
        self.lstm_units         = lstm_units
        self.dropout_rate       = dropout_rate

        self.client = MongoClient(mongo_uri)
        self.db     = self.client['pca_insight']
        self.col    = self.db['rnnmodels']
        self.oid    = ObjectId(rnn_id)

    # ── helpers ──────────────────────────────────────────────────────────

    def _log(self, msg: str):
        print(f'[RNN {self.rnn_id}] {msg}')
        self.col.update_one({'_id': self.oid}, {'$push': {'logs': msg}})

    def _set_status(self, status: str):
        self.col.update_one({'_id': self.oid}, {'$set': {'status': status}})

    def _load_csv(self) -> str:
        ext = os.path.splitext(self.file_path)[1].lower()
        if ext == '.zip':
            with zipfile.ZipFile(self.file_path, 'r') as z:
                csvs = [f for f in z.namelist() if f.endswith('.csv')]
                if not csvs:
                    raise ValueError('No CSV inside ZIP')
                tmpdir = tempfile.mkdtemp()
                z.extract(csvs[0], tmpdir)
                return os.path.join(tmpdir, csvs[0])
        return self.file_path

    def _make_sequences(self, X: np.ndarray, y: np.ndarray):
        """Sliding-window segmentation → [n_windows, WINDOW_SIZE, n_features]"""
        Xs, ys = [], []
        for i in range(0, len(X) - WINDOW_SIZE, WINDOW_STEP):
            Xs.append(X[i: i + WINDOW_SIZE])
            # majority label in the window
            window_labels = y[i: i + WINDOW_SIZE]
            ys.append(np.bincount(window_labels).argmax())
        return np.array(Xs), np.array(ys)

    # ── main ─────────────────────────────────────────────────────────────

    def run(self):
        try:
            self._run_pipeline()
        except Exception as e:
            tb = traceback.format_exc()
            self._log(f'ERROR: {e}')
            self._log(tb)
            self._set_status('failed')
            self.col.update_one({'_id': self.oid}, {'$set': {'errorMessage': str(e)}})
        finally:
            self.client.close()

    def _run_pipeline(self):

        # ── STEP 1 · Load ─────────────────────────────────────────────
        self._log('Step 1/6 — Loading dataset...')
        csv_path = self._load_csv()
        df       = pd.read_csv(csv_path)
        self._log(f'  Total rows: {len(df):,}  |  Columns: {list(df.columns)}')

        # Drop null/transition activity rows for clean class separation
        df = df[df['Activity'] != 0].copy()

        # Sample
        n = min(self.sample_size, len(df))
        df = df.sample(n=n, random_state=42).reset_index(drop=True)
        self._log(f'  Sampled {n:,} rows  |  Activities: {sorted(df["Activity"].unique())}')

        X_raw = df[FEATURE_COLS].values.astype(np.float32)
        y_raw = df['Activity'].values.astype(int)

        # Re-encode labels to 0-based consecutive ints
        le          = LabelEncoder()
        y_encoded   = le.fit_transform(y_raw)
        class_names = [ACTIVITY_LABELS.get(int(c), str(c)) for c in le.classes_]
        n_classes   = len(class_names)
        self._log(f'  Classes ({n_classes}): {class_names}')

        # ── STEP 2 · Normalize ────────────────────────────────────────
        self._log('Step 2/6 — Applying StandardScaler normalization...')
        scaler   = StandardScaler()
        X_scaled = scaler.fit_transform(X_raw)
        self._log(f'  mean≈{X_scaled.mean():.4f}  std≈{X_scaled.std():.4f}')

        # ── STEP 3 · PCA ──────────────────────────────────────────────
        self._log('Step 3/6 — Running PCA dimensionality reduction...')

        # Auto-select components by variance threshold (paper uses ≥85%)
        pca_full = PCA(random_state=42)
        pca_full.fit(X_scaled)
        cumvar = np.cumsum(pca_full.explained_variance_ratio_)

        if self.n_pca_components and self.n_pca_components > 0:
            n_components = min(self.n_pca_components, len(FEATURE_COLS))
        else:
            n_components = int(np.searchsorted(cumvar, self.variance_threshold) + 1)
            n_components = max(2, min(n_components, len(FEATURE_COLS)))

        pca       = PCA(n_components=n_components, random_state=42)
        X_pca     = pca.fit_transform(X_scaled)
        var_ratios = pca.explained_variance_ratio_.tolist()
        cum_var   = float(np.sum(var_ratios))

        self._log(f'  Components selected: {n_components}  |  '
                  f'Cumulative variance: {cum_var*100:.1f}%')
        self._log(f'  Variance per PC: {[round(v*100,1) for v in var_ratios]}%')

        # Feature loadings for PC1
        loadings    = pca.components_[0]
        top_features = sorted(
            [{'feature': FEATURE_COLS[i], 'loading': float(loadings[i])}
             for i in range(len(FEATURE_COLS))],
            key=lambda x: abs(x['loading']), reverse=True
        )[:8]

        # Scree plot data
        scree_plot = [
            {'component': f'PC{i+1}', 'variance': round(float(v)*100, 2)}
            for i, v in enumerate(pca_full.explained_variance_ratio_)
        ]

        # Save PCA info
        self.col.update_one({'_id': self.oid}, {'$set': {
            'pcaComponents':       n_components,
            'pcaVarianceRatios':   var_ratios,
            'pcaCumulativeVariance': round(cum_var * 100, 2),
            'pcaScreenPlot':       scree_plot,
            'pcaTopFeatures':      top_features,
            'classNames':          class_names,
            'nClasses':            n_classes,
        }})

        # ── STEP 4 · Sequence Windowing ───────────────────────────────
        self._log('Step 4/6 — Creating sliding-window sequences...')
        X_seq, y_seq = self._make_sequences(X_pca, y_encoded)
        self._log(f'  Sequences shape: {X_seq.shape}  |  Labels shape: {y_seq.shape}')

        # Train/test split (80/20, stratified)
        X_train, X_test, y_train, y_test = train_test_split(
            X_seq, y_seq, test_size=0.2, random_state=42, stratify=y_seq
        )
        y_train_cat = to_categorical(y_train, n_classes)
        y_test_cat  = to_categorical(y_test,  n_classes)
        self._log(f'  Train: {X_train.shape}  |  Test: {X_test.shape}')

        # ── STEP 5 · Build BiLSTM Model ───────────────────────────────
        self._log('Step 5/6 — Building BiLSTM model (as per Aljarrah & Ali, 2019)...')
        tf.random.set_seed(42)

        model = Sequential([
            Bidirectional(
                LSTM(self.lstm_units, return_sequences=True),
                input_shape=(WINDOW_SIZE, n_components)
            ),
            BatchNormalization(),
            Dropout(self.dropout_rate),

            Bidirectional(LSTM(self.lstm_units // 2, return_sequences=False)),
            BatchNormalization(),
            Dropout(self.dropout_rate),

            Dense(64, activation='relu'),
            Dropout(self.dropout_rate / 2),
            Dense(n_classes, activation='softmax'),
        ])

        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )

        # Log model summary
        summary_lines = []
        model.summary(print_fn=lambda x: summary_lines.append(x))
        param_count = model.count_params()
        self._log(f'  Model parameters: {param_count:,}')
        self._log(f'  Architecture: Input({WINDOW_SIZE}, {n_components}) → '
                  f'BiLSTM({self.lstm_units}) → BiLSTM({self.lstm_units//2}) → '
                  f'Dense(64) → Softmax({n_classes})')

        # Save architecture
        self.col.update_one({'_id': self.oid}, {'$set': {
            'modelParams':    param_count,
            'modelSummary':   '\n'.join(summary_lines),
            'windowSize':     WINDOW_SIZE,
            'windowStep':     WINDOW_STEP,
            'trainSamples':   int(X_train.shape[0]),
            'testSamples':    int(X_test.shape[0]),
        }})

        # ── STEP 6 · Train ────────────────────────────────────────────
        self._log(f'Step 6/6 — Training for {self.epochs} epochs '
                  f'(batch={self.batch_size})...')
        self._set_status('training')

        mongo_cb = MongoProgressCallback(self.col, self.oid, self.epochs)

        callbacks = [
            mongo_cb,
            EarlyStopping(
                monitor='val_accuracy', patience=8,
                restore_best_weights=True, verbose=0
            ),
            ReduceLROnPlateau(
                monitor='val_loss', factor=0.5,
                patience=4, min_lr=1e-6, verbose=0
            ),
        ]

        hist = model.fit(
            X_train, y_train_cat,
            validation_data=(X_test, y_test_cat),
            epochs=self.epochs,
            batch_size=self.batch_size,
            callbacks=callbacks,
            verbose=0,
        )

        # ── EVALUATION ────────────────────────────────────────────────
        self._log('Evaluating model on test set...')

        y_pred_prob = model.predict(X_test, verbose=0)
        y_pred      = np.argmax(y_pred_prob, axis=1)
        test_acc    = float(accuracy_score(y_test, y_pred))

        self._log(f'  Test Accuracy: {test_acc*100:.2f}%')

        # Classification report
        report_dict = classification_report(
            y_test, y_pred,
            target_names=class_names,
            output_dict=True,
            zero_division=0
        )
        report_rows = []
        for cls_name in class_names:
            if cls_name in report_dict:
                m = report_dict[cls_name]
                report_rows.append({
                    'class':     cls_name,
                    'precision': round(m['precision'], 4),
                    'recall':    round(m['recall'],    4),
                    'f1':        round(m['f1-score'],  4),
                    'support':   int(m['support']),
                })

        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        cm_list = cm.tolist()

        # Training history
        history = {k: [float(v) for v in vals]
                   for k, vals in hist.history.items()}

        # Scatter data for PCA plot (from test set, max 1500 points)
        limit         = min(1500, len(X_test))
        flat_test     = X_test[:limit, 0, :]          # first timestep of each window
        flat_labels   = y_test[:limit]
        scatter_data  = [
            {
                'x':        float(flat_test[i, 0]),
                'y':        float(flat_test[i, 1]) if n_components >= 2 else 0.0,
                'activity': int(le.inverse_transform([flat_labels[i]])[0]),
                'predicted': int(le.inverse_transform([y_pred[i]])[0]),
            }
            for i in range(limit)
        ]

        # Per-class accuracy
        per_class_acc = []
        for i, name in enumerate(class_names):
            mask = (y_test == i)
            if mask.sum() > 0:
                acc = float((y_pred[mask] == i).sum() / mask.sum())
                per_class_acc.append({'class': name, 'accuracy': round(acc * 100, 1)})

        self._log('Saving results to MongoDB...')
        self.col.update_one({'_id': self.oid}, {'$set': {
            'status':            'completed',
            'testAccuracy':      round(test_acc * 100, 2),
            'trainingProgress':  100,
            'trainingHistory':   history,
            'confusionMatrix':   cm_list,
            'classificationReport': report_rows,
            'scatterData':       scatter_data,
            'perClassAccuracy':  per_class_acc,
            'macroF1':           round(report_dict.get('macro avg', {}).get('f1-score', 0) * 100, 2),
            'weightedF1':        round(report_dict.get('weighted avg', {}).get('f1-score', 0) * 100, 2),
        }})

        self._log(f'✅ Done! Test Accuracy={test_acc*100:.2f}%  '
                  f'Macro-F1={report_dict.get("macro avg",{}).get("f1-score",0)*100:.2f}%')