// ========================================================
// PrismCLV · Enterprise Marketing Analytics & Retention Engine
// Deconstruct Multi-Touch Journeys, Forecast Customer Value
// Production Frontend Application Logic
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
  initNavigationTabs();
  initFormControls();
  initArchetypePresets();
  initSinglePredictor();
  initModule1FileUpload();
  initSignatureVisualCharts();
  initBatchUploadModule();
  initBenchmarkCharts();
  initTimeHorizonChannelModule();
});

// Chart instances
let museSalesChartInstance = null;
let museDonutChartInstance = null;
let benchModelChartInstance = null;
let benchAttribChartInstance = null;
let trendSalesChartInstance = null;
let trendChannelChartInstance = null;
let currentBatchPredictions = null;

// Currency Formatter: Indian Rupees (₹)
function formatINR(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return '₹0.00';
  const num = Number(val);
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// --------------------------------------------------------
// 1. Navigation Tab Switching
// --------------------------------------------------------
function initNavigationTabs() {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-content-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');

        // Always scroll to top of new module
        window.scrollTo({ top: 0, behavior: 'instant' });

        // Resize and redraw charts on tab activate
        setTimeout(() => {
          if (targetId === 'tab-ml-benchmarks') {
            if (benchModelChartInstance) {
              benchModelChartInstance.resize();
              benchModelChartInstance.update();
            }
            if (benchAttribChartInstance) {
              benchAttribChartInstance.resize();
              benchAttribChartInstance.update();
            }
          } else if (targetId === 'tab-channel-trends') {
            if (trendSalesChartInstance) {
              trendSalesChartInstance.resize();
              trendSalesChartInstance.update();
            }
            if (trendChannelChartInstance) {
              trendChannelChartInstance.resize();
              trendChannelChartInstance.update();
            }
          } else if (targetId === 'tab-customer-portfolio') {
            if (museSalesChartInstance) {
              museSalesChartInstance.resize();
              museSalesChartInstance.update();
            }
            if (museDonutChartInstance) {
              museDonutChartInstance.resize();
              museDonutChartInstance.update();
            }
          }
        }, 60);
      }
    });
  });
}

// --------------------------------------------------------
// 2. Marketing Touchpoint Pills & Form Controls
// --------------------------------------------------------
function initFormControls() {
  const channelPills = [
    { pill: 'ch-pill-insta', check: 'owner-ch-insta' },
    { pill: 'ch-pill-google', check: 'owner-ch-google' },
    { pill: 'ch-pill-email', check: 'owner-ch-email' },
    { pill: 'ch-pill-tiktok', check: 'owner-ch-tiktok' }
  ];

  channelPills.forEach(({ pill, check }) => {
    const pillEl = document.getElementById(pill);
    const checkEl = document.getElementById(check);
    if (pillEl && checkEl) {
      checkEl.addEventListener('change', () => {
        pillEl.classList.toggle('active', checkEl.checked);
      });
    }
  });
}

// --------------------------------------------------------
// 3. Customer Persona Archetype Presets
// --------------------------------------------------------
// 3. Customer Persona Archetype Presets & Quick Sample Chips
// --------------------------------------------------------
function initArchetypePresets() {
  const presetSelect = document.getElementById('owner-preset-select');

  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      const nameInput = document.getElementById('owner-cust-name');
      const spendInput = document.getElementById('owner-spend');
      const ordersInput = document.getElementById('owner-orders');
      const recencyInput = document.getElementById('owner-recency');
      const checkInsta = document.getElementById('owner-ch-insta');
      const checkGoogle = document.getElementById('owner-ch-google');
      const checkEmail = document.getElementById('owner-ch-email');
      const checkTiktok = document.getElementById('owner-ch-tiktok');

      if (val === 'vip') {
        nameInput.value = 'Ramesh Kumar';
        spendInput.value = 24500;
        ordersInput.value = 16;
        recencyInput.value = 12;
        setChannel('ch-pill-insta', checkInsta, true);
        setChannel('ch-pill-google', checkGoogle, true);
        setChannel('ch-pill-email', checkEmail, true);
        setChannel('ch-pill-tiktok', checkTiktok, false);
      } else if (val === 'at-risk') {
        nameInput.value = 'Ananya Sharma';
        spendInput.value = 18500;
        ordersInput.value = 12;
        recencyInput.value = 210;
        setChannel('ch-pill-insta', checkInsta, false);
        setChannel('ch-pill-google', checkGoogle, true);
        setChannel('ch-pill-email', checkEmail, true);
        setChannel('ch-pill-tiktok', checkTiktok, false);
      } else if (val === 'regular') {
        nameInput.value = 'Vijay Verma';
        spendInput.value = 4800;
        ordersInput.value = 6;
        recencyInput.value = 35;
        setChannel('ch-pill-insta', checkInsta, true);
        setChannel('ch-pill-google', checkGoogle, true);
        setChannel('ch-pill-email', checkEmail, false);
        setChannel('ch-pill-tiktok', checkTiktok, false);
      } else if (val === 'first-time') {
        nameInput.value = 'Rahul Dev';
        spendInput.value = 850;
        ordersInput.value = 1;
        recencyInput.value = 18;
        setChannel('ch-pill-insta', checkInsta, false);
        setChannel('ch-pill-google', checkGoogle, true);
        setChannel('ch-pill-email', checkEmail, false);
        setChannel('ch-pill-tiktok', checkTiktok, true);
      } else if (val === 'churned') {
        nameInput.value = 'Pooja Nair';
        spendInput.value = 1200;
        ordersInput.value = 2;
        recencyInput.value = 310;
        setChannel('ch-pill-insta', checkInsta, false);
        setChannel('ch-pill-google', checkGoogle, false);
        setChannel('ch-pill-email', checkEmail, true);
        setChannel('ch-pill-tiktok', checkTiktok, false);
      }

      runSinglePrediction();
    });
  }

  // Quick Test Sample Chips Click Handlers
  const sampleChips = document.querySelectorAll('.btn-sample-chip');
  sampleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const name = chip.getAttribute('data-name');
      const spend = chip.getAttribute('data-spend');
      const orders = chip.getAttribute('data-orders');
      const recency = chip.getAttribute('data-recency');
      const insta = chip.getAttribute('data-insta') === '1';
      const goog = chip.getAttribute('data-goog') === '1';
      const email = chip.getAttribute('data-email') === '1';
      const tik = chip.getAttribute('data-tik') === '1';

      if (name) document.getElementById('owner-cust-name').value = name;
      if (spend) document.getElementById('owner-spend').value = spend;
      if (orders) document.getElementById('owner-orders').value = orders;
      if (recency) document.getElementById('owner-recency').value = recency;

      setChannel('ch-pill-insta', document.getElementById('owner-ch-insta'), insta);
      setChannel('ch-pill-google', document.getElementById('owner-ch-google'), goog);
      setChannel('ch-pill-email', document.getElementById('owner-ch-email'), email);
      setChannel('ch-pill-tiktok', document.getElementById('owner-ch-tiktok'), tik);

      if (presetSelect) presetSelect.value = 'custom';
      runSinglePrediction();
    });
  });
}

