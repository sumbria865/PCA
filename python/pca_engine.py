"""
pca_engine.py
Core PCA computation for mHealth + generic datasets.
Updates MongoDB pipeline steps in real-time.
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
    0: 'Null', 1: 'Standing Still', 2: 'Sitting & Relaxing',
    3: 'Lying Down', 4: 'Walking', 5: 'Climbing Stairs',
    6: 'Waist Bends Forward', 7: 'Frontal Elevation Arms',
    8: 'Knees Bending', 9: 'Cycling', 10: 'Jogging',
    11: 'Running', 12: 'Jump Front & Back'
}

FEATURE_COLS = ['alx', 'aly', 'alz', 'glx', 'gly', 'glz',
                'arx', 'ary', 'arz', 'grx', 'gry', 'grz']


class PCAEngine:
    def __init__(self, analysis_id: str, file_path: str,
                 n_components: int, sample_size: int, mongo_uri: str):
        self.analysis_id = analysis_id
        self.file_path = file_path
        self.n_components = n_components
        self.sample_size = sample_size
        self.client = MongoClient(mongo_uri)
        self.db = self.client['pca_insight']
        self.col = self.db['analyses']
        self.oid = ObjectId(analysis_id)

    def _set_step(self, step: str, status: str, detail: str = ''):
        self.col.update_one({'_id': self.oid}, {'$set': {
            f'pipelineSteps.{step}': status,
            f'pipelineDetails.{step}': detail,
        }})

    def _load_file(self):
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

    def run(self):
        try:
            self._run_pipeline()
        except Exception as e:
            tb = traceback.format_exc()
            print(f'[PCA ERROR] {e}\n{tb}')
            self.col.update_one({'_id': self.oid}, {'$set': {
                'status': 'failed',
                'errorMessage': str(e)
            }})
        finally:
            self.client.close()

    def _run_pipeline(self):
        # ── STEP 1: Load ─────────────────────────────
        self._set_step('loaded', 'running')
        csv_path = self._load_file()
        df = pd.read_csv(csv_path)
        total_rows = len(df)

        # ✅ Dynamic dataset handling
        if 'Activity' in df.columns:
            print("[PCA] Using mHealth format")

            df_clean = df[df['Activity'] != 0].copy()
            n = min(self.sample_size, len(df_clean))
            df_sample = df_clean.sample(n=n, random_state=42)

            X = df_sample[FEATURE_COLS].values
            y = df_sample['Activity'].values
            subjects = df_sample['subject'].values

            feature_names = FEATURE_COLS
            feature_count = len(FEATURE_COLS)
            activity_count = len(np.unique(y))

        else:
            print("[PCA] Generic dataset detected")

            df_clean = df.copy()
            numeric_df = df_clean.select_dtypes(include=['number'])

            if numeric_df.shape[1] < 2:
                raise ValueError("Dataset must have at least 2 numeric columns")

            n = min(self.sample_size, len(numeric_df))
            df_sample = numeric_df.sample(n=n, random_state=42)

            X = df_sample.values
            y = np.zeros(n)
            subjects = np.array(['N/A'] * n)

            feature_names = list(numeric_df.columns)
            feature_count = numeric_df.shape[1]
            activity_count = 0

        self._set_step('loaded', 'done',
            f'Total rows: {total_rows:,} | Sampled: {n:,} | '
            f'Features: {feature_count} | Activities: {activity_count}')
        time.sleep(0.3)

        # ── STEP 2: Normalize ─────────────────────────
        self._set_step('normalized', 'running')
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        self._set_step('normalized', 'done',
            f'mean≈{np.mean(X_scaled):.4f} | std≈{np.std(X_scaled):.4f}')
        time.sleep(0.3)

        # ── STEP 3: Covariance ─────────────────────────
        self._set_step('covariance', 'running')
        cov_matrix = np.cov(X_scaled.T)

        self._set_step('covariance', 'done',
            f'{X.shape[1]}×{X.shape[1]} matrix')
        time.sleep(0.3)

        # ── STEP 4: Eigenvalues ───────────────────────
        self._set_step('eigenvalues', 'running')
        eigenvalues, _ = np.linalg.eig(cov_matrix)
        eigenvalues = np.real(eigenvalues)
        eigenvalues_sorted = np.sort(eigenvalues)[::-1]

        self._set_step('eigenvalues', 'done',
            f'Top eigenvalues: {eigenvalues_sorted[:5]}')
        time.sleep(0.3)

        # ── STEP 5: PCA ───────────────────────────────
        self._set_step('selected', 'running')
        pca = PCA(n_components=self.n_components, random_state=42)
        X_pca = pca.fit_transform(X_scaled)

        variance_ratios = pca.explained_variance_ratio_.tolist()
        cumulative = float(np.sum(variance_ratios))

        self._set_step('selected', 'done',
            f'Variance: {round(cumulative*100,2)}%')
        time.sleep(0.3)

        # ── STEP 6: Transform ─────────────────────────
        self._set_step('transformed', 'running')

        scatter_limit = min(3000, n)
        idx = np.random.choice(n, scatter_limit, replace=False)

        scatter_data = []
        for i in idx:
            scatter_data.append({
                'x': float(X_pca[i, 0]),
                'y': float(X_pca[i, 1]),
                'activity': int(y[i]),
                'subject': str(subjects[i])
            })

        # Scree plot
        pca_full = PCA(n_components=X.shape[1])
        pca_full.fit(X_scaled)

        scree_plot = [
            {'component': f'PC{i+1}', 'variance': float(v*100)}
            for i, v in enumerate(pca_full.explained_variance_ratio_)
        ]

        # Feature importance
        loadings = pca.components_[0]
        top_features = sorted(
            [{'feature': feature_names[i], 'loading': float(loadings[i])}
             for i in range(len(feature_names))],
            key=lambda x: abs(x['loading']), reverse=True
        )[:8]

        # Preview
        transformed_preview = [
            {'pcs': X_pca[i].tolist(), 'activity': int(y[i])}
            for i in range(min(10, n))
        ]

        self._set_step('transformed', 'done',
            f'Scatter points: {scatter_limit}')

        # Save
        self.col.update_one({'_id': self.oid}, {'$set': {
            'status': 'completed',
            'result.varianceRatios': variance_ratios,
            'result.cumulativeVariance': round(cumulative * 100, 2),
            'result.screePlot': scree_plot,
            'result.topFeatures': top_features,
            'result.scatterData': scatter_data,
            'result.transformedPreview': transformed_preview,
        }})

        print(f'[PCA] ✅ Completed analysis {self.analysis_id}')