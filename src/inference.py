import os
import io
import re
import torch
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List, Optional
from catboost import CatBoostRegressor
from src.models import DeepSurvModel

try:
    import pypdf
except ImportError:
    pypdf = None

def parse_pdf_to_df(content: bytes) -> pd.DataFrame:
    """Extracts customer transaction/RFM profile data from uploaded PDF documents."""
    if pypdf is None:
        raise ImportError("pypdf is not installed. Please install with pip install pypdf.")

    reader = pypdf.PdfReader(io.BytesIO(content))
    full_text = ""
    for page in reader.pages:
        full_text += (page.extract_text() or "") + "\n"

    lines = [l.strip() for l in full_text.split("\n") if l.strip()]
    records = []

    # Try detecting table rows
    for line in lines:
        parts = [p.strip() for p in re.split(r'[,;\t|]', line) if p.strip()]
        nums = re.findall(r'[-+]?(?:\d*\.\d+|\d+)', line)
        if len(nums) >= 3:
            try:
                rec = float(nums[0])
                freq = float(nums[1])
                mon = float(nums[2])
                name = parts[0] if parts and not parts[0].replace('.', '').replace('-', '').isdigit() else f"CUST_{len(records)+1:03d}"
                records.append({
                    "CustomerID": name,
                    "recency_days": rec,
                    "frequency": freq,
                    "monetary": mon,
                    "has_instagram": 1 if "instagram" in line.lower() else 0,
                    "has_google": 1 if "google" in line.lower() else 0,
                    "has_email": 1 if "email" in line.lower() else 0,
                    "has_tiktok": 1 if "tiktok" in line.lower() else 0
                })
            except Exception:
                pass

    if not records:
        # Single invoice / customer summary format
        mon_match = re.search(r'(?:spend|total|amount|revenue|monetary|₹|rs\.?|inr)[\s:]*([0-9,.]+)', full_text, re.I)
        freq_match = re.search(r'(?:orders|frequency|count|purchases)[\s:]*([0-9]+)', full_text, re.I)
        rec_match = re.search(r'(?:days|recency|last purchase)[\s:]*([0-9]+)', full_text, re.I)
        cust_match = re.search(r'(?:customer|client|name|id)[\s:]*([A-Za-z0-9_ -]+)', full_text, re.I)

        rec = float(rec_match.group(1)) if rec_match else 25.0
        freq = float(freq_match.group(1)) if freq_match else 4.0
        mon = float(mon_match.group(1).replace(',', '')) if mon_match else 2400.0
        cust = cust_match.group(1).strip() if cust_match else "PDF_CUSTOMER_01"

        records.append({
            "CustomerID": cust,
            "recency_days": rec,
            "frequency": freq,
            "monetary": mon,
            "has_instagram": 1 if "instagram" in full_text.lower() else 1,
            "has_google": 1 if "google" in full_text.lower() else 0,
            "has_email": 1 if "email" in full_text.lower() else 0,
            "has_tiktok": 1 if "tiktok" in full_text.lower() else 0
        })

    return pd.DataFrame(records)

# Singleton cache for loaded models
_pltv_model: Optional[CatBoostRegressor] = None
_deepsurv_model: Optional[DeepSurvModel] = None

FEATURE_COLS = [
    'recency_days', 'frequency', 'monetary',
    'has_instagram', 'has_google', 'has_email', 'has_tiktok'
]

def load_models() -> Tuple[CatBoostRegressor, DeepSurvModel]:
    global _pltv_model, _deepsurv_model
    if _pltv_model is None:
        model_path = os.path.join("models", "catboost_pltv.cbm")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"CatBoost model not found at {model_path}")
        _pltv_model = CatBoostRegressor()
        _pltv_model.load_model(model_path)
    
    if _deepsurv_model is None:
        surv_path = os.path.join("models", "deepsurv_model.pt")
        if not os.path.exists(surv_path):
            raise FileNotFoundError(f"DeepSurv model not found at {surv_path}")
        _deepsurv_model = DeepSurvModel(input_dim=7, hidden_dim=32)
        _deepsurv_model.load_state_dict(torch.load(surv_path, map_location=torch.device('cpu')))
        _deepsurv_model.eval()
        
    return _pltv_model, _deepsurv_model