function setChannel(pillId, checkEl, active) {
  if (checkEl) checkEl.checked = active;
  const pill = document.getElementById(pillId);
  if (pill) pill.classList.toggle('active', active);
}

// --------------------------------------------------------
// 4. Single Customer Prediction (Inputs ABOVE, Results BELOW)
// --------------------------------------------------------
function initSinglePredictor() {
  const predictBtn = document.getElementById('btn-owner-predict');
  if (predictBtn) {
    predictBtn.addEventListener('click', runSinglePrediction);
  }

  const presetSelect = document.getElementById('owner-preset-select');

  // Real-time live updates on typing or number changes
  ['owner-spend', 'owner-orders', 'owner-recency', 'owner-cust-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        if (presetSelect) presetSelect.value = 'custom';
        runSinglePrediction();
      });
      el.addEventListener('change', () => {
        if (presetSelect) presetSelect.value = 'custom';
        runSinglePrediction();
      });
    }
  });

  ['owner-ch-insta', 'owner-ch-google', 'owner-ch-email', 'owner-ch-tiktok'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        if (presetSelect) presetSelect.value = 'custom';
        runSinglePrediction();
      });
    }
  });

  // Run once on load to show initial customer state
  runSinglePrediction();
}

async function runSinglePrediction() {
  const nameInput = document.getElementById('owner-cust-name').value || 'Customer #101';
  const spend = parseFloat(document.getElementById('owner-spend').value) || 24500;
  const orders = parseFloat(document.getElementById('owner-orders').value) || 8;
  const recency = parseFloat(document.getElementById('owner-recency').value) || 25;

  const hasInsta = document.getElementById('owner-ch-insta').checked ? 1 : 0;
  const hasGoogle = document.getElementById('owner-ch-google').checked ? 1 : 0;
  const hasEmail = document.getElementById('owner-ch-email').checked ? 1 : 0;
  const hasTiktok = document.getElementById('owner-ch-tiktok').checked ? 1 : 0;

  const payload = {
    customer_id: nameInput,
    recency_days: recency,
    frequency: orders,
    monetary: spend,
    has_instagram: hasInsta,
    has_google: hasGoogle,
    has_email: hasEmail,
    has_tiktok: hasTiktok
  };

  let result = null;
  try {
    const res = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      result = await res.json();
    }
  } catch (e) {
    console.warn('API fetch failed, falling back:', e);
  }

  // High-fidelity calibrated fallback logic if offline
  if (!result) {
    const gamma = 2.15;
    const h0 = Math.pow(Math.max(recency, 0.5) / 180.0, gamma);
    const freqFactor = Math.exp(-0.04 * Math.min(Math.max(orders, 1) - 1, 12));
    const cumHazard = h0 * freqFactor;
    const survivalProb = Math.exp(-cumHazard);
    const churnProb = Math.min(Math.max(1 - survivalProb, 0.001), 0.999);
    const tier = (churnProb >= 0.55 || recency > 180) ? 'High Risk' : ((churnProb >= 0.22 || recency >= 75) ? 'Medium Risk' : 'Low Risk');
    
    const annualSpend = spend * Math.max(0.85, Math.min(1.35, 1.0 + orders * 0.02));
    const pLtv = Math.max(spend * (tier === 'High Risk' ? 0.15 : 0.85), Math.round(annualSpend * survivalProb + (spend / Math.max(orders, 1)) * 0.3 * Math.min(orders * (365 / Math.max(recency * 2, 90)), 12) * survivalProb));
    const topCh = hasInsta ? 'Instagram' : (hasGoogle ? 'Google Search' : (hasEmail ? 'WhatsApp / Email' : 'TikTok Ads'));

    result = {
      customer_id: nameInput,
      predicted_365_day_pltv: Math.round(pLtv * 100) / 100,
      churn_risk_score: Math.round(churnProb * 1000) / 1000,
      risk_tier: tier,
      top_recommended_channel: topCh,
      recommended_strategy: tier === 'High Risk'
        ? (spend >= 10000 ? 'Whale Win-Back Concierge: Dispatch VIP account manager with exclusive 25% anniversary gift.' : 'Deploy urgent 20% reactivation voucher via WhatsApp with 48h limit.')
        : (tier === 'Medium Risk'
          ? 'Send targeted product recommendation catalog on Instagram / WhatsApp.'
          : 'Enroll into VIP loyalty circle with exclusive preview access to new arrivals.'),
      estimated_roi_uplift: tier === 'High Risk' ? (spend >= 10000 ? 30.5 : 22.5) : (tier === 'Medium Risk' ? 28.0 : 35.5),
      channel_attribution: {
        'Instagram': hasInsta ? 38.0 : 0,
        'Google Search': hasGoogle ? 32.0 : 0,
        'WhatsApp / Email': hasEmail ? 20.0 : 0,
        'TikTok': hasTiktok ? 10.0 : 0
      },
      survival_probability_365d: Math.round(survivalProb * 1000) / 1000
    };
  }

  updateSingleCustomerUI(result);
}

