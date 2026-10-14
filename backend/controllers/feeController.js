const db = require('../config/db');

/**
 * Maps a basis field name to the business object's property
 */
const BASIS_TO_FIELD = {
  capitalization: 'capitalization',
  gross_sales: 'gross_sales',
  floor_area: 'floor_area',
};

/**
 * Maps application_type from the applications table to business_status
 * values used in tax_fee_rules condition_value
 */
const APP_TYPE_TO_STATUS = {
  NEW: 'New Application',
  RENEWAL: 'Renewal',
};

/**
 * Safe multiplication using parseFloat to avoid JS floating-point surprises,
 * then round to 2 decimal places.
 */
function safeMul(a, b) {
  return Math.round(parseFloat(a) * parseFloat(b) * 100) / 100;
}

/**
 * Check whether the business has a valid (non-null, non-zero) value for a given field.
 */
function isMissing(value) {
  return value === null || value === undefined || parseFloat(value) <= 0;
}

/**
 * Evaluate a single rule against the business profile.
 * Returns { applicable: boolean, reason?: string } 
 */
function evaluateCondition(rule, business, appTypeStatus) {
  const cf = rule.condition_field;
  const cv = rule.condition_value;

  if (!cf || cf === 'always' || cf === '') return { applicable: true };

  if (cf === 'industry_category') {
    return { applicable: business.industry_category === cv };
  }

  if (cf === 'business_status') {
    return { applicable: appTypeStatus === cv };
  }

  // Unknown condition — be conservative and skip
  return { applicable: false };
}

/**
 * CORE LOGIC
 * Extracts the calculation logic so it can be used by both the 
 * pre-application readiness assessment and the actual application fee endpoint.
 */
function calculateFeesCore(business, appTypeStatus, rules) {
  const breakdown = [];
  const missingReasons = [];
  let runningTotal = 0;
  let isIncomplete = false;

  // Separate non-BFP rules from BFP rules (which depend on LGU regulatory fees subtotal)
  const regularRules = [];
  const bfpRules = [];

  for (const rule of rules) {
    const { applicable } = evaluateCondition(rule, business, appTypeStatus);
    if (!applicable) continue;

    if (rule.basis === 'bfp_fsic') {
      bfpRules.push(rule);
    } else {
      regularRules.push(rule);
    }
  }

  // PASS 1: Calculate standard fixed and basis-based rules
  for (const rule of regularRules) {
    const item = {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      category: rule.category,
      basis: rule.basis,
      rate: rule.rate,
      fixed_amount: rule.fixed_amount,
      verification_status: rule.verification_status || 'unverified',
      source_reference: rule.source_reference || null,
      notes: rule.notes || null,
      status: 'calculated', // 'calculated' | 'incomplete'
      amount: null,
      reason: null,
      calculation_details: null
    };

    if (rule.basis === 'fixed') {
      const amount = Math.round(parseFloat(rule.fixed_amount) * 100) / 100;
      item.amount = amount;
      item.calculation_details = `Standard fixed regulatory fee: ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
      runningTotal += amount;
    } else {
      const fieldName = BASIS_TO_FIELD[rule.basis];
      if (!fieldName) {
        item.status = 'incomplete';
        item.reason = `Unknown calculation basis "${rule.basis}".`;
        isIncomplete = true;
        missingReasons.push(item.reason);
      } else if (isMissing(business[fieldName])) {
        item.status = 'incomplete';
        const humanField = fieldName.replace(/_/g, ' ');
        item.reason = `${humanField.charAt(0).toUpperCase() + humanField.slice(1)} information is required to calculate this item.`;
        isIncomplete = true;
        missingReasons.push(`${rule.name}: ${item.reason}`);
      } else {
        const rawValue = parseFloat(business[fieldName]);
        let effectiveRate = parseFloat(rule.rate || 0);

        // RA 7160 Sec. 143(d) adjustment for Retailers:
        // For gross_sales > 400,000, statutory ceiling is 1% (0.01) instead of 2% (0.02)
        let noteExtra = '';
        if (rule.category === 'Business Tax' && rule.basis === 'gross_sales' && business.industry_category === 'Retail') {
          if (rawValue > 400000) {
            effectiveRate = 0.01;
            noteExtra = ' (Retail rate of 1.00% applied for gross receipts > ₱400,000 per RA 7160 Sec. 143(d))';
          }
        }

        const amount = safeMul(rawValue, effectiveRate);
        item.amount = amount;
        item.rate = effectiveRate;
        if (rule.basis === 'floor_area') {
          item.calculation_details = `₱${effectiveRate.toFixed(2)} per sqm × ${rawValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })} sqm floor area = ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
        } else {
          item.calculation_details = `${(effectiveRate * 100).toFixed(effectiveRate < 0.01 ? 3 : 2)}% of ₱${rawValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })} ${fieldName.replace(/_/g, ' ')}${noteExtra}`;
        }
        runningTotal += amount;
      }
    }

    breakdown.push(item);
  }

  // Calculate LGU Regulatory Fees Subtotal (excluding Business Tax) for BFP assessment
  const lguRegulatorySubtotal = breakdown
    .filter(i => !i.category || !i.category.toLowerCase().includes('tax'))
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  // PASS 2: Calculate BFP Fire Safety Inspection Fee per RA 9514 IRR Rule 12
  // FSIF = 15% of all LGU regulatory fees with statutory minimum floor (₱500.00)
  for (const rule of bfpRules) {
    const minFloor = parseFloat(rule.fixed_amount || 500);
    const bfpRate = parseFloat(rule.rate || 0.15);
    const computedPercentage = safeMul(lguRegulatorySubtotal, bfpRate);
    const finalAmount = Math.max(minFloor, computedPercentage);

    const item = {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      category: rule.category,
      basis: rule.basis,
      rate: bfpRate,
      fixed_amount: minFloor,
      verification_status: rule.verification_status || 'partially_verified',
      source_reference: rule.source_reference || 'RA 9514 Sec. 12(b)(1); IRR Rule 12',
      notes: rule.notes || null,
      status: 'calculated',
      amount: finalAmount,
      reason: null,
      calculation_details: computedPercentage < minFloor 
        ? `${(bfpRate * 100).toFixed(0)}% of ₱${lguRegulatorySubtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })} LGU regulatory fees = ₱${computedPercentage.toFixed(2)} (Statutory minimum floor ₱${minFloor.toFixed(2)} applied per RA 9514)`
        : `${(bfpRate * 100).toFixed(0)}% of ₱${lguRegulatorySubtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })} LGU regulatory fees = ₱${finalAmount.toFixed(2)} per RA 9514`
    };

    runningTotal += finalAmount;
    breakdown.push(item);
  }

  // Group by category for the summary response
  const summary = {};
  for (const item of breakdown) {
    if (!summary[item.category]) {
      summary[item.category] = { items: [], subtotal: 0, hasIncomplete: false };
    }
    summary[item.category].items.push(item);
    if (item.status === 'calculated') {
      summary[item.category].subtotal += item.amount;
    } else {
      summary[item.category].hasIncomplete = true;
    }
  }

  const totalEstimatedAmount = Math.round(runningTotal * 100) / 100;

  return {
    breakdown,
    summary,
    total_estimated_amount: totalEstimatedAmount,
    is_incomplete: isIncomplete,
    missing_info_reasons: missingReasons,
    disclaimer: 'Estimated amount based on the business information and applicable fee rules currently configured in the system. Final fees may be subject to LGU assessment.',
  };
}