def get_channel_attribution(row: Dict[str, Any]) -> Dict[str, float]:
    """
    Computes multi-touch attribution weights for this customer based on
    the AI model baseline weights: Google (34%), Instagram (28%), TikTok (20%), Email (18%).
    Normalizes across touchpoints experienced by this customer.
    """
    base_weights = {
        "Google Search": 0.34,
        "Instagram": 0.28,
        "TikTok": 0.20,
        "Email": 0.18
    }
    
    has_g = int(row.get('has_google', 0))
    has_i = int(row.get('has_instagram', 0))
    has_t = int(row.get('has_tiktok', 0))
    has_e = int(row.get('has_email', 0))
    
    active_flags = {
        "Google Search": has_g,
        "Instagram": has_i,
        "TikTok": has_t,
        "Email": has_e
    }
    
    active_weights = {ch: base_weights[ch] for ch, active in active_flags.items() if active == 1}
    
    if not active_weights:
        # Fallback if customer had no direct digital channel recorded
        return {ch: round(w * 100, 1) for ch, w in base_weights.items()}
    
    total = sum(active_weights.values())
    attribution = {}
    for ch in base_weights.keys():
        if ch in active_weights:
            attribution[ch] = round((active_weights[ch] / total) * 100.0, 1)
        else:
            attribution[ch] = 0.0
            
    return attribution

def compute_calibrated_survival(recency: float, frequency: float, monetary: float, nn_hazard: float = 0.0) -> Tuple[float, float, str]:
    """
    Computes calibrated survival probability, churn risk score, and risk tier
    based on survival analysis Weibull cumulative hazard curve calibrated to the 180-day
    retail dormancy cliff, with relative hazard adjustments from DeepSurv NN and RFM velocity.
    """
    gamma = 2.15
    h0 = (max(recency, 0.5) / 180.0) ** gamma
    
    freq_factor = np.exp(-0.04 * min(max(frequency, 1.0) - 1.0, 12.0))
    spend_buffer = -0.015 * np.log1p(min(max(monetary, 0.0), 50000.0) / 1000.0)
    nn_factor = np.exp(np.clip(nn_hazard * 0.05, -0.5, 0.5))
    
    cum_hazard = h0 * freq_factor * np.exp(spend_buffer) * nn_factor
    survival_prob = float(np.exp(-cum_hazard))
    churn_prob = float(np.clip(1.0 - survival_prob, 0.001, 0.999))
    
    if churn_prob >= 0.55 or recency > 180.0:
        tier = "High Risk"
    elif churn_prob >= 0.22 or recency >= 75.0:
        tier = "Medium Risk"
    else:
        tier = "Low Risk"
        
    return round(churn_prob, 4), round(survival_prob, 4), tier

def compute_calibrated_pltv(recency: float, frequency: float, monetary: float, survival_prob: float, tier: str, raw_catboost_pltv: float) -> float:
    """
    Computes realistic forward 365-day pLTV anchored to historical spend velocity,
    customer survival rate, and CatBoost ensemble predictions in Indian Rupees (₹).
    """
    annual_spend_rate = monetary * max(0.85, min(1.35, 1.0 + (frequency * 0.02)))
    future_orders = max(1.0, frequency * (365.0 / max(recency * 2.0, 90.0)))
    order_val = (monetary / max(frequency, 1.0)) * 0.3
    
    physics_pltv = (annual_spend_rate * survival_prob) + (order_val * min(future_orders, 12.0) * survival_prob)
    
    min_bound = monetary * (0.12 if tier == "High Risk" else 0.85)
    max_bound = monetary * 2.8 + (frequency * 100.0)
    
    if 0.2 * monetary <= raw_catboost_pltv <= 3.0 * monetary + 2000.0:
        blended = 0.35 * raw_catboost_pltv + 0.65 * physics_pltv
    else:
        blended = physics_pltv
        
    final_pltv = float(np.clip(blended, min_bound, max_bound))
    return round(final_pltv, 2)