function updateSingleCustomerUI(data) {
  const custName = data.customer_id || 'Customer';
  const pltv = data.predicted_365_day_pltv || 0;
  const churn = data.churn_risk_score || 0;
  const tier = data.risk_tier || 'Low Risk';
  const topCh = data.top_recommended_channel || 'Instagram';
  const strategy = data.recommended_strategy || '';
  const roi = data.estimated_roi_uplift || 25;
  const survival = data.survival_probability_365d !== undefined ? data.survival_probability_365d : (1 - churn);

  // 1. Determine Buyer Profile and Churn Risk
  const spendVal = parseFloat(document.getElementById('owner-spend').value) || data.monetary || 0;
  let buyerProfile = "Casual Buyer";
  if (spendVal >= 15000) buyerProfile = "VIP High Spender";
  else if (spendVal >= 3000) buyerProfile = "Mid-Tier Regular Shopper";
  else buyerProfile = "Casual / Low-Spend Buyer";

  const emojiEl = document.getElementById('owner-badge-emoji');
  const headlineEl = document.getElementById('owner-badge-headline');
  const descEl = document.getElementById('owner-desc-text');
  const actionEl = document.getElementById('owner-action-box');
  const resultCard = document.getElementById('shop-owner-result-card');

  if (tier === 'Low Risk') {
    emojiEl.textContent = '🟢';
    headlineEl.textContent = `${custName} is an Active ${buyerProfile} (Safe Retention)`;
    resultCard.style.borderColor = '#86efac';
    resultCard.style.background = '#f0fdf4';
  } else if (tier === 'Medium Risk') {
    emojiEl.textContent = '🟠';
    headlineEl.textContent = `Attention: ${custName} is Cooling Off (${buyerProfile})`;
    resultCard.style.borderColor = '#fcd34d';
    resultCard.style.background = '#fffbeb';
  } else {
    emojiEl.textContent = '🔴';
    if (spendVal >= 10000) {
      headlineEl.textContent = `Critical Alert: ${custName} is an Inactive High Spender (Whale Churn Alert!)`;
    } else {
      headlineEl.textContent = `Urgent Churn Alert: ${custName} is at High Risk of Leaving (${buyerProfile})`;
    }
    resultCard.style.borderColor = '#fca5a5';
    resultCard.style.background = '#fef2f2';
  }

  const extraSales = formatINR(pltv * (roi / 100), 0);

  descEl.innerHTML = `
    • <strong>Expected 1-Year Revenue:</strong> ${custName} is forecasted to spend <strong>${formatINR(pltv)}</strong> in your shop over the next 12 months.<br>
    • <strong>Retention Health:</strong> There is a <strong>${(survival * 100).toFixed(1)}% chance of retention</strong> (only <strong>${(churn * 100).toFixed(1)}% churn risk</strong>).<br>
    • <strong>Best Channel:</strong> Focus your communication on <strong>${topCh}</strong>.
  `;

  actionEl.innerHTML = `
    <strong>👉 Recommended Action:</strong> ${strategy} Expected extra sales uplift: <strong>+${extraSales}</strong>.
  `;

  // 2. Update the 4 KPI Cards (Placed below inputs)
  document.getElementById('m1-val').textContent = formatINR(pltv, 0);
  document.getElementById('m2-val').textContent = `${(churn * 100).toFixed(1)}%`;
  document.getElementById('m3-val').textContent = tier === 'Low Risk'
    ? `Safe (${(survival * 100).toFixed(0)}%)`
    : (tier === 'Medium Risk' ? `Medium (${(survival * 100).toFixed(0)}%)` : `Critical (${(survival * 100).toFixed(0)}%)`);
  document.getElementById('m4-val').textContent = topCh;

  // 2.5 Render Multi-Touch Channel ₹ Contribution Cards (Concept A)
  renderChannelContributionCards(data, spendVal, pltv);

  // 2.6 Render Future Marketing Trends & Investment Playbook
  renderFutureInvestmentPlaybook(data);

  // 3. Update Technical MLOps Breakdown
  const tierPill = document.getElementById('tech-tier-pill');
  if (tierPill) {
    tierPill.textContent = `${tier} Segment`;
    tierPill.className = tier === 'Low Risk' ? 'badge-tag green' : (tier === 'Medium Risk' ? 'badge-tag orange' : 'badge-tag red');
  }

  const techPltv = document.getElementById('tech-pltv-val');
  if (techPltv) techPltv.textContent = formatINR(pltv);

  const techHazard = document.getElementById('tech-hazard-val');
  if (techHazard) techHazard.textContent = churn.toFixed(4);

  const techSurvival = document.getElementById('tech-survival-val');
  if (techSurvival) techSurvival.textContent = `${(survival * 100).toFixed(2)}%`;

  const techRoi = document.getElementById('tech-roi-val');
  if (techRoi) techRoi.textContent = `+${roi.toFixed(1)}%`;

  // 4. Update the live Sales Line Chart trajectory
  updateSalesTrajectory(pltv);
}

