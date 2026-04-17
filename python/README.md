# 🧠 PCA Insight — mHealth Activity Analytics Platform

A full-stack MERN + Python application that applies Principal Component Analysis (PCA) to the mHealth sensor dataset for interactive visualization and dimensionality reduction.

---

## 📁 Project Structure

```
pca-insight/
├── frontend/      React + Vite + Tailwind (UI)
├── backend/       Node.js + Express + MongoDB Atlas (API)
├── python/        Python + scikit-learn (PCA Engine)
└── README.md
```

---

## 🗄️ Dataset

**mHealth Raw Data** (Kaggle)  
- 1,215,745 rows × 14 columns  
- 12 sensor features: accelerometer + gyroscope (ankle, arm, chest)  
- 13 activity classes: Walking, Running, Jogging, Cycling, etc.  
- 10 subjects

---

## ⚙️ Prerequisites

- Node.js v18+
- Python 3.9+
- MongoDB Atlas account (free tier works)

---

## 🚀 Setup & Run

### 1. MongoDB Atlas
1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free cluster
3. Create a database user (username + password)
4. Whitelist your IP (or allow all: 0.0.0.0/0)
5. Copy the connection string

### 2. Backend
```bash
cd backend
npm install
# Edit .env — paste your MongoDB URI
npm run dev
```

### 3. Python Engine
```bash
cd python
pip install -r requirements.txt
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🔄 How It Works

```
User uploads CSV
      ↓
Node.js saves file + creates Analysis doc in MongoDB
      ↓
Node.js spawns Python script (run_pca.py)
      ↓
Python PCAEngine runs 6-step pipeline:
  1. Load CSV & sample rows
  2. StandardScaler normalization
  3. Compute covariance matrix
  4. Eigendecomposition
  5. Select top N principal components
  6. Transform data + compute loadings
      ↓
Python writes results back to MongoDB
      ↓
Frontend polls pipeline status → shows step-by-step UI
      ↓
Visualization page renders scatter plot + scree plot + insights
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Create account |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| POST | /api/upload | Upload CSV & start PCA |
| GET | /api/analysis/stats | Dashboard stats |
| GET | /api/analysis/history | All past analyses |
| GET | /api/analysis/:id/status | Processing status |
| GET | /api/analysis/:id/pipeline-status | Step-by-step pipeline |
| GET | /api/analysis/:id/result | Full PCA results |
| DELETE | /api/analysis/:id | Delete analysis |

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Framer Motion |
| Backend | Node.js, Express, Multer, JWT, bcryptjs |
| Database | MongoDB Atlas (Mongoose ODM) |
| ML Engine | Python, scikit-learn, NumPy, pandas |
| IPC | Node.js child_process.spawn → Python |

---

## 📊 PCA Output

- **Scatter plot** — PC1 vs PC2, colored by activity class
- **Scree plot** — Variance explained per component
- **Feature loadings** — Top sensor contributors to PC1
- **Variance ratios** — Per-component and cumulative
- **Transformed data** — Downloadable CSV + table preview