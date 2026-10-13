import io
import json
from typing import List, Optional, Union, Dict, Any
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
from src.inference import predict_single, predict_batch_df, parse_pdf_to_df

app = FastAPI(
    title="PrismCLV Prediction Service",
    description="Deconstruct Multi-Touch Journeys, Forecast Customer Value",
    version="2.4.0"
)

# Enable CORS for cross-origin frontend interactions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class CustomerJourneyInput(BaseModel):
    customer_id: Optional[Union[str, int]] = Field(default="CUST_001", description="Unique customer identifier")
    recency_days: float = Field(..., ge=0, description="Days since last customer transaction")
    frequency: float = Field(..., ge=0, description="Total purchase orders completed")
    monetary: float = Field(..., ge=0, description="Total lifetime historical monetary spend in dollars")
    has_instagram: int = Field(default=0, ge=0, le=1, description="Binary indicator for Instagram channel exposure")
    has_google: int = Field(default=0, ge=0, le=1, description="Binary indicator for Google Search channel exposure")
    has_email: int = Field(default=0, ge=0, le=1, description="Binary indicator for Email marketing exposure")
    has_tiktok: int = Field(default=0, ge=0, le=1, description="Binary indicator for TikTok channel exposure")

    class Config:
        json_schema_extra = {
            "example": {
                "customer_id": "CUST_1001",
                "recency_days": 45.0,
                "frequency": 5.0,
                "monetary": 350.0,
                "has_instagram": 1,
                "has_google": 1,
                "has_email": 0,
                "has_tiktok": 0
            }
        }

class BatchCustomerJourneyInput(BaseModel):
    customers: List[CustomerJourneyInput]

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Mount static folder for CSS, JS, images, and HTML assets
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/dashboard")
def dashboard_view():
    return FileResponse(
        "static/index.html",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@app.get("/")
def home():
    """Serves the complete PrismCLV dashboard at root."""
    return FileResponse(
        "static/index.html",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "AttribCLV API"}

@app.post("/predict")
def predict_clv_and_churn(data: CustomerJourneyInput):
    """
    Predict 365-day Customer Lifetime Value (pLTV), Churn Risk Score,
    and prescriptive marketing recommendations for a single customer profile.
    """
    try:
        payload = data.model_dump()
        result = predict_single(payload)
        return {
            "customer_id": result["customer_id"],
            "predicted_365_day_pltv": result["predicted_365_day_pltv"],
            "churn_risk_score": result["churn_risk_score"],
            "risk_tier": result["risk_tier"],
            "top_recommended_channel": result["top_recommended_channel"],
            "recommended_strategy": result["recommended_strategy"],
            "estimated_roi_uplift": result["estimated_roi_uplift"],
            "channel_attribution": result["channel_attribution"],
            "survival_probability_365d": result["survival_probability_365d"],
            "future_investment_advice": result.get("future_investment_advice", {})
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}"
        )

@app.post("/predict_batch")
async def predict_batch(
    request: Request,
    file: Optional[UploadFile] = None
):
    """
    Batch prediction endpoint accepting either:
    1. Multipart/form-data CSV file upload (`file=@customers.csv`)
    2. JSON payload with list of customers: `[ {...}, {...} ]` or `{ "customers": [ {...} ] }`
    3. Raw CSV content with `Content-Type: text/csv`

    Returns:
    - Aggregate portfolio summary KPIs (Total Portfolio Value, Average Churn Risk, High-Risk Count, etc.)
    - Individual customer predictions with pLTV, churn risk, and prescriptive marketing strategies.
    """
    df: Optional[pd.DataFrame] = None

    # Scenario A: Multipart File Upload (CSV or PDF) via parameter
    if file is not None and hasattr(file, "filename") and file.filename:
        content = await file.read()
        if not content or len(content.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty."
            )
        if file.filename.lower().endswith(".pdf"):
            try:
                df = parse_pdf_to_df(content)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Could not parse PDF file: {str(e)}"
                )
        else:
            try:
                df = pd.read_csv(io.BytesIO(content))
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Could not parse CSV file: {str(e)}"
                )
    else:
        content_type = request.headers.get("content-type", "")
        # Check if form data had a file
        if "multipart/form-data" in content_type:
            try:
                form = await request.form()
                form_file = form.get("file")
                if form_file and hasattr(form_file, "read"):
                    content = await form_file.read()
                    if not content or len(content.strip()) == 0:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Uploaded file is empty."
                        )
                    fname = getattr(form_file, "filename", "") or ""
                    if fname.lower().endswith(".pdf"):
                        df = parse_pdf_to_df(content)
                    else:
                        df = pd.read_csv(io.BytesIO(content))
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Could not parse multipart form file: {str(e)}"
                )

        if df is None:
            body_bytes = await request.body()
            if not body_bytes or len(body_bytes.strip()) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Empty payload provided. Please provide JSON or CSV data."
                )

            # Try parsing as JSON first
            parsed_json = None
            stripped = body_bytes.strip()
            if "application/json" in content_type or stripped.startswith(b"{") or stripped.startswith(b"["):
                try:
                    parsed_json = json.loads(body_bytes.decode("utf-8"))
                except Exception:
                    parsed_json = None

            if parsed_json is not None:
                if isinstance(parsed_json, list):
                    df = pd.DataFrame(parsed_json)
                elif isinstance(parsed_json, dict):
                    if "customers" in parsed_json and isinstance(parsed_json["customers"], list):
                        df = pd.DataFrame(parsed_json["customers"])
                    else:
                        df = pd.DataFrame([parsed_json])
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="JSON must be a list of records or an object containing 'customers'."
                    )
            else:
                # Attempt CSV parse
                try:
                    df = pd.read_csv(io.BytesIO(body_bytes))
                except Exception:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Could not parse request body as JSON or CSV."
                    )

    if df is None or df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload contains zero customer rows."
        )

    try:
        summary, predictions, _ = predict_batch_df(df)
        return {
            "status": "success",
            "summary": summary,
            "predictions": predictions
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch inference failed: {str(e)}"
        )

@app.get("/api/sample_cohort")
def get_sample_cohort():
    """Returns predictions and summary for the real retail cohort (350 customers)."""
    import os
    csv_path = "data/processed_features.csv"
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="Processed dataset not found.")
    df = pd.read_csv(csv_path)
    summary, predictions, _ = predict_batch_df(df)
    return {
        "status": "success",
        "summary": summary,
        "predictions": predictions
    }

@app.get("/api/download_template")
def download_template():
    """Generates a downloadable sample CSV template for customer batch upload."""
    from fastapi.responses import PlainTextResponse
    csv_content = (
        "customer_id,recency_days,frequency,monetary,has_instagram,has_google,has_email,has_tiktok\n"
        "CUST_VIP_101,15,12,24500.0,1,1,1,0\n"
        "CUST_AT_RISK_102,210,8,18500.0,0,1,1,0\n"
        "CUST_REGULAR_103,35,4,4800.0,1,1,0,0\n"
        "CUST_NEW_104,12,1,950.0,0,1,0,1\n"
        "CUST_CHURN_105,320,2,1200.0,0,0,1,0\n"
    )
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=customer_upload_template.csv"}
    )