import torch
import numpy as np
import pandas as pd
import optuna
import mlflow
import os
from sklearn.metrics import mean_absolute_error, roc_auc_score
from src.data_preprocessing import load_and_preprocess_data
from src.models import DeepSurvModel, cox_ph_loss, get_catboost_model
from src.utils_vis import generate_rubric_visualizations

os.makedirs("models", exist_ok=True)

def train_pipeline():
    mlflow.set_experiment("AttribCLV_Lab_Evaluation")
    
    # 1. Load Data
    X_train, X_test, y_churn_train, y_churn_test, y_pltv_train, y_pltv_test = load_and_preprocess_data()
    features_df = pd.read_csv("data/processed_features.csv")

    with mlflow.start_run(run_name="Optuna_PyTorch_CatBoost_Pipeline"):
        # 2. Optuna Hyperparameter Optimization for CatBoost
        def objective(trial):
            depth = trial.suggest_int('depth', 4, 8)
            lr = trial.suggest_float('lr', 0.01, 0.1, log=True)
            model = get_catboost_model(depth=depth, lr=lr, iterations=150)
            model.fit(X_train, y_pltv_train)
            preds = model.predict(X_test)
            return mean_absolute_error(y_pltv_test, preds)

        print(" Starting Optuna hyperparameter tuning...")
        study = optuna.create_study(direction="minimize")
        study.optimize(objective, n_trials=5)
        
        best_params = study.best_params
        print(f" Best Optuna Parameters: {best_params}")
        mlflow.log_params(best_params)

        # 3. Train Final CatBoost Model
        best_catboost = get_catboost_model(depth=best_params['depth'], lr=best_params['lr'], iterations=300)
        best_catboost.fit(X_train, y_pltv_train)
        pltv_preds = best_catboost.predict(X_test)
        mae = mean_absolute_error(y_pltv_test, pltv_preds)
        
        mlflow.log_metric("pltv_mae", mae)
        best_catboost.save_model("models/catboost_pltv.cbm")
        print(f" Saved CatBoost Model to models/catboost_pltv.cbm (MAE: ${mae:.2f})")

        # 4. Train PyTorch DeepSurv Model
        X_tr_t = torch.tensor(X_train.values, dtype=torch.float32)
        durations_t = torch.tensor(y_churn_train['duration_days'].values, dtype=torch.float32)
        events_t = torch.tensor(y_churn_train['churn_event'].values, dtype=torch.float32)
        
        deepsurv = DeepSurvModel(input_dim=X_train.shape[1], hidden_dim=32)
        optimizer = torch.optim.Adam(deepsurv.parameters(), lr=0.01)

        deepsurv.train()
        for epoch in range(100):
            optimizer.zero_grad()
            risk = deepsurv(X_tr_t).squeeze()
            loss = cox_ph_loss(risk, durations_t, events_t)
            loss.backward()
            optimizer.step()

        torch.save(deepsurv.state_dict(), "models/deepsurv_model.pt")
        print(" Saved PyTorch DeepSurv model to models/deepsurv_model.pt")

        # Evaluate Churn Risk
        deepsurv.eval()
        with torch.no_grad():
            X_te_t = torch.tensor(X_test.values, dtype=torch.float32)
            churn_risk_scores = torch.sigmoid(deepsurv(X_te_t)).numpy().flatten()

        churn_auc = roc_auc_score(y_churn_test['churn_event'], churn_risk_scores)
        mlflow.log_metric("churn_auc", churn_auc)
        print(f" PyTorch Survival Model ROC-AUC: {churn_auc:.4f}")

        # 5. Generate Rubric Visualizations
        generate_rubric_visualizations(
            features_df, 
            y_churn_test['churn_event'].values, 
            churn_risk_scores, 
            y_pltv_test.values, 
            pltv_preds, 
            best_catboost, 
            X_test
        )
        
        mlflow.log_artifacts("static")

if __name__ == "__main__":
    train_pipeline()