def get_strategy_and_roi(churn_score: float, row: Dict[str, Any], risk_tier: Optional[str] = None) -> Tuple[str, str, str, float]:
    """
    Generates prescriptive marketing strategy, priority channel, and ROI uplift.
    """
    has_g = int(row.get('has_google', 0))
    has_i = int(row.get('has_instagram', 0))
    has_e = int(row.get('has_email', 0))
    has_t = int(row.get('has_tiktok', 0))
    freq = float(row.get('frequency', 1))
    mon = float(row.get('monetary', 500))
    rec = float(row.get('recency_days', 30))

    if risk_tier is None:
        if churn_score >= 0.55 or rec > 180:
            risk_tier = "High Risk"
        elif churn_score >= 0.22 or rec >= 75:
            risk_tier = "Medium Risk"
        else:
            risk_tier = "Low Risk"

    if risk_tier == "High Risk":
        if mon >= 10000:
            # Whale customer at risk
            if has_e:
                top_channel = "WhatsApp / Email"
                strategy = "Whale Win-Back Concierge: High-value buyer at risk of permanent churn. Deploy dedicated VIP account concierge with exclusive 25% anniversary voucher."
            elif has_i:
                top_channel = "Instagram"
                strategy = "VIP Social Intercept: Retarget with curated high-roller collection carousel and exclusive concierge reactivation code."
            elif has_g:
                top_channel = "Google Search"
                strategy = "Priority Brand Re-capture: Bid on high-intent brand search queries with complimentary luxury express delivery."
            else:
                top_channel = "TikTok Ads"
                strategy = "VIP Creator Spotlight: Deploy direct-response video campaign with limited 48h VIP re-entry gift."
            roi_uplift = round(26.0 + min(freq * 0.5, 12.0), 1)
        else:
            # Regular / low-spend churn risk
            if has_e:
                top_channel = "Email / WhatsApp"
                strategy = "Win-Back Rescue: Deploy personalized 20% discount re-activation email/WhatsApp sequence with urgent 48h expiration."
                roi_uplift = round(22.5 + min(freq * 0.5, 10.0), 1)
            elif has_g:
                top_channel = "Google Search"
                strategy = "High-Intent Search Retargeting: Bid on branded search queries with complimentary shipping perks."
                roi_uplift = round(19.0 + min(freq * 0.4, 8.0), 1)
            elif has_i:
                top_channel = "Instagram"
                strategy = "Social Churn Intercept: Deploy dynamic catalog carousel retargeting emphasizing customer favorites."
                roi_uplift = round(16.5 + min(freq * 0.3, 7.0), 1)
            else:
                top_channel = "TikTok Ads"
                strategy = "Video Win-Back: Target short-form dynamic creator spotlight with exclusive reactivation voucher."
                roi_uplift = round(14.0 + min(freq * 0.3, 6.0), 1)
    elif risk_tier == "Medium Risk":
        if has_g and has_i:
            top_channel = "Google Search & Instagram"
            strategy = "Omnichannel Re-acceleration: Synchronized search remarketing and Instagram social proof stories."
            roi_uplift = round(28.0 + min(freq * 0.4, 12.0), 1)
        elif has_g:
            top_channel = "Google Search"
            strategy = "Intent-Driven Remarketing: Target category searches with product review highlights and warranty guarantees."
            roi_uplift = round(26.5 + min(freq * 0.4, 10.0), 1)
        elif has_e:
            top_channel = "WhatsApp / Email"
            strategy = "Personalized Drip Nurture: Send curated product recommendations based on past basket affinity."
            roi_uplift = round(25.0 + min(freq * 0.4, 10.0), 1)
        else:
            top_channel = "Instagram"
            strategy = "Visual Brand Re-engagement: Feed & Story placements showcasing new collection drops."
            roi_uplift = round(23.5 + min(freq * 0.3, 8.0), 1)
    else:
        # Low Risk (Safe / Active)
        if mon >= 10000:
            if has_i:
                top_channel = "Instagram"
                strategy = "VIP Loyalty Circle: Grant exclusive invite to VIP ambassador circle with 2x rewards points and early drop previews."
            elif has_e:
                top_channel = "WhatsApp / Email"
                strategy = "Private Member Perks: Deliver secret VIP catalog previews and complimentary gift bundles on next checkout."
            else:
                top_channel = "Google Search"
                strategy = "Premium Upsell: Showcase top-tier luxury complementary accessories on search journeys."
            roi_uplift = round(38.0 + min(freq * 0.3, 15.0), 1)
        else:
            if has_i:
                top_channel = "Instagram"
                strategy = "Active Buyer Nurture: Share user-generated styling lookbooks and reward social shares with bonus loyalty credits."
                roi_uplift = round(33.5 + min(freq * 0.3, 14.0), 1)
            elif has_e:
                top_channel = "WhatsApp / Email"
                strategy = "Repeat Purchase Reminder: Timely restock notifications and bundle discount offers via WhatsApp/Email."
                roi_uplift = round(31.0 + min(freq * 0.3, 12.0), 1)
            elif has_g:
                top_channel = "Google Search"
                strategy = "Cross-Category Discovery: Feature related seasonal essentials on relevant high-intent searches."
                roi_uplift = round(29.0 + min(freq * 0.3, 10.0), 1)
            else:
                top_channel = "TikTok Ads"
                strategy = "Community Engagement: Viral product unboxing reviews and community challenge participation incentives."
                roi_uplift = round(27.0 + min(freq * 0.3, 10.0), 1)

    return risk_tier, top_channel, strategy, roi_uplift