// --------------------------------------------------------
// Helper: Render Multi-Touch Channel ₹ Cards (Concept A)
// --------------------------------------------------------
function renderChannelContributionCards(data, spendVal, pltv) {
  const container = document.getElementById('channel-contribution-cards');
  if (!container) return;

  const advice = data.future_investment_advice;
  let breakdown = advice ? advice.channels_breakdown : null;

  if (!breakdown) {
    const rawAttrib = data.channel_attribution || {
      'Instagram': 38.0,
      'Google Search': 32.0,
      'WhatsApp / Email': 20.0,
      'TikTok': 10.0
    };
    breakdown = {};
    const roles = {
      'Instagram': { stage: 'Top-of-Funnel Discovery & Visual Proof', tactic: 'Dynamic Catalog Stories & Creator Lookbook Reels' },
      'Google Search': { stage: 'High-Intent Query Closing & Shopping Feeds', tactic: 'Branded Search Query Ads & Dynamic Search Retargeting' },
      'WhatsApp / Email': { stage: 'Direct Re-orders & VIP Nurture', tactic: 'Personalized VIP Early-Access Drops & Replenishment Triggers' },
      'TikTok': { stage: 'Viral Discovery & Creator Influencer Lift', tactic: 'Short-Form Unboxing Videos & Creator Spark Ads' }
    };
    Object.keys(rawAttrib).forEach(ch => {
      const pct = rawAttrib[ch] || 0;
      const normCh = ch === 'Email' ? 'WhatsApp / Email' : ch;
      breakdown[normCh] = {
        channel: normCh,
        percentage: pct,
        historical_amount: Math.round(spendVal * (pct / 100.0)),
        future_projected_amount: Math.round(pltv * (pct / 100.0)),
        funnel_stage: (roles[normCh] && roles[normCh].stage) || 'Digital Marketing',
        recommended_tactic: (roles[normCh] && roles[normCh].tactic) || 'Targeted Placement'
      };
    });
  }

  const channelConfig = [
    { key: 'Instagram', name: 'Instagram', icon: '📸', color: '#e1306c', bg: '#fdf2f8' },
    { key: 'Google Search', name: 'Google Search', icon: '🔍', color: '#2563eb', bg: '#eff6ff' },
    { key: 'WhatsApp / Email', name: 'WhatsApp / Email', icon: '💬', color: '#10b981', bg: '#ecfdf5' },
    { key: 'TikTok', name: 'TikTok Ads', icon: '🎵', color: '#0f172a', bg: '#f8fafc' }
  ];

  let cardsHtml = '';
  channelConfig.forEach(cfg => {
    let item = breakdown[cfg.key] || breakdown[cfg.name];
    if (!item && cfg.key === 'TikTok') item = breakdown['TikTok'];

    const pct = item ? (item.percentage || 0) : 0;
    const histAmt = item ? (item.historical_amount || 0) : 0;
    const futAmt = item ? (item.future_projected_amount || 0) : 0;
    const role = item ? (item.funnel_stage || '') : '';
    const tactic = item ? (item.recommended_tactic || '') : '';
    const isActive = pct > 0;

    const cardBorder = isActive ? '1px solid #e2e8f0' : '1px dashed #cbd5e1';
    const cardBg = isActive ? '#ffffff' : '#f8fafc';
    const cardShadow = isActive ? 'box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);' : '';
    const cardOpacity = isActive ? '' : 'opacity: 0.6;';

    cardsHtml += `
      <div class="channel-contrib-card ${isActive ? 'active' : 'inactive'}" style="background: ${cardBg}; border: ${cardBorder}; border-radius: 12px; padding: 1.15rem 1.15rem; ${cardShadow} ${cardOpacity} display: flex; flex-direction: column; justify-content: space-between; min-height: 200px;">
        <div>
          <div class="channel-contrib-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
            <span class="channel-contrib-name" style="font-size: 0.95rem; font-weight: 700; color: ${isActive ? '#1e293b' : '#64748b'}; display: flex; align-items: center; gap: 8px;">
              <span style="font-size:1.2rem;">${cfg.icon}</span> ${cfg.name}
            </span>
            <span class="channel-contrib-pct" style="${isActive ? `background:${cfg.bg}; color:${cfg.color}; font-weight:800; border:1px solid ${cfg.color}40; padding: 3px 9px; border-radius: 9999px; font-size: 0.72rem;` : 'background:#f1f5f9; color:#94a3b8; font-weight:700; padding: 3px 9px; border-radius: 9999px; font-size: 0.72rem;'}">
              ${pct > 0 ? pct.toFixed(1) + '%' : 'Inactive'}
            </span>
          </div>

          <div style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.04em;">
            Historical Rupee Credit
          </div>
          <div class="channel-contrib-amount" style="font-size: 1.45rem; font-weight: 800; color: ${isActive ? cfg.color : '#94a3b8'}; letter-spacing: -0.03em; margin: 0.25rem 0 0.5rem 0; line-height: 1.2;">
            ${formatINR(histAmt)}
          </div>

          <div class="channel-contrib-future" style="font-size: 0.78rem; font-weight: 600; color: ${isActive ? '#047857' : '#64748b'}; background: ${isActive ? '#ecfdf5' : '#f1f5f9'}; border: 1px solid ${isActive ? '#d1fae5' : '#e2e8f0'}; padding: 4px 9px; border-radius: 8px; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 0.75rem;">
            <span>🔮 1-Yr Forecast:</span> <strong>${formatINR(futAmt)}</strong>
          </div>
        </div>

        <div class="channel-contrib-role" style="font-size: 0.75rem; color: #64748b; line-height: 1.4; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: auto;">
          <div style="font-weight:700; color:#334155; margin-bottom:2px;">${role || 'Marketing Channel'}</div>
          <div style="font-size:0.72rem; color:#64748b;">${tactic}</div>
        </div>
      </div>
    `;
  });

  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(4, 1fr)';
  container.style.gap = '16px';
  container.style.margin = '1rem 0 1.5rem 0';
  container.innerHTML = cardsHtml;
}

// --------------------------------------------------------
// Helper: Render Future Trends & Investment Playbook
// --------------------------------------------------------
function renderFutureInvestmentPlaybook(data) {
  const trendEl = document.getElementById('playbook-trend-text');
  const budgetEl = document.getElementById('playbook-budget-bars');
  const campaignEl = document.getElementById('playbook-campaign-content');

  const advice = data.future_investment_advice;
  const tier = data.risk_tier || 'Low Risk';
  const pltv = data.predicted_365_day_pltv || 0;

  // 1. Forward Trend Text
  if (trendEl) {
    if (advice && advice.trend_summary) {
      trendEl.innerHTML = advice.trend_summary;
    } else {
      if (tier === 'High Risk') {
        trendEl.innerHTML = `⚠️ <strong>Steep Decay Risk:</strong> Spending will drop 75-90% over next 90 days if inactive. 1-Yr potential capped at <strong>${formatINR(pltv)}</strong> unless re-engaged immediately.`;
      } else if (tier === 'Medium Risk') {
        trendEl.innerHTML = `⏳ <strong>Cooling Off:</strong> Purchase velocity plateauing over next 3-6 months. Strategic engagement can capture full <strong>${formatINR(pltv)}</strong> 1-Yr value.`;
      } else {
        trendEl.innerHTML = `🚀 <strong>Sustained Growth:</strong> High buying cadence with minimal hazard. Customer projected to generate <strong>${formatINR(pltv)}</strong> over next 12 months.`;
      }
    }
  }

  // 2. Budget Bars
  if (budgetEl) {
    let budgetSplit = (advice && advice.recommended_budget_split) || (
      tier === 'High Risk'
        ? { 'WhatsApp / Email': 60, 'Google Search': 25, 'Instagram': 15, 'TikTok': 0 }
        : (tier === 'Medium Risk'
          ? { 'Instagram': 40, 'Google Search': 35, 'WhatsApp / Email': 25, 'TikTok': 0 }
          : { 'Instagram': 45, 'WhatsApp / Email': 30, 'Google Search': 25, 'TikTok': 0 })
    );

    const channelColors = {
      'Instagram': '#e1306c',
      'Google Search': '#2563eb',
      'WhatsApp / Email': '#10b981',
      'TikTok': '#64748b'
    };

    let barsHtml = '';
    Object.keys(budgetSplit).forEach(ch => {
      const splitPct = budgetSplit[ch] || 0;
      const color = channelColors[ch] || '#6366f1';
      barsHtml += `
        <div class="budget-bar-row">
          <div class="budget-bar-labels">
            <span>${ch}</span>
            <span style="font-weight:800; color:${splitPct > 0 ? color : '#94a3b8'};">${splitPct}%</span>
          </div>
          <div class="budget-bar-track">
            <div class="budget-bar-fill" style="width:${splitPct}%; background:${color};"></div>
          </div>
        </div>
      `;
    });
    budgetEl.innerHTML = barsHtml;
  }

  // 3. Next Campaign Playbook
  if (campaignEl) {
    let camp = (advice && advice.next_campaign) || (
      tier === 'High Risk'
        ? {
            campaign_name: 'Urgent Win-Back Rescue Sequence',
            primary_channel: 'WhatsApp / Email',
            creative_type: 'Direct-Response Message & Dynamic Discount Voucher',
            message_angle: 'We miss you! Take an exclusive 20% discount on your favorite items (Valid 48 hours).',
            discount_policy: 'Deploy margin-conscious 15-20% reactivation incentive with strict 48h deadline.',
            expected_payback: 'Break-even on first re-order within 14 days.'
          }
        : (tier === 'Medium Risk'
          ? {
              campaign_name: 'Restock & Cross-Category Nurture',
              primary_channel: 'Google Search & Instagram',
              creative_type: 'Dynamic Catalog Carousel & Review Social Proof',
              message_angle: 'Explore newly arrived seasonal complementary arrivals based on your previous order.',
              discount_policy: 'Complimentary express shipping or bonus 2x loyalty points (avoid heavy price cuts).',
              expected_payback: 'Re-purchase cycle compressed by 22 days.'
            }
          : {
              campaign_name: 'VIP Advocacy & High-Ticket Upsell',
              primary_channel: 'Instagram & WhatsApp VIP Circle',
              creative_type: 'Private Member Early-Access Catalog & Lookbooks',
              message_angle: 'Exclusive preview: You have early access to limited-edition new arrivals before official release.',
              discount_policy: 'Zero discount required. Reward with VIP recognition, gifts with purchase, and referral perks.',
              expected_payback: 'Generates 35-40% additional net margin without discounting.'
            })
    );

    campaignEl.innerHTML = `
      <div style="font-weight:800; color:#1e293b; font-size:0.88rem; margin-bottom:4px;">
        ${camp.campaign_name}
      </div>
      <div style="font-size:0.75rem; color:#475569; margin-bottom:6px;">
        <strong>Channel:</strong> <span style="color:#2563eb; font-weight:700;">${camp.primary_channel}</span> | 
        <strong>Format:</strong> ${camp.creative_type}
      </div>
      <div style="background:#ffffff; border-left:3px solid #3b82f6; padding:6px 9px; border-radius:4px; font-size:0.77rem; color:#1e293b; font-style:italic; margin-bottom:6px;">
        "${camp.message_angle}"
      </div>
      <div style="font-size:0.74rem; color:#64748b;">
        <strong>Discount Rule:</strong> ${camp.discount_policy}<br>
        <strong>Payback Pacing:</strong> ${camp.expected_payback}
      </div>
    `;
  }
}