/**
 * GET /api/applications/:id/fees
 * 
 * Calculates an estimated fee breakdown for a given permit application.
 * Business Owner: can only access their own applications.
 * LGU Admin / System Admin: can access any application.
 */
async function calculateApplicationFees(req, res) {
  try {
    const appId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const role = req.user.role;

    // 1. Load the application
    const [[app]] = await db.query(
      `SELECT a.*, b.business_name, b.business_type, b.industry_category,
              b.address, b.capitalization, b.gross_sales, b.floor_area,
              b.business_status, b.employees
       FROM applications a
       JOIN businesses b ON a.business_id = b.id
       WHERE a.id = ?`,
      [appId]
    );

    if (!app) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // 2. RBAC: business owners can only see their own
    if (role === 'business_owner' && app.user_id !== userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // 3. Load all active tax/fee rules
    const [rules] = await db.query(
      'SELECT * FROM tax_fee_rules WHERE is_active = 1 ORDER BY category, id'
    );

    // 4. Map application_type to business_status vocabulary used in rules
    const appTypeStatus = APP_TYPE_TO_STATUS[app.application_type] || app.application_type;

    // 5. Use shared calculation engine
    const feeData = calculateFeesCore(app, appTypeStatus, rules);

    res.json({
      application_id: appId,
      application_number: app.application_number || 'DRAFT',
      business_name: app.business_name,
      application_type: app.application_type,
      ...feeData
    });
  } catch (err) {
    console.error('[feeController] calculateApplicationFees error:', err);
    res.status(500).json({ message: 'Unable to calculate the estimated permit cost.' });
  }
}

module.exports = { calculateApplicationFees, calculateFeesCore, APP_TYPE_TO_STATUS };