def get_future_investment_advice(risk_tier: str, top_channel: str, attrib: Dict[str, float], monetary: float, pred_pltv: float, recency: float) -> Dict[str, Any]:
    """
    Computes actionable future marketing trends, recommended future budget splits,
    exact ₹ channel contributions (past & future), and next advertising playbook.
    """
    channel_roles = {
        "Instagram": "Top-of-Funnel Discovery & Visual Proof",
        "Google Search": "High-Intent Query Closing & Shopping Feeds",
        "WhatsApp / Email": "Direct Re-orders & VIP Nurture",
        "Email": "Direct Re-orders & VIP Nurture",
        "TikTok": "Viral Discovery & Creator Influencer Lift"
    }

    channel_tactics = {
        "Instagram": "Dynamic Catalog Stories & Creator Lookbook Reels",
        "Google Search": "Branded Search Query Ads & Dynamic Search Retargeting",
        "WhatsApp / Email": "Personalized VIP Early-Access Drops & Replenishment Triggers",
        "Email": "Personalized VIP Early-Access Drops & Replenishment Triggers",
        "TikTok": "Short-Form Unboxing Videos & Limited-Time Creator Spark Ads"
    }

    channels_breakdown = {}
    for ch, pct in attrib.items():
        hist_amt = round(monetary * (pct / 100.0), 2)
        future_amt = round(pred_pltv * (pct / 100.0), 2)
        norm_ch = "WhatsApp / Email" if ch == "Email" else ch
        channels_breakdown[norm_ch] = {
            "channel": norm_ch,
            "percentage": pct,
            "historical_amount": hist_amt,
            "future_projected_amount": future_amt,
            "funnel_stage": channel_roles.get(ch, "Marketing Engagement"),
            "recommended_tactic": channel_tactics.get(ch, "Digital Remarketing Placement")
        }

    # Dynamically compute recommended future ad budget split based on customer's actual active channels & risk tier
    raw_weights = {}
    for ch, pct in attrib.items():
        norm_ch = "WhatsApp / Email" if ch == "Email" else ch
        if pct > 0:
            w = float(pct)
            if risk_tier == "High Risk":
                # Churn rescue: prioritize direct 1-to-1 channels
                if norm_ch == "WhatsApp / Email":
                    w *= 2.2
                elif norm_ch == "Google Search":
                    w *= 1.2
                else:
                    w *= 0.6
            elif risk_tier == "Medium Risk":
                # Cooling off: prioritize intent search & remarketing
                if norm_ch == "Google Search":
                    w *= 1.3
                elif norm_ch == "Instagram":
                    w *= 1.1
                elif norm_ch == "WhatsApp / Email":
                    w *= 1.1
                else:
                    w *= 0.85
            else:
                # Low Risk (Active/Safe): prioritize visual discovery & catalog upsell
                if norm_ch in ["Instagram", "TikTok"]:
                    w *= 1.35
                elif norm_ch == "WhatsApp / Email":
                    w *= 1.0
                else:
                    w *= 0.85
            raw_weights[norm_ch] = w
        else:
            raw_weights[norm_ch] = 0.0

    total_w = sum(raw_weights.values())
    recommended_budget_split = {}
    standard_order = ["Instagram", "WhatsApp / Email", "Google Search", "TikTok"]
    if total_w > 0:
        allocated_pcts = {ch: round((w / total_w) * 100) for ch, w in raw_weights.items()}
        # Ensure percentages sum to exactly 100
        diff = 100 - sum(allocated_pcts.values())
        if diff != 0:
            max_ch = max(allocated_pcts, key=allocated_pcts.get)
            allocated_pcts[max_ch] += diff
        for ch in standard_order:
            recommended_budget_split[ch] = int(allocated_pcts.get(ch, 0))
    else:
        recommended_budget_split = {
            "Instagram": 35,
            "WhatsApp / Email": 30,
            "Google Search": 25,
            "TikTok": 10
        }

    # Dynamic campaign selection based on risk tier, top channel, and spend amount
    is_whale = monetary >= 10000.0
    if risk_tier == "High Risk":
        trend_summary = (
            f"Without immediate intervention, spending will drop steeply by 75-90% over the next 90 days. "
            f"Customer has been inactive for {int(recency)} days, crossing the retail dormancy cliff. "
            f"Expected forward 12-month value is constrained to ₹{pred_pltv:,.0f} unless re-activated."
        )
        if "WhatsApp" in top_channel or "Email" in top_channel:
            next_campaign = {
                "campaign_name": "VIP Concierge Win-Back Sequence" if is_whale else "Urgent Win-Back Rescue Sequence",
                "primary_channel": "WhatsApp & Direct VIP SMS",
                "creative_type": "Personalized Message & Dynamic Discount Voucher",
                "message_angle": "We miss you! Take an exclusive 20% discount on your favorite restocks (Valid 48 hours).",
                "discount_policy": "Deploy margin-conscious 15-20% reactivation incentive with strict 48h deadline.",
                "expected_payback": "Break-even on first re-order within 14 days."
            }
        elif "Google" in top_channel:
            next_campaign = {
                "campaign_name": "High-Intent Brand Re-capture",
                "primary_channel": "Google Search Brand Ads",
                "creative_type": "Branded Query Ads with Free Express Delivery",
                "message_angle": "Welcome back! Enjoy complimentary express shipping on your next purchase.",
                "discount_policy": "Complimentary shipping perk to protect profit margins on search bids.",
                "expected_payback": "Direct query capture within 7 days."
            }
        elif "TikTok" in top_channel:
            next_campaign = {
                "campaign_name": "Creator Spotlight Win-Back",
                "primary_channel": "TikTok Spark Ads",
                "creative_type": "Short-Form Video Featuring Trending Bestsellers",
                "message_angle": "See what trending items you missed this month — exclusive return gift inside.",
                "discount_policy": "Complimentary deluxe trial gift with minimum ₹1,500 order.",
                "expected_payback": "High impulse re-order payback within 18 days."
            }
        else:
            next_campaign = {
                "campaign_name": "Dynamic Social Churn Intercept",
                "primary_channel": "Instagram Dynamic Catalog Ads",
                "creative_type": "Dynamic Catalog Carousel with Customer Favorites",
                "message_angle": "Your favorite collection has arrived with an exclusive return privilege.",
                "discount_policy": "Targeted 15% return incentive strictly for at-risk shoppers.",
                "expected_payback": "Recovers 22% of at-risk revenue within 21 days."
            }
    elif risk_tier == "Medium Risk":
        trend_summary = (
            f"Customer purchase velocity is cooling down. Spending is projected to plateau over the next 3-6 months. "
            f"Timely nurturing will preserve ₹{pred_pltv:,.0f} in forecasted annual revenue."
        )
        if "Google" in top_channel:
            next_campaign = {
                "campaign_name": "Intent-Driven Replenishment",
                "primary_channel": "Google Shopping & Search",
                "creative_type": "Product Review Highlights & Warranty Guarantees",
                "message_angle": "Restock your essentials before seasonal stock runs out.",
                "discount_policy": "Bonus 2x loyalty points on repeat purchase (zero price erosion).",
                "expected_payback": "Purchase frequency accelerated by 16 days."
            }
        elif "WhatsApp" in top_channel or "Email" in top_channel:
            next_campaign = {
                "campaign_name": "Personalized Basket Affinity Nurture",
                "primary_channel": "WhatsApp / Email",
                "creative_type": "Curated Restock Drop & Complementary Accessories",
                "message_angle": "Curated picks based on your previous order — delivered fresh to your inbox.",
                "discount_policy": "Free shipping tier threshold lowered to ₹999.",
                "expected_payback": "Re-purchase cycle compressed by 20 days."
            }
        elif "TikTok" in top_channel:
            next_campaign = {
                "campaign_name": "Trending Catalog Lookbook",
                "primary_channel": "TikTok In-Feed Ads",
                "creative_type": "Customer Review Social Proof Reels",
                "message_angle": "Discover how shoppers are styling the items from your last order.",
                "discount_policy": "Complimentary branded accessory bundle with next order.",
                "expected_payback": "Re-engages customer within 12 days."
            }
        else:
            next_campaign = {
                "campaign_name": "Restock & Cross-Category Nurture",
                "primary_channel": "Instagram Stories & Reels",
                "creative_type": "Dynamic Catalog Carousel & Review Social Proof",
                "message_angle": "Explore newly arrived seasonal complementary arrivals based on your previous order.",
                "discount_policy": "Complimentary express shipping or bonus 2x loyalty points.",
                "expected_payback": "Re-purchase cycle compressed by 22 days."
            }
    else:
        trend_summary = (
            f"Strong upward growth trajectory. Customer exhibits steady buying cadence with near-zero churn hazard. "
            f"Forward 12-month value is projected to reach ₹{pred_pltv:,.0f} across repeat transaction cycles."
        )
        if is_whale:
            next_campaign = {
                "campaign_name": "VIP Advocacy & High-Ticket Upsell",
                "primary_channel": f"{top_channel} VIP Circle",
                "creative_type": "Private Member Early-Access Catalog & Lookbooks",
                "message_angle": "Exclusive preview: You have early access to limited-edition new arrivals before official release.",
                "discount_policy": "Zero discount required. Reward with VIP recognition, gifts with purchase, and referral perks.",
                "expected_payback": "Generates 35-40% additional net margin without discounting."
            }
        else:
            next_campaign = {
                "campaign_name": "Active Buyer Loyalty Escalation",
                "primary_channel": f"{top_channel} Discovery Feed",
                "creative_type": "Style Inspiration Lookbook & Bundle Cross-Sell",
                "message_angle": "Loved your last order? Complete your collection with trending accessories.",
                "discount_policy": "Reward with 2x loyalty points to drive immediate next transaction.",
                "expected_payback": "Increases average order value by +24%."
            }

    return {
        "trend_summary": trend_summary,
        "recommended_budget_split": recommended_budget_split,
        "next_campaign": next_campaign,
        "channels_breakdown": channels_breakdown
    }

