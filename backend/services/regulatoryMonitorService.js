const axios = require('axios');
const crypto = require('crypto');
const db = require('../config/db');
const { createNotification } = require('./notificationService');
const { summarizeRegulatoryChange } = require('./aiService');

const REGULATORY_SOURCES = [
    {
        key: 'PSA_PSIC',
        source_name: 'PSA — Philippine Standard Industrial Classification (PSIC)',
        source_category: 'PSIC',
        source_url: 'https://psa.gov.ph/classification/psic'
    },
    {
        key: 'ARTA',
        source_name: 'ARTA — Anti-Red Tape Authority',
        source_category: 'ARTA_DILG',
        source_url: 'https://arta.gov.ph'
    },
    {
        key: 'DILG',
        source_name: 'DILG — Business Permit & Licensing Circulars',
        source_category: 'ARTA_DILG',
        source_url: 'https://dilg.gov.ph'
    },
    {
        key: 'BIR',
        source_name: 'BIR — Bureau of Internal Revenue Advisories',
        source_category: 'BIR',
        source_url: 'https://www.bir.gov.ph'
    },
    {
        key: 'BFP',
        source_name: 'BFP — Bureau of Fire Protection (RA 9514)',
        source_category: 'BFP_DOH',
        source_url: 'https://bfp.gov.ph'
    }
];

/**
 * Strip HTML tags/scripts/styles and normalize whitespace to readable text.
 */
const extractReadableText = (html = '') => {
    return String(html)
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Extract prominent year/version indicators from text (e.g., 2024, 2025, 2026).
 */
const detectVersionString = (text = '', fallback = 'Latest Web Snapshot') => {
    const years = text.match(/\b(202[0-9])\b/g);
    if (!years || years.length === 0) return fallback;
    const maxYear = Math.max(...years.map(Number));
    return `Revision / Reference ${maxYear}`;
};

/**
 * Notify all active LGU Admins and System Admins when a regulatory update is queued.
 */
const notifyAdminsOfRegulatoryUpdate = async (updateRow) => {
    try {
        const [admins] = await db.query(
            `SELECT id, full_name, email FROM users WHERE role IN ('lgu_admin', 'system_admin') AND status = 'active'`
        );
        for (const admin of admins) {
            await createNotification({
                userId: admin.id,
                type: 'REGULATORY_UPDATE',
                title: `Regulatory Update Detected: ${updateRow.source_category}`,
                message: `${updateRow.source_name}: ${updateRow.title}. Review and approve in Regulatory & PSIC Monitor.`,
                eventKey: `REG_UPDATE:${updateRow.id}:ADMIN:${admin.id}`,
                emailFn: null
            });
        }
    } catch (err) {
        console.warn('[RegulatoryMonitor] Failed to notify admins:', err.message);
    }
};

/**
 * Check all configured Philippine regulatory & PSIC sources for changes.
 * Human-in-the-loop: detected changes are saved as PENDING_REVIEW for BPLO approval.
 */
const checkAllRegulatorySources = async ({ triggeredBy = 'manual' } = {}) => {
    const results = [];
    let newUpdatesCount = 0;

    for (const src of REGULATORY_SOURCES) {
        const entry = {
            source_name: src.source_name,
            source_category: src.source_category,
            source_url: src.source_url,
            reachable: false,
            changed: false,
            detected_version: null,
            error: null
        };

        try {
            const response = await axios.get(src.source_url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'PermitEase-Roxas-RegulatoryMonitor/1.0',
                    'Accept': 'text/html,application/xhtml+xml'
                },
                validateStatus: (s) => s >= 200 && s < 400
            });

            entry.reachable = true;
            const plainText = extractReadableText(response.data).slice(0, 4000);
            const detectedVersion = detectVersionString(plainText, new Date().toISOString().slice(0, 10));
            const contentHash = crypto.createHash('sha256').update(plainText.slice(0, 1500)).digest('hex');
            entry.detected_version = detectedVersion;

            // Compare with latest recorded snapshot for this source
            const [existing] = await db.query(
                `SELECT id, content_hash, detected_version FROM regulatory_updates WHERE source_name = ? ORDER BY created_at DESC LIMIT 1`,
                [src.source_name]
            );

            const isNewOrChanged = existing.length === 0 || existing[0].content_hash !== contentHash;

            if (isNewOrChanged) {
                const aiSummary = await summarizeRegulatoryChange({
                    sourceName: src.source_name,
                    sourceCategory: src.source_category,
                    sourceUrl: src.source_url,
                    snippet: plainText.slice(0, 2500),
                    detectedVersion
                });

                const [insertRes] = await db.query(
                    `INSERT INTO regulatory_updates
                     (source_name, source_category, source_url, title, summary, ai_impact_notes, detected_version, content_hash, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW')`,
                    [
                        src.source_name,
                        src.source_category,
                        src.source_url,
                        aiSummary.title || `${src.source_name} — ${detectedVersion}`,
                        aiSummary.summary || `Snapshot captured via ${triggeredBy} check.`,
                        aiSummary.impact_notes || 'Review whether local BPLO requirements, PSIC mappings, or fee rules need updating.',
                        detectedVersion,
                        contentHash
                    ]
                );

                entry.changed = true;
                newUpdatesCount += 1;

                await notifyAdminsOfRegulatoryUpdate({
                    id: insertRes.insertId,
                    source_name: src.source_name,
                    source_category: src.source_category,
                    title: aiSummary.title || detectedVersion
                });
            }
        } catch (err) {
            entry.error = err.code || err.message;
        }

        results.push(entry);
    }

    return {
        checked_at: new Date().toISOString(),
        triggered_by: triggeredBy,
        total_sources: REGULATORY_SOURCES.length,
        new_updates_detected: newUpdatesCount,
        results
    };
};

