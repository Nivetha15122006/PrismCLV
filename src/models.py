import torch
import torch.nn as nn
from catboost import CatBoostRegressor

# PyTorch DeepSurv Model Architecture for Hazard / Churn Analysis
class DeepSurvModel(nn.Module):
    def __init__(self, input_dim, hidden_dim=32, dropout=0.2):
        super(DeepSurvModel, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1) # Single hazard output node
        )

    def forward(self, x):
        return self.network(x)

# Negative Log Partial Likelihood Loss for Cox Proportional Hazards
def cox_ph_loss(risk_pred, durations, events):
    # Sort by duration descending
    idx = torch.argsort(durations, descending=True)
    risk_pred = risk_pred[idx]
    events = events[idx]
    
    hazard_exp = torch.exp(risk_pred)
    log_risk = torch.log(torch.cumsum(hazard_exp, dim=0))
    uncensored_loss = (risk_pred - log_risk) * events
    return -torch.sum(uncensored_loss) / (torch.sum(events) + 1e-7)

# Helper function to instantiate CatBoost Regressor
def get_catboost_model(depth=6, lr=0.05, iterations=300):
    return CatBoostRegressor(
        depth=depth,
        learning_rate=lr,
        iterations=iterations,
        verbose=0,
        random_seed=42
    )