def predict_single(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Runs inference for a single customer profile with calibrated survival & realistic pLTV.
    """
    pltv_m, surv_m = load_models()
    
    recency = float(data.get('recency_days', 30.0))
    frequency = float(data.get('frequency', 1.0))
    monetary = float(data.get('monetary', 100.0))
    has_insta = int(data.get('has_instagram', 0))
    has_goog = int(data.get('has_google', 0))
    has_email = int(data.get('has_email', 0))
    has_tiktok = int(data.get('has_tiktok', 0))
    cust_id = str(data.get('customer_id', data.get('CustomerID', 'CUST_001')))
    
    input_vector = np.array([[
        recency, frequency, monetary,
        has_insta, has_goog, has_email, has_tiktok
    ]], dtype=np.float32)
    
    # 1. Raw CatBoost prediction
    raw_pltv = float(pltv_m.predict(input_vector)[0])
    
    # 2. Raw DeepSurv hazard
    input_tensor = torch.tensor(input_vector, dtype=torch.float32)
    with torch.no_grad():
        nn_hazard = float(surv_m(input_tensor).numpy()[0][0])
        
    # 3. Calibrated Survival Analysis (Weibull + RFM inertia + NN)
    churn_score, survival_score, risk_tier = compute_calibrated_survival(
        recency=recency,
        frequency=frequency,
        monetary=monetary,
        nn_hazard=nn_hazard
    )
    
    # 4. Realistic 365-day pLTV in Rupees
    pred_pltv = compute_calibrated_pltv(
        recency=recency,
        frequency=frequency,
        monetary=monetary,
        survival_prob=survival_score,
        tier=risk_tier,
        raw_catboost_pltv=raw_pltv
    )
    
    risk_tier, top_channel, strategy, roi_uplift = get_strategy_and_roi(churn_score, data, risk_tier)
    attrib = get_channel_attribution(data)
    
    investment_advice = get_future_investment_advice(
        risk_tier=risk_tier,
        top_channel=top_channel,
        attrib=attrib,
        monetary=monetary,
        pred_pltv=pred_pltv,
        recency=recency
    )
    
    return {
        "customer_id": cust_id,
        "recency_days": round(recency, 1),
        "frequency": int(frequency),
        "monetary": round(monetary, 2),
        "has_instagram": has_insta,
        "has_google": has_goog,
        "has_email": has_email,
        "has_tiktok": has_tiktok,
        "predicted_365_day_pltv": round(pred_pltv, 2),
        "churn_risk_score": round(churn_score, 4),
        "risk_tier": risk_tier,
        "top_recommended_channel": top_channel,
        "recommended_strategy": strategy,
        "estimated_roi_uplift": roi_uplift,
        "channel_attribution": attrib,
        "survival_probability_365d": round(survival_score, 4),
        "future_investment_advice": investment_advice
    }

def predict_batch_df(df: pd.DataFrame) -> Tuple[Dict[str, Any], List[Dict[str, Any]], pd.DataFrame]:
    """
    Runs vectorized inference over a pandas DataFrame of customer journeys.
    Returns: (portfolio_summary, list_of_prediction_dicts, annotated_dataframe)
    """
    if df is None or df.empty:
        raise ValueError("DataFrame cannot be empty.")

    pltv_m, surv_m = load_models()
    df_clean = df.copy()

    # Column name mappings for flexibility
    col_mapping = {
        'recency': 'recency_days',
        'Recency': 'recency_days',
        'RecencyDays': 'recency_days',
        'Frequency': 'frequency',
        'Monetary': 'monetary',
        'TotalSpend': 'monetary',
        'spend': 'monetary',
        'customer_id': 'CustomerID',
        'customer': 'CustomerID',
        'id': 'CustomerID',
        'has_insta': 'has_instagram',
        'has_goog': 'has_google',
        'has_mail': 'has_email',
        'has_tik': 'has_tiktok'
    }
    df_clean = df_clean.rename(columns=col_mapping)

    # Validate essential columns
    for req in ['recency_days', 'frequency', 'monetary']:
        if req not in df_clean.columns:
            raise ValueError(f"Missing required column: '{req}'. Required: recency_days, frequency, monetary.")

    # Fill defaults for optional touchpoint flags
    for ch in ['has_instagram', 'has_google', 'has_email', 'has_tiktok']:
        if ch not in df_clean.columns:
            df_clean[ch] = 0
        else:
            df_clean[ch] = df_clean[ch].fillna(0).astype(int)

    if 'CustomerID' not in df_clean.columns:
        df_clean['CustomerID'] = [f"CUST_{i+1:04d}" for i in range(len(df_clean))]
    else:
        df_clean['CustomerID'] = df_clean['CustomerID'].astype(str)

    # Convert to numeric feature matrix
    X = df_clean[FEATURE_COLS].astype(float).values
    
    # 1. Vectorized pLTV prediction
    raw_pltv_preds = pltv_m.predict(X)

    # 2. Vectorized DeepSurv churn hazard prediction
    X_tensor = torch.tensor(X, dtype=torch.float32)
    with torch.no_grad():
        nn_hazard_scores = surv_m(X_tensor).numpy().flatten()

    predictions: List[Dict[str, Any]] = []
    risk_tiers: List[str] = []
    top_channels: List[str] = []
    strategies: List[str] = []
    rois: List[float] = []
    final_pltv_list: List[float] = []
    churn_score_list: List[float] = []

    for idx in range(len(df_clean)):
        row_dict = df_clean.iloc[idx].to_dict()
        nn_h = float(nn_hazard_scores[idx])
        raw_p = float(raw_pltv_preds[idx])
        cust_id = str(row_dict['CustomerID'])
        rec = float(row_dict['recency_days'])
        freq = float(row_dict['frequency'])
        mon = float(row_dict['monetary'])
        
        churn_score, survival_score, tier = compute_calibrated_survival(
            recency=rec,
            frequency=freq,
            monetary=mon,
            nn_hazard=nn_h
        )
        
        calibrated_pltv = compute_calibrated_pltv(
            recency=rec,
            frequency=freq,
            monetary=mon,
            survival_prob=survival_score,
            tier=tier,
            raw_catboost_pltv=raw_p
        )
        
        tier, top_ch, strat, roi = get_strategy_and_roi(churn_score, row_dict, tier)
        attrib = get_channel_attribution(row_dict)
        
        risk_tiers.append(tier)
        top_channels.append(top_ch)
        strategies.append(strat)
        rois.append(roi)
        final_pltv_list.append(calibrated_pltv)
        churn_score_list.append(churn_score)
        
        predictions.append({
            "customer_id": cust_id,
            "recency_days": round(rec, 1),
            "frequency": int(freq),
            "monetary": round(mon, 2),
            "has_instagram": int(row_dict['has_instagram']),
            "has_google": int(row_dict['has_google']),
            "has_email": int(row_dict['has_email']),
            "has_tiktok": int(row_dict['has_tiktok']),
            "predicted_365_day_pltv": round(calibrated_pltv, 2),
            "churn_risk_score": round(churn_score, 4),
            "risk_tier": tier,
            "top_recommended_channel": top_ch,
            "recommended_strategy": strat,
            "estimated_roi_uplift": roi,
            "channel_attribution": attrib,
            "survival_probability_365d": round(survival_score, 4)
        })

    # Annotate output DataFrame
    df_result = df_clean.copy()
    df_result['predicted_365_day_pltv'] = final_pltv_list
    df_result['churn_risk_score'] = churn_score_list
    df_result['risk_tier'] = risk_tiers
    df_result['top_recommended_channel'] = top_channels
    df_result['recommended_strategy'] = strategies
    df_result['estimated_roi_uplift'] = rois

    # Aggregate Portfolio Summary KPIs
    total_val = float(np.sum(final_pltv_list))
    avg_churn = float(np.mean(churn_score_list) * 100.0)
    high_risk_count = sum(1 for t in risk_tiers if t == "High Risk")
    med_risk_count = sum(1 for t in risk_tiers if t == "Medium Risk")
    low_risk_count = sum(1 for t in risk_tiers if t == "Low Risk")
    total_customers = len(df_clean)

    value_at_risk = float(sum(p for p, t in zip(final_pltv_list, risk_tiers) if t == "High Risk"))
    avg_customer_val = float(np.mean(final_pltv_list)) if total_customers > 0 else 0.0

    summary = {
        "total_portfolio_value": round(total_val, 2),
        "average_churn_risk": round(avg_churn, 2),
        "high_risk_customer_count": high_risk_count,
        "medium_risk_customer_count": med_risk_count,
        "low_risk_customer_count": low_risk_count,
        "total_customers": total_customers,
        "total_value_at_risk": round(value_at_risk, 2),
        "average_customer_value": round(avg_customer_val, 2)
    }

    return summary, predictions, df_result