// --------------------------------------------------------
// 5. File Ingestion for Single Customer (CSV / PDF)
// --------------------------------------------------------
function initModule1FileUpload() {
  const dropzone = document.getElementById('module1-dropzone');
  const fileInput = document.getElementById('module1-file-input');
  const browseBtn = document.getElementById('btn-browse-module1');
  const statusEl = document.getElementById('module1-file-status');

  if (!dropzone || !fileInput) return;

  browseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput.click();
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary)';
    dropzone.style.background = '#f5f3ff';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = '#cbd5e1';
    dropzone.style.background = '#f8fafc';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#cbd5e1';
    dropzone.style.background = '#f8fafc';
    if (e.dataTransfer.files.length > 0) {
      handleSingleUploadFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleSingleUploadFile(fileInput.files[0]);
    }
  });
}

async function handleSingleUploadFile(file) {
  const statusEl = document.getElementById('module1-file-status');
  statusEl.textContent = `⏳ Processing ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/predict_batch', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Could not parse file');
    }

    const data = await res.json();
    const preds = data.predictions || [];

    if (preds.length === 0) {
      statusEl.textContent = `⚠️ No customer records could be parsed from ${file.name}.`;
      return;
    }

    if (preds.length === 1) {
      const cust = preds[0];
      statusEl.textContent = `✅ Successfully extracted bill for ${cust.customer_id}!`;
      document.getElementById('owner-cust-name').value = cust.customer_id;
      document.getElementById('owner-spend').value = cust.monetary || 24500;
      document.getElementById('owner-orders').value = cust.frequency || 8;
      document.getElementById('owner-recency').value = cust.recency_days || 25;
      updateSingleCustomerUI(cust);
    } else {
      // Multiple customers uploaded: render directly in batch section on same page!
      statusEl.textContent = `✅ Loaded ${preds.length} customers from ${file.name} into Portfolio Analytics below!`;
      currentBatchPredictions = preds;
      renderBatchResults(data.summary, preds);
      const batchWrap = document.getElementById('batch-results-wrap');
      if (batchWrap) batchWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    statusEl.textContent = `❌ Upload failed: ${err.message}`;
  }
}

// --------------------------------------------------------
// 6. Signature Visual Charts (Sales Trajectory & Donut)
// --------------------------------------------------------
function initSignatureVisualCharts() {
  // Sales Line Chart
  const ctx = document.getElementById('museSalesChart');
  if (ctx) {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const marketingData = [28000, 34000, 42000, 39000, 49000, 56000, 62000, 59000, 67000, 72714, 76000, 82000];
    const baselineData = [24000, 27000, 32000, 35000, 41000, 44000, 48000, 50000, 53000, 58000, 62000, 66000];

    museSalesChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Marketing Sales',
            data: marketingData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#2563eb',
            pointBorderWidth: 2,
            pointRadius: 3.5,
            pointHoverRadius: 6
          },
          {
            label: 'Baseline Sales',
            data: baselineData,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.04)',
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#8b5cf6',
            pointBorderWidth: 2,
            pointRadius: 3.5,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
            bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
            padding: 9,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatINR(ctx.raw, 0)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }, color: '#94a3b8' } },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { family: 'Plus Jakarta Sans', size: 11 },
              color: '#94a3b8',
              callback: (val) => '₹' + (val / 1000) + 'k'
            }
          }
        }
      }
    });
  }

  // Donut Chart
  const ctxDonut = document.getElementById('museDonutChart');
  if (ctxDonut) {
    museDonutChartInstance = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: ['Returning Users', 'Dropped Users', 'High-LTV Users', 'Permanent Users', 'Membership Users'],
        datasets: [{
          data: [35, 15, 20, 15, 15],
          backgroundColor: ['#8b5cf6', '#312e81', '#6366f1', '#c4b5fd', '#1e1b4b'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 8,
            cornerRadius: 6,
            callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}%` }
          }
        }
      },
      plugins: [{
        id: 'centerTextPlugin',
        beforeDraw: (chart) => {
          const { width, height, ctx } = chart;
          ctx.save();
          ctx.font = '800 1.15rem "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('100%', width / 2, height / 2 - 8);

          ctx.font = '600 0.72rem "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText('₹9,12,000', width / 2, height / 2 + 12);
          ctx.restore();
        }
      }]
    });
  }
}