/**
 * Parse simple CSV text (code,title,section,division,industry_category,keywords)
 * and upsert into psic_codes.
 */
const importPsicCsvRows = async (csvText, sourceVersion = 'PSA PSIC CSV Import', autoApprove = false, actorUserId = null) => {
    const lines = String(csvText || '')
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const status = autoApprove ? 'ACTIVE' : 'PENDING_APPROVAL';

    for (let i = 0; i < lines.length; i++) {
        // Basic CSV split supporting quoted commas
        const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
            ? lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim())
            : [];

        if (cols.length < 2) {
            skipped++;
            continue;
        }
        // Skip header row
        if (i === 0 && cols[0].toLowerCase() === 'code') {
            continue;
        }

        const [code, title, section = null, division = null, industry_category = 'Others', keywords = null] = cols;
        if (!code || !title || code.length > 20) {
            skipped++;
            continue;
        }

        const [existing] = await db.query('SELECT id FROM psic_codes WHERE code = ?', [code]);
        if (existing.length === 0) {
            await db.query(
                `INSERT INTO psic_codes (code, title, section, division, industry_category, mapped_requirement_keywords, source_version, status, approved_by, approved_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    code,
                    title.slice(0, 255),
                    section ? section.slice(0, 120) : null,
                    division ? division.slice(0, 180) : null,
                    industry_category || 'Others',
                    keywords || null,
                    sourceVersion,
                    status,
                    autoApprove ? actorUserId : null,
                    autoApprove ? new Date() : null
                ]
            );
            inserted++;
        } else {
            await db.query(
                `UPDATE psic_codes
                 SET title = ?, section = COALESCE(?, section), division = COALESCE(?, division),
                     industry_category = ?, mapped_requirement_keywords = COALESCE(?, mapped_requirement_keywords),
                     source_version = ?, status = ?
                 WHERE code = ?`,
                [
                    title.slice(0, 255),
                    section ? section.slice(0, 120) : null,
                    division ? division.slice(0, 180) : null,
                    industry_category || 'Others',
                    keywords || null,
                    sourceVersion,
                    status,
                    code
                ]
            );
            updated++;
        }
    }

    return { inserted, updated, skipped, status };
};

/**
 * Fetch active PSIC codes for AI grounding and deterministic matching.
 */
const getActivePsicCodes = async () => {
    try {
        const [rows] = await db.query(
            `SELECT code, title, section, industry_category, mapped_requirement_keywords, source_version
             FROM psic_codes WHERE status = 'ACTIVE' ORDER BY code ASC`
        );
        return rows || [];
    } catch (err) {
        return [];
    }
};

/**
 * Match a business object/text against active PSIC codes deterministically.
 */
const matchPsicCodeDeterministically = (biz, activePsicCodes = []) => {
    if (!Array.isArray(activePsicCodes) || activePsicCodes.length === 0) return null;

    const text = (
        (typeof biz === 'object' && biz !== null)
            ? `${biz.business_name || ''} ${biz.business_type || ''} ${biz.industry_category || ''} ${biz.business_description || ''} ${biz.primary_products || ''} ${biz._textSummary || ''}`
            : String(biz || '')
    ).toLowerCase();

    let bestMatch = null;
    let bestScore = 0;

    for (const row of activePsicCodes) {
        let score = 0;
        const keywords = String(row.mapped_requirement_keywords || '')
            .split(',')
            .map(k => k.trim().toLowerCase())
            .filter(Boolean);

        for (const kw of keywords) {
            if (text.includes(kw)) score += 3;
        }
        const titleWords = String(row.title || '').toLowerCase().split(/\W+/).filter(w => w.length > 4);
        for (const w of titleWords) {
            if (text.includes(w)) score += 1;
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = row;
        }
    }

    return bestScore > 0 ? bestMatch : null;
};

module.exports = {
    REGULATORY_SOURCES,
    checkAllRegulatorySources,
    importPsicCsvRows,
    getActivePsicCodes,
    matchPsicCodeDeterministically
};
