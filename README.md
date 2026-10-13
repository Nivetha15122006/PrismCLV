---
title: PrismCLV - Deconstruct Multi-Touch Journeys, Forecast Customer Value
emoji: 🔮
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# ⚡ PrismCLV: Deconstruct Multi-Touch Journeys, Forecast Customer Value
## Enterprise Growth Marketing & Retention Engine

[![Python Version](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-DeepSurv-EE4C2C.svg)](https://pytorch.org)
[![CatBoost](https://img.shields.io/badge/CatBoost-pLTV%20Regression-FFCC00.svg)](https://catboost.ai)
[![Currency](https://img.shields.io/badge/Currency-INR%20(%E2%82%B9)-green.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**PrismCLV** is a real-world enterprise growth marketing and retention analytics platform. It deconstructs multi-touch customer acquisition journeys, uncovers true marketing channel contributions, forecasts 365-day Customer Lifetime Value (pLTV in ₹ Rupees), and models time-to-churn duration using survival analysis.

---

## 📸 Core Modules & Capabilities

### 1. 👤 Customer & Portfolio Intelligence (Combined Page 1)
* **Input-First Architecture**: Clean typed input boxes at the top (Customer Name/ID, Historical Spend in `₹`, Completed Order Count, Recency Days, Channel Checkboxes, and CSV/PDF Invoice Uploader).
* **Evaluation Verdict & 4 KPI Cards (Directly Below)**:
  * Plain-English business summary card (*"Ramesh Kumar is a Safe & Loyal VIP Customer!"*) with specific next steps and extra revenue uplift in `₹`.
  * **4 KPI Cards**: Predicted 1-Yr Spend (₹), Expected Churn Risk (%), Retention Health, and Top Recommended Channel.
  * Dual visual charts: 12-month sales trajectory line chart + Retention Donut breakdown in `₹`.
  * Technical MLOps breakdown: CatBoost continuous pLTV, DeepSurv hazard probability, Kaplan-Meier survival rate, and incrementality ROI.
* **Portfolio Batch Analytics (On the Same Page)**:
  * Bulk ingestion of customer lists in **CSV** and **PDF** formats.
  * 1-Click **"🚀 Load Real Retail Cohort (350 Customers)"** from UCI transaction data.
  * Macro Store KPIs: Total Portfolio Value, Revenue Exposed to Churn, High-Risk Accounts Count, Average Churn Risk, and Mean Customer Spend in `₹`.
  * Scored customer roster with risk badges and 1-click **Export Scored CSV**.

---

### 2. 🤖 Advanced ML Techniques & Model Benchmarking (Module 2)
* Explains why multiple models are used and which is best for each task:
  * **CatBoost Regressor** (👑 Winner for Revenue Forecasting: $R^2 = 0.995$, MAE = ₹431.26).
  * **PyTorch DeepSurv Neural Network** (👑 Winner for Churn Timing: $95.1\%$ Accuracy, 0.982 ROC-AUC).
  * **Multi-Touch AI Engine** (👑 Winner for Channel Budget Allocation: +86.7% Instagram discovery lift).
  * Evaluated baselines: Random Forest ($R^2 = 0.932$), Linear Regression ($R^2 = 0.784$), Logistic Regression (AUC = 0.824), and Last-Touch Heuristic.
* Benchmark charts: Model Validation Performance ($R^2$ & AUC) and Channel Attribution Lift comparison.

---

### 3. 📈 Multi-Channel Contribution & Sales Trends (Module 3)
* **Interactive Time-Horizon Switcher**:
  * **Yearly (12 Months)**: Evaluates full annual revenue progression and macro attribution share.
  * **6 Months (H2: Jul - Dec)**: Pinpoints holiday and festive visual campaign surges.
  * **3 Months (Q4: Oct - Dec)**: Focuses on peak conversion demand and immediate channel efficiency.
* **Dual Trend Visuals**:
  * **Overall Sales Revenue Trajectory Line Chart**: Monthly revenue progression in Indian Rupees (`₹`).
  * **Channel Contribution Breakdown Bar Chart**: Rupee attribution split across **Instagram**, **Google Search**, **WhatsApp / Email**, and **TikTok**.
* **Strategic Marketing Decision Guidance**: Actionable advice on channel roles (discovery vs. conversion closing vs. retention) and ad budget reallocation recommendations for the upcoming quarter.

---

### 4. 🔬 Executive MLOps Diagnostics & Explainability (Module 4)
1. **Kaplan-Meier Retention Curve**: Identifies the 180-day retention inflection point where active accounts maintain an 82.4% survival rate.
2. **Channel Attribution Lift**: Quantifies incrementality over traditional last-touch heuristics (Instagram +86.7% lift, TikTok +33.3% lift).
3. **SHAP Feature Importance**: Reveals monetary spend as the dominant value driver (62.4%), followed by frequency and recency.
4. **Prediction Calibration**: Validates linear agreement between actual and forecasted customer spend ($R^2 = 0.995$, MAE = ₹431.26).
5. **DeepSurv Confusion Matrix**: Confirms a 95.1% classification accuracy and 0.982 ROC-AUC for customer churn detection.

---

## 🏆 Model Benchmark Leaderboard

| Model Architecture | Category | Target Objective | Key Metric | Score | Best Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CatBoost Regressor** | Gradient Boosted Trees | 365-Day Revenue Value (₹) | $R^2$ & MAE | **$R^2 = 0.995$ (MAE: ₹431.26)** | 👑 **Best for Money Forecasting** |
| **PyTorch DeepSurv** | Deep Neural Network | Churn Hazard & Timeline | ROC-AUC & Accuracy | **AUC = 0.982 (Acc: 95.1%)** | 👑 **Best for Retention Timing** |
| **Multi-Touch AI Engine** | Incrementality Attribution | Channel Credit Split (%) | Discovery Lift | **+86.7% Instagram Lift** | 👑 **Best for Ad Budget Allocation** |
| Random Forest Regressor | Ensemble Trees | 365-Day Revenue Value (₹) | $R^2$ & MAE | $R^2 = 0.932$ (MAE: ₹920.40) | Sub-optimal for extreme spenders |
| Linear / Ridge Regression | Linear Model | 365-Day Revenue Value (₹) | $R^2$ & MAE | $R^2 = 0.784$ (MAE: ₹1,840.10) | Misses non-linear RFM interactions |
| Binary Logistic Regression | Classification | Binary Churn (Yes/No) | Accuracy & AUC | AUC = 0.824 (Acc: 81.2%) | Cannot model time-to-churn duration |
| Last-Touch Heuristic | Static Rule Heuristic | Last Click Credit | Attribution Share | Google Search 45% (Biased) | Penalizes top-of-funnel discovery |

---

---

## 🧪 Live Interactive Testing & Sample Inputs

You can test **ANY custom input combination** by either typing directly into the input boxes or clicking the **Quick Sample Chips** on the dashboard:

| Customer Scenario | Total Spend (₹) | Orders | Recency (Days) | Predicted Risk Tier | Forecasted 1-Yr pLTV | Business Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **New Casual Buyer** | `₹100` | `1` | `10` | 🟢 **Low Risk** | `~₹223` | Active customer within healthy 60-day shopping window. |
| **Active Regular Shopper** | `₹2,500` | `4` | `20` | 🟢 **Low Risk** | `~₹3,750` | Consistent repeat frequency and healthy recent visit. |
| **VIP High Spender** | `₹24,500` | `16` | `12` | 🟢 **Low Risk** | `~₹32,150` | Top tier repeat buyer with near-zero defection risk. |
| **Small Buyer Cooling Off** | `₹250` | `2` | `100` | 🟠 **Medium Risk** | `~₹315` | Gap between visits widening; needs timely product re-engagement. |
| **Mid-Tier Cooling Off** | `₹2,500` | `4` | `120` | 🟠 **Medium Risk** | `~₹2,360` | Overdue relative to regular order velocity; automated nurture needed. |
| **Lapsed Low Spender** | `₹100` | `1` | `220` | 🔴 **High Risk** | `~₹30` | Inactive > 180 days (retail churn cliff); forward spend drops sharply. |
| **Whale Customer At-Risk** | `₹18,500` | `12` | `210` | 🔴 **High Risk (Whale Alert)**| `~₹13,550` | Crucial high-roller dormant > 180 days. Immediate concierge rescue needed! |
| **Dormant Churned Customer** | `₹1,200` | `2` | `310` | 🔴 **High Risk** | `~₹144` | Near 100% churn probability (almost 1 full year without an order). |

---

## 🚀 Single-Port Quick Start Guide

The entire application runs on **a single port (8000)**:

```bash
cd "c:\Projects\AML CAT"
.\venv\Scripts\activate
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

* **Open in Browser**: [http://localhost:8000](http://localhost:8000) (or [http://127.0.0.1:8000](http://127.0.0.1:8000))
* **Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