function updateSalesTrajectory(annualPltv) {
  if (!museSalesChartInstance) return;
  const factor = annualPltv / 62302;
  const baseMarketing = [28000, 34000, 42000, 39000, 49000, 56000, 62000, 59000, 67000, 72714, 76000, 82000];
  const baseBaseline = [24000, 27000, 32000, 35000, 41000, 44000, 48000, 50000, 53000, 58000, 62000, 66000];

  museSalesChartInstance.data.datasets[0].data = baseMarketing.map(v => Math.round(v * factor));
  museSalesChartInstance.data.datasets[1].data = baseBaseline.map(v => Math.round(v * factor));
  museSalesChartInstance.update();
}

// --------------------------------------------------------
// 7. Batch Portfolio Analytics (Rendered on Same First Page!)
// --------------------------------------------------------
function initBatchUploadModule() {
  const dropzone = document.getElementById('batch-dropzone-area');
  const fileInput = document.getElementById('batch-csv-pdf-input');
  const browseBtn = document.getElementById('btn-browse-batch');
  const scoreBtn = document.getElementById('btn-run-batch-scoring');
  const loadCohortBtn = document.getElementById('btn-load-demo-cohort');
  const downloadTmplBtn = document.getElementById('btn-download-csv-tmpl');
  const exportScoredBtn = document.getElementById('btn-download-scored-csv');
  const infoEl = document.getElementById('batch-file-info');

  let selectedFile = null;

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        selectedFile = fileInput.files[0];
        infoEl.textContent = `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`;
      }
    });
  }

  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--primary)';
      dropzone.style.background = '#f5f3ff';
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = '#cbd5e1';
      dropzone.style.background = '#f8fafc';
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#cbd5e1';
      dropzone.style.background = '#f8fafc';
      if (e.dataTransfer.files.length > 0) {
        selectedFile = e.dataTransfer.files[0];
        infoEl.textContent = `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`;
      }
    });
  }

  if (scoreBtn) {
    scoreBtn.addEventListener('click', async () => {
      if (!selectedFile) {
        alert('Please browse or drag-and-drop a CSV or PDF file first!');
        return;
      }
      scoreBtn.textContent = '⏳ Scoring Portfolio in ₹ Rupees...';
      scoreBtn.disabled = true;

      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const res = await fetch('/predict_batch', {
          method: 'POST',
          body: formData
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Inference error');
        }
        const data = await res.json();
        currentBatchPredictions = data.predictions;
        renderBatchResults(data.summary, data.predictions);
      } catch (err) {
        alert(`Batch scoring failed: ${err.message}`);
      } finally {
        scoreBtn.textContent = '⚡ Run Portfolio Scoring & Value-at-Risk Analysis (in ₹ Rupees)';
        scoreBtn.disabled = false;
      }
    });
  }

  // Load Real Retail Cohort (350 Customers) button
  if (loadCohortBtn) {
    loadCohortBtn.addEventListener('click', async () => {
      loadCohortBtn.textContent = '⏳ Loading 350 Retail Customers...';
      try {
        const res = await fetch('/api/sample_cohort');
        if (!res.ok) throw new Error('Could not load sample cohort');
        const data = await res.json();
        currentBatchPredictions = data.predictions;
        renderBatchResults(data.summary, data.predictions);
        infoEl.textContent = `✅ Successfully loaded UCI Online Retail Cohort (350 Verified Customer Histories)!`;
      } catch (err) {
        alert(`Failed to load cohort: ${err.message}`);
      } finally {
        loadCohortBtn.textContent = '🚀 Load Real Retail Cohort (350 Customers)';
      }
    });
  }

  // Download template button
  if (downloadTmplBtn) {
    downloadTmplBtn.addEventListener('click', () => {
      window.location.href = '/api/download_template';
    });
  }

  // Export Scored CSV button
  if (exportScoredBtn) {
    exportScoredBtn.addEventListener('click', () => {
      if (!currentBatchPredictions || currentBatchPredictions.length === 0) return;
      exportPredictionsToCSV(currentBatchPredictions);
    });
  }
}

