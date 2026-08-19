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

  for (const rule of rules) {
    const { applicable } = evaluateCondition(rule, business, appTypeStatus);
    if (!applicable) continue;

    const item = {
      id: rule.id,
      name: rule.name,
      category: rule.category,
      basis: rule.basis,
      status: 'calculated', // 'calculated' | 'incomplete'
      amount: null,
      reason: null,
    };

    if (rule.basis === 'fixed') {
      const amount = Math.round(parseFloat(rule.fixed_amount) * 100) / 100;
      item.amount = amount;
      runningTotal += amount;
    } else {
      const fieldName = BASIS_TO_FIELD[rule.basis];
      if (!fieldName) {
        // Unknown basis — skip with a note
        item.status = 'incomplete';
        item.reason = `Unknown calculation basis "${rule.basis}".`;
        isIncomplete = true;
        missingReasons.push(item.reason);
      } else if (isMissing(business[fieldName])) {
        item.status = 'incomplete';
        const humanField = fieldName.replace(/_/g, ' ');
        item.reason = `${humanField.charAt(0).toUpperCase() + humanField.slice(1)} information is required to calculate this fee.`;
        isIncomplete = true;
        missingReasons.push(`${rule.name}: ${item.reason}`);
      } else {
        const amount = safeMul(business[fieldName], rule.rate);
        item.amount = amount;
        runningTotal += amount;
      }
    }

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
