"""
pca_engine.py
Core PCA computation for mHealth + generic datasets.
Updates MongoDB pipeline steps in real-time.
Paper: Aljarrah & Ali, IEEE IICETA 2019
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from pymongo import MongoClient
from bson import ObjectId
import traceback
import time
import os
import zipfile
import tempfile

ACTIVITY_LABELS = {
    0: 'Null',           1: 'Standing Still',  2: 'Sitting & Relaxing',
    3: 'Lying Down',     4: 'Walking',         5: 'Climbing Stairs',
    6: 'Waist Bends Forward', 7: 'Frontal Elevation Arms',
    8: 'Knees Bending',  9: 'Cycling',         10: 'Jogging',
    11: 'Running',       12: 'Jump Front & Back'
}

FEATURE_COLS = ['alx', 'aly', 'alz', 'glx', 'gly', 'glz',
                'arx', 'ary', 'arz', 'grx', 'gry', 'grz']


class PCAEngine:
    def __init__(self, analysis_id: str, file_path: str,
                 n_components: int, sample_size: int, mongo_uri: str):
        self.analysis_id  = analysis_id
        self.file_path    = file_path
        self.n_components = n_components
        self.sample_size  = sample_size
        self.client       = MongoClient(mongo_uri)
        self.db           = self.client['pca_insight']
        self.col          = self.db['analyses']
        self.oid          = ObjectId(analysis_id)

    def _set_step(self, step: str, status: str, detail: str = ''):
        self.col.update_one({'_id': self.oid}, {'$set': {
            f'pipelineSteps.{step}':   status,
            f'pipelineDetails.{step}': detail,
        }})

    def _load_file(self) -> str:
        ext = os.path.splitext(self.file_path)[1].lower()
        if ext == '.zip':
            with zipfile.ZipFile(self.file_path, 'r') as z:
                csvs = [f for f in z.namelist() if f.endswith('.csv')]
                if not csvs:
                    raise ValueError('No CSV found inside ZIP')
                tmpdir = tempfile.mkdtemp()
                z.extract(csvs[0], tmpdir)
                return os.path.join(tmpdir, csvs[0])
        return self.file_path

    @staticmethod
    def _clean_array(X: np.ndarray) -> np.ndarray:
        """Replace inf with nan, fill nan with column median, final safety pass."""
        X = X.astype(float)
        X = np.where(np.isinf(X), np.nan, X)
        for j in range(X.shape[1]):
            col      = X[:, j]
            nan_mask = np.isnan(col)
            if nan_mask.any():
                median     = np.nanmedian(col)
                median     = 0.0 if np.isnan(median) else median
                X[nan_mask, j] = median
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
        return X

    def run(self):
        try:
            self._run_pipeline()
        except Exception as e:
            tb = traceback.format_exc()
            print(f'[PCA ERROR] {e}\n{tb}')
            self.col.update_one({'_id': self.oid}, {'$set': {
                'status':       'failed',
                'errorMessage': str(e)
            }})
        finally:
            self.client.close()

    def _run_pipeline(self):

        # STEP 1: Load
        self._set_step('loaded', 'running')
        csv_path   = self._load_file()
        df         = pd.read_csv(csv_path)
        total_rows = len(df)
        print(f'[PCA] Loaded {total_rows:,} rows | columns: {list(df.columns)}')

        is_mhealth = all(c in df.columns for c in FEATURE_COLS)

        if is_mhealth:
            print('[PCA] mHealth dataset detected')
            df_clean  = df[df['Activity'] != 0].copy() if 'Activity' in df.columns else df.copy()
            n         = min(self.sample_size, len(df_clean))
            df_sample = df_clean.sample(n=n, random_state=42)

            X        = df_sample[FEATURE_COLS].values.astype(float)
            y        = df_sample['Activity'].values.astype(int) if 'Activity' in df.columns else np.zeros(n, dtype=int)
            subjects = df_sample['subject'].values.astype(str) if 'subject' in df.columns else np.array(['unknown'] * n)

            row_mask = ~np.isnan(X).all(axis=1)
            X        = X[row_mask]
            y        = y[row_mask]
            subjects = subjects[row_mask]

            feature_names  = FEATURE_COLS
            activity_count = len(np.unique(y))
        else:
            print('[PCA] Generic dataset detected')
            numeric_df = df.select_dtypes(include=[np.number])
            if numeric_df.shape[1] < 2:
                raise ValueError('Dataset must have at least 2 numeric columns for PCA')

            n         = min(self.sample_size, len(numeric_df))
            df_sample = numeric_df.sample(n=n, random_state=42)

            X        = df_sample.values.astype(float)
            y        = np.zeros(n, dtype=int)
            subjects = np.array(['N/A'] * n)

            feature_names  = list(numeric_df.columns)
            activity_count = 0

        # Clean NaN / Inf
        print(f'[PCA] NaN count: {np.isnan(X).sum()} | Inf count: {np.isinf(X).sum()}')
        X = self._clean_array(X)
        n = len(X)
        print(f'[PCA] Clean shape: {X.shape}')

        self._set_step('loaded', 'done',
            f'Total rows: {total_rows:,} | Sampled: {n:,} | Features: {X.shape[1]} | Activities: {activity_count}')
        time.sleep(0.3)

        # STEP 2: Normalize
        self._set_step('normalized', 'running')
        scaler   = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        X_scaled = np.nan_to_num(X_scaled, nan=0.0, posinf=0.0, neginf=0.0)
        self._set_step('normalized', 'done',
            f'StandardScaler applied | mean={X_scaled.mean():.4f} | std={X_scaled.std():.4f}')
        time.sleep(0.3)

        # STEP 3: Covariance Matrix
        self._set_step('covariance', 'running')
        cov_matrix = np.cov(X_scaled.T)
        cov_matrix = np.nan_to_num(cov_matrix, nan=0.0, posinf=0.0, neginf=0.0)
        cov_trace  = float(np.trace(cov_matrix))
        self._set_step('covariance', 'done',
            f'{X.shape[1]}x{X.shape[1]} matrix | Trace: {cov_trace:.3f}')
        time.sleep(0.3)

        # STEP 4: Eigenvalues (eigvalsh = safe for symmetric matrices, no NaN risk)
        self._set_step('eigenvalues', 'running')
        eigenvalues = np.linalg.eigvalsh(cov_matrix)
        eigenvalues = np.sort(eigenvalues)[::-1]
        ev_str      = ', '.join([f'{v:.3f}' for v in eigenvalues[:6]])
        self._set_step('eigenvalues', 'done', f'Top eigenvalues: [{ev_str}]')
        time.sleep(0.3)

        # STEP 5: Select Principal Components
        self._set_step('selected', 'running')
        max_comp   = min(X.shape[1], X.shape[0] - 1)
        n_comp     = max(1, min(self.n_components, max_comp))
        pca        = PCA(n_components=n_comp, random_state=42)
        X_pca      = pca.fit_transform(X_scaled)
        var_ratios = pca.explained_variance_ratio_.tolist()
        cumulative = float(np.sum(var_ratios))
        var_str    = ' + '.join([f'{v*100:.1f}%' for v in var_ratios[:4]])
        self._set_step('selected', 'done',
            f'Top {n_comp} PCs | {var_str} = {cumulative*100:.1f}% total')
        time.sleep(0.3)

        # STEP 6: Transform
        self._set_step('transformed', 'running')

        scatter_limit = min(3000, n)
        idx           = np.random.choice(n, scatter_limit, replace=False)
        scatter_data  = []
        for i in idx:
            point = {
                'x':        float(X_pca[i, 0]),
                'y':        float(X_pca[i, 1]) if n_comp >= 2 else 0.0,
                'activity': int(y[i]),
                'subject':  str(subjects[i]),
            }
            if n_comp >= 3:
                point['z'] = float(X_pca[i, 2])
            scatter_data.append(point)

        # Scree plot
        n_scree  = min(max_comp, 12)
        pca_full = PCA(n_components=n_scree, random_state=42)
        pca_full.fit(X_scaled)
        scree_plot = [
            {'component': f'PC{i+1}', 'variance': round(float(v) * 100, 2)}
            for i, v in enumerate(pca_full.explained_variance_ratio_)
        ]

        # Top feature loadings
        loadings     = pca.components_[0]
        n_feats      = min(len(feature_names), len(loadings))
        top_features = sorted(
            [{'feature': feature_names[i], 'loading': float(loadings[i])} for i in range(n_feats)],
            key=lambda x: abs(x['loading']), reverse=True
        )[:8]

        # Transformed preview
        transformed_preview = [
            {
                'pcs':      [float(X_pca[i, j]) for j in range(n_comp)],
                'activity': int(y[i]),
                'subject':  str(subjects[i]),
            }
            for i in range(min(10, n))
        ]

        self._set_step('transformed', 'done',
            f'Output: ({n}, {n_comp}) | Scatter: {scatter_limit} points')

        # Save to MongoDB
        self.col.update_one({'_id': self.oid}, {'$set': {
            'status':                    'completed',
            'result.varianceRatios':     var_ratios,
            'result.cumulativeVariance': round(cumulative * 100, 2),
            'result.screePlot':          scree_plot,
            'result.topFeatures':        top_features,
            'result.scatterData':        scatter_data,
            'result.transformedPreview': transformed_preview,
        }})

        print(f'[PCA] Done! Variance: {cumulative*100:.1f}% | Points: {scatter_limit}')