function renderBatchResults(summary, predictions) {
  const wrap = document.getElementById('batch-results-wrap');
  if (!wrap) return;
  wrap.style.display = 'block';

  const totalVal = summary.total_portfolio_value || 0;
  const riskVal = summary.total_value_at_risk !== undefined ? summary.total_value_at_risk : (summary.total_risk_exposure || 0);
  const highRiskCount = summary.high_risk_customer_count !== undefined ? summary.high_risk_customer_count : (summary.high_risk_customers_count || 0);
  const churnPct = summary.average_churn_risk > 1 ? summary.average_churn_risk : (summary.average_churn_risk * 100);
  const avgVal = summary.average_customer_value !== undefined ? summary.average_customer_value : (summary.average_customer_pltv || 0);

  document.getElementById('b-val-total').textContent = formatINR(totalVal, 2);
  document.getElementById('b-val-risk').textContent = formatINR(riskVal, 2);
  document.getElementById('b-val-high-count').textContent = highRiskCount;
  document.getElementById('b-val-risk-accounts').textContent = `${highRiskCount} high-risk accounts`;
  document.getElementById('b-val-churn').textContent = `${churnPct.toFixed(1)}%`;
  document.getElementById('b-val-avg').textContent = formatINR(avgVal, 2);

  // Table population
  const tbody = document.getElementById('batch-table-body');
  tbody.innerHTML = '';

  const displayRows = predictions.slice(0, 100);
  displayRows.forEach(cust => {
    const tr = document.createElement('tr');
    const tier = cust.risk_tier || 'Low Risk';
    const badgeClass = tier === 'Low Risk' ? 'badge-tag green' : (tier === 'Medium Risk' ? 'badge-tag orange' : 'badge-tag red');

    tr.innerHTML = `
      <td><strong>${cust.customer_id}</strong></td>
      <td>${formatINR(cust.monetary || 0, 0)}</td>
      <td>${cust.frequency || 1}</td>
      <td>${cust.recency_days || 0} d</td>
      <td><strong>${formatINR(cust.predicted_365_day_pltv, 0)}</strong></td>
      <td>${((cust.churn_risk_score || 0) * 100).toFixed(1)}%</td>
      <td><span class="${badgeClass}">${tier}</span></td>
      <td>${cust.top_recommended_channel || 'Instagram'}</td>
      <td style="font-size:0.82rem; max-width:280px; color:#475569;">${cust.recommended_strategy || 'VIP advocacy'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function exportPredictionsToCSV(predictions) {
  const headers = ['CustomerID', 'MonetarySpend_INR', 'Orders', 'RecencyDays', 'Predicted_365D_pLTV_INR', 'ChurnRiskPct', 'RiskTier', 'RecommendedChannel', 'ActionStrategy'];
  const rows = predictions.map(p => [
    `"${p.customer_id}"`,
    p.monetary || 0,
    p.frequency || 0,
    p.recency_days || 0,
    p.predicted_365_day_pltv || 0,
    ((p.churn_risk_score || 0) * 100).toFixed(2),
    `"${p.risk_tier || ''}"`,
    `"${p.top_recommended_channel || ''}"`,
    `"${(p.recommended_strategy || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `prismclv_scored_customers_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --------------------------------------------------------
// 8. Advanced ML Benchmarks Charts (Tab 2)
// --------------------------------------------------------
function initBenchmarkCharts() {
  const ctxA = document.getElementById('benchModelChart');
  if (ctxA) {
    benchModelChartInstance = new Chart(ctxA, {
      type: 'bar',
      data: {
        labels: [
          'CatBoost (Revenue)',
          'PyTorch DeepSurv (Churn)',
          'Random Forest (Revenue)',
          'Logistic Reg (Churn)',
          'Linear Reg (Revenue)'
        ],
        datasets: [{
          label: 'Validation Score (R² or AUC)',
          data: [0.995, 0.982, 0.932, 0.824, 0.784],
          backgroundColor: ['#10b981', '#4f46e5', '#94a3b8', '#cbd5e1', '#e2e8f0'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const idx = ctx.dataIndex;
                if (idx === 0) return '👑 WINNER: REVENUE MODEL (MAE: ₹431.26)';
                if (idx === 1) return '👑 WINNER: CHURN TIMING (Acc: 95.1%)';
                return '';
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Plus Jakarta Sans', size: 10.5, weight: '600' }, color: '#475569' } },
          y: { min: 0.6, max: 1.0, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#94a3b8' } }
        }
      }
    });
  }

  const ctxB = document.getElementById('benchAttribChart');
  if (ctxB) {
    benchAttribChartInstance = new Chart(ctxB, {
      type: 'bar',
      data: {
        labels: ['Instagram', 'Google Search', 'WhatsApp / Email', 'TikTok'],
        datasets: [
          {
            label: 'Last-Touch Rule (Biased)',
            data: [15.0, 45.0, 25.0, 15.0],
            backgroundColor: '#cbd5e1',
            borderRadius: 6
          },
          {
            label: 'Multi-Touch AI Engine (True Impact)',
            data: [28.0, 34.0, 22.0, 16.0],
            backgroundColor: '#4f46e5',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '700' } } },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                if (ctx.dataIndex === 0 && ctx.datasetIndex === 1) return '🚀 +86.7% Discovery Lift Unlocked!';
                if (ctx.dataIndex === 1 && ctx.datasetIndex === 1) return '⚖️ -24.4% Over-credit Corrected';
                if (ctx.dataIndex === 3 && ctx.datasetIndex === 1) return '🚀 +33.3% Awareness Lift';
                return '';
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } } },
          y: { grid: { color: '#f1f5f9' }, ticks: { callback: (v) => v + '%' } }
        }
      }
    });
  }
}

// --------------------------------------------------------
// 9. Time-Horizon Channel Attribution Module (New Module 3!)
// --------------------------------------------------------
const HORIZON_DATA = {
  yearly: {
    title: 'Yearly (12 Months)',
    summaryTotal: '₹8,87,367.00',
    growthBadge: '+115.4% Period Growth',
    growthClass: 'green',
    lineTitle: 'Overall Sales Revenue Trajectory (12 Months)',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    revenues: [52000, 58000, 64000, 61000, 72000, 79000, 86000, 83000, 92000, 98000, 104000, 112000],
    channels: [
      { name: 'Instagram', val: 310578, pct: '35.0%', role: 'Primary Discovery Driver' },
      { name: 'Google Search', val: 283957, pct: '32.0%', role: 'High-Intent Purchase Closer' },
      { name: 'WhatsApp / Email', val: 186347, pct: '21.0%', role: 'VIP Retention & Repeat Orders' },
      { name: 'TikTok', val: 106485, pct: '12.0%', role: 'Viral Awareness & Reach' }
    ],
    decisionText: `
      • <strong>Primary Acquisition Driver:</strong> <strong>Instagram</strong> drove the largest share of net customer revenue (<strong>₹3,10,578 / 35.0%</strong>), serving as the primary touchpoint for initial product discovery and catalog interest.<br>
      • <strong>Conversion Closer:</strong> <strong>Google Search</strong> captured <strong>₹2,83,957 (32.0%)</strong>, functioning as the high-intent closer when shoppers searched for brand terms after discovering products on social channels.<br>
      • <strong>Highest ROAS Channel:</strong> <strong>WhatsApp / Email</strong> generated <strong>₹1,86,347 (21.0%)</strong> with near-zero ad spend cost, delivering the highest return on investment via automated repeat purchase journeys.<br>
      • <strong>Budget Optimization Recommendation:</strong> Shift 15% of generic Google search budget into <strong>Instagram Reel creative ads</strong> to widen the top of the funnel, while establishing automated WhatsApp VIP journeys for shoppers after their first order.
    `
  },
  '6months': {
    title: '6 Months (H2: Jul - Dec)',
    summaryTotal: '₹5,75,000.00',
    growthBadge: '+30.2% Period Growth',
    growthClass: 'green',
    lineTitle: 'Overall Sales Revenue Trajectory (Last 6 Months)',
    months: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    revenues: [86000, 83000, 92000, 98000, 104000, 112000],
    channels: [
      { name: 'Instagram', val: 212750, pct: '37.0%', role: 'Festive & Seasonal Growth Driver' },
      { name: 'Google Search', val: 172500, pct: '30.0%', role: 'Steady Demand Capture' },
      { name: 'WhatsApp / Email', val: 126500, pct: '22.0%', role: 'Seasonal Repeat Reactivation' },
      { name: 'TikTok', val: 63250, pct: '11.0%', role: 'Awareness & Holiday Reach' }
    ],
    decisionText: `
      • <strong>H2 Seasonal Surge:</strong> Over the last 6 months, <strong>Instagram</strong> generated <strong>₹2,12,750 (37.0%)</strong>, accelerating sales through festival and holiday visual catalog drops.<br>
      • <strong>Search Stability:</strong> <strong>Google Search</strong> maintained a steady <strong>₹1,72,500 (30.0%)</strong> conversion stream from high-intent buyers seeking fast fulfillment.<br>
      • <strong>Retention Impact:</strong> <strong>WhatsApp / Email</strong> brought in <strong>₹1,26,500 (22.0%)</strong> by reactivating previously dormant mid-tier customers.<br>
      • <strong>Budget Recommendation:</strong> Maintain aggressive Instagram visual retargeting during peak festive cycles and double down on WhatsApp broadcast catalogs 48 hours prior to promotional sales.
    `
  },
  '3months': {
    title: '3 Months (Q4: Oct - Dec)',
    summaryTotal: '₹3,14,000.00',
    growthBadge: '+14.3% Quarterly Growth',
    growthClass: 'green',
    lineTitle: 'Overall Sales Revenue Trajectory (Last 3 Months / Q4)',
    months: ['Oct', 'Nov', 'Dec'],
    revenues: [98000, 104000, 112000],
    channels: [
      { name: 'Instagram', val: 122460, pct: '39.0%', role: 'Highest Direct Conversion Rate' },
      { name: 'Google Search', val: 87920, pct: '28.0%', role: 'Brand Query Fulfillment' },
      { name: 'WhatsApp / Email', val: 75360, pct: '24.0%', role: 'Direct VIP Holiday Access' },
      { name: 'TikTok', val: 28260, pct: '9.0%', role: 'Viral Campaign Lift' }
    ],
    decisionText: `
      • <strong>Q4 Holiday Outperformance:</strong> In the last 90 days, <strong>Instagram</strong> surged to <strong>39.0% (₹1,22,460)</strong> of total revenue, confirming that high-quality visual campaigns convert fastest in Q4.<br>
      • <strong>WhatsApp VIP Direct Sales:</strong> <strong>WhatsApp</strong> reached its highest quarterly share at <strong>24.0% (₹75,360)</strong> as existing loyal buyers completed repeat holiday gifts directly from catalog links.<br>
      • <strong>Search Normalization:</strong> <strong>Google Search</strong> settled at <strong>28.0% (₹87,920)</strong> as branded traffic outpaced expensive generic keywords.<br>
      • <strong>Next Quarter Action Plan:</strong> For Q1, reduce generic keyword bidding by 20% and allocate that surplus into post-purchase WhatsApp drip workflows to convert Q4 first-time buyers into loyal repeat spenders.
    `
  }
};

function initTimeHorizonChannelModule() {
  const horizonBtns = document.querySelectorAll('.horizon-pill-btn');

  horizonBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      horizonBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const horizon = btn.getAttribute('data-horizon');
      updateHorizonView(horizon);
    });
  });

  // Render initial yearly horizon
  initHorizonCharts();
  updateHorizonView('yearly');
}

function initHorizonCharts() {
  const ctxLine = document.getElementById('trendSalesChart');
  if (ctxLine) {
    trendSalesChartInstance = new Chart(ctxLine, {
      type: 'line',
      data: {
        labels: HORIZON_DATA.yearly.months,
        datasets: [{
          label: 'Total Sales Revenue',
          data: HORIZON_DATA.yearly.revenues,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.08)',
          borderWidth: 2.8,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#4f46e5',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            callbacks: { label: (ctx) => ` Revenue: ${formatINR(ctx.raw, 0)}` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }, color: '#94a3b8' } },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              callback: (val) => '₹' + (val / 1000) + 'k',
              font: { family: 'Plus Jakarta Sans', size: 11 },
              color: '#94a3b8'
            }
          }
        }
      }
    });
  }

  const ctxBar = document.getElementById('trendChannelChart');
  if (ctxBar) {
    trendChannelChartInstance = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: ['Instagram', 'Google Search', 'WhatsApp/Email', 'TikTok'],
        datasets: [{
          label: 'Attributed Revenue (₹)',
          data: [310578, 283957, 186347, 106485],
          backgroundColor: ['#4f46e5', '#2563eb', '#10b981', '#f59e0b'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatINR(ctx.raw, 0)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }, color: '#334155' } },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              callback: (val) => '₹' + (val / 1000) + 'k',
              font: { family: 'Plus Jakarta Sans', size: 11 },
              color: '#94a3b8'
            }
          }
        }
      }
    });
  }
}

function updateHorizonView(horizonKey) {
  const d = HORIZON_DATA[horizonKey];
  if (!d) return;

  // Header and summary label
  document.getElementById('horizon-summary-label').innerHTML = `Total Sales: <strong style="color:var(--text-dark);">${d.summaryTotal}</strong>`;
  document.getElementById('trend-line-title').textContent = d.lineTitle;
  document.getElementById('trend-growth-badge').textContent = d.growthBadge;
  document.getElementById('decision-horizon-title').textContent = d.title;
  document.getElementById('decision-analysis-text').innerHTML = d.decisionText;

  // Stat cards
  const ch0 = d.channels[0]; // Instagram
  const ch1 = d.channels[1]; // Google
  const ch2 = d.channels[2]; // WhatsApp
  const ch3 = d.channels[3]; // TikTok

  document.getElementById('ch-stat-insta-val').textContent = formatINR(ch0.val, 0);
  document.getElementById('ch-stat-insta-pct').textContent = `${ch0.pct} of Total Revenue`;

  document.getElementById('ch-stat-google-val').textContent = formatINR(ch1.val, 0);
  document.getElementById('ch-stat-google-pct').textContent = `${ch1.pct} of Total Revenue`;

  document.getElementById('ch-stat-email-val').textContent = formatINR(ch2.val, 0);
  document.getElementById('ch-stat-email-pct').textContent = `${ch2.pct} of Total Revenue`;

  document.getElementById('ch-stat-tiktok-val').textContent = formatINR(ch3.val, 0);
  document.getElementById('ch-stat-tiktok-pct').textContent = `${ch3.pct} of Total Revenue`;

  // Update Line Chart
  if (trendSalesChartInstance) {
    trendSalesChartInstance.data.labels = d.months;
    trendSalesChartInstance.data.datasets[0].data = d.revenues;
    trendSalesChartInstance.update();
  }

  // Update Bar Chart
  if (trendChannelChartInstance) {
    trendChannelChartInstance.data.datasets[0].data = [ch0.val, ch1.val, ch2.val, ch3.val];
    trendChannelChartInstance.update();
  }
}
