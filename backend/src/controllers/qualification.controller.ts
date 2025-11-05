import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const qualifyVendor = async (req: Request, res: Response) => {
  try {
    const { vendor_id, tenant_id, notes } = req.body;
    const qualified_by = req.user?.id;

    if (!vendor_id || !tenant_id) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'vendor_id and tenant_id are required',
        },
      });
    }

    const vendorExists = await query(
      'SELECT id FROM vendors WHERE id = $1',
      [vendor_id]
    );

    if (vendorExists.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'VENDOR_NOT_FOUND',
          message: 'Vendor not found',
        },
      });
    }

    const tenantExists = await query(
      'SELECT id FROM tenants WHERE id = $1',
      [tenant_id]
    );

    if (tenantExists.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Tenant not found',
        },
      });
    }

    const existing = await query(
      'SELECT id, status FROM vendor_tenant_qualifications WHERE vendor_id = $1 AND tenant_id = $2',
      [vendor_id, tenant_id]
    );

    let result;

    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE vendor_tenant_qualifications
         SET status = 'qualified', qualified_at = CURRENT_TIMESTAMP,
             qualified_by = $1, notes = $2, updated_at = CURRENT_TIMESTAMP,
             disqualified_at = NULL, disqualified_by = NULL, disqualification_reason = NULL
         WHERE vendor_id = $3 AND tenant_id = $4
         RETURNING *`,
        [qualified_by, notes || null, vendor_id, tenant_id]
      );
    } else {
      const qualificationId = uuidv4();
      result = await query(
        `INSERT INTO vendor_tenant_qualifications 
         (id, vendor_id, tenant_id, status, qualified_at, qualified_by, notes)
         VALUES ($1, $2, $3, 'qualified', CURRENT_TIMESTAMP, $4, $5)
         RETURNING *`,
        [qualificationId, vendor_id, tenant_id, qualified_by, notes || null]
      );
    }

    logger.info('Vendor qualified:', { vendor_id, tenant_id, qualified_by });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    logger.error('Qualify vendor error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while qualifying vendor',
      },
    });
  }
};

export const disqualifyVendor = async (req: Request, res: Response) => {
  try {
    const { vendor_id, tenant_id, reason } = req.body;
    const disqualified_by = req.user?.id;

    if (!vendor_id || !tenant_id || !reason) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'vendor_id, tenant_id, and reason are required',
        },
      });
    }

    const existing = await query(
      'SELECT id FROM vendor_tenant_qualifications WHERE vendor_id = $1 AND tenant_id = $2',
      [vendor_id, tenant_id]
    );

    let result;

    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE vendor_tenant_qualifications
         SET status = 'disqualified', disqualified_at = CURRENT_TIMESTAMP,
             disqualified_by = $1, disqualification_reason = $2, updated_at = CURRENT_TIMESTAMP
         WHERE vendor_id = $3 AND tenant_id = $4
         RETURNING *`,
        [disqualified_by, reason, vendor_id, tenant_id]
      );
    } else {
      const qualificationId = uuidv4();
      result = await query(
        `INSERT INTO vendor_tenant_qualifications 
         (id, vendor_id, tenant_id, status, disqualified_at, disqualified_by, disqualification_reason)
         VALUES ($1, $2, $3, 'disqualified', CURRENT_TIMESTAMP, $4, $5)
         RETURNING *`,
        [qualificationId, vendor_id, tenant_id, disqualified_by, reason]
      );
    }

    logger.info('Vendor disqualified:', { vendor_id, tenant_id, reason, disqualified_by });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    logger.error('Disqualify vendor error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while disqualifying vendor',
      },
    });
  }
};

export const getVendorQualifications = async (req: Request, res: Response) => {
  try {
    const { vendor_id } = req.params;

    const result = await query(
      `SELECT vtq.*, t.name as tenant_name, 
              u1.email as qualified_by_email, u2.email as disqualified_by_email
       FROM vendor_tenant_qualifications vtq
       LEFT JOIN tenants t ON vtq.tenant_id = t.id
       LEFT JOIN users u1 ON vtq.qualified_by = u1.id
       LEFT JOIN users u2 ON vtq.disqualified_by = u2.id
       WHERE vtq.vendor_id = $1
       ORDER BY vtq.created_at DESC`,
      [vendor_id]
    );

    res.status(200).json({
      vendor_id,
      qualifications: result.rows,
    });
  } catch (error) {
    logger.error('Get vendor qualifications error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching vendor qualifications',
      },
    });
  }
};

export const getTenantQualifiedVendors = async (req: Request, res: Response) => {
  try {
    const { tenant_id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let queryText = `
      SELECT vtq.*, v.company_name, v.business_email, v.business_phone
      FROM vendor_tenant_qualifications vtq
      INNER JOIN vendors v ON vtq.vendor_id = v.id
      WHERE vtq.tenant_id = $1
    `;
    const params: any[] = [tenant_id];
    let paramCount = 2;

    if (status) {
      queryText += ` AND vtq.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    queryText += ` ORDER BY vtq.updated_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(Number(limit), offset);

    const result = await query(queryText, params);

    let countQuery = `
      SELECT COUNT(*) FROM vendor_tenant_qualifications vtq
      WHERE vtq.tenant_id = $1
    `;
    const countParams: any[] = [tenant_id];

    if (status) {
      countQuery += ' AND vtq.status = $2';
      countParams.push(status);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      tenant_id,
      vendors: result.rows,
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total: total,
        total_pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get tenant qualified vendors error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching qualified vendors',
      },
    });
  }
};

export const getPendingQualifications = async (req: Request, res: Response) => {
  try {
    const { tenant_id } = req.query;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let queryText = `
      SELECT vtq.*, v.company_name, v.business_email, t.name as tenant_name
      FROM vendor_tenant_qualifications vtq
      INNER JOIN vendors v ON vtq.vendor_id = v.id
      INNER JOIN tenants t ON vtq.tenant_id = t.id
      WHERE vtq.status = 'pending'
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (tenant_id) {
      queryText += ` AND vtq.tenant_id = $${paramCount}`;
      params.push(tenant_id);
      paramCount++;
    }

    queryText += ` ORDER BY vtq.created_at ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(Number(limit), offset);

    const result = await query(queryText, params);

    let countQuery = 'SELECT COUNT(*) FROM vendor_tenant_qualifications WHERE status = \'pending\'';
    const countParams: any[] = [];

    if (tenant_id) {
      countQuery += ' AND tenant_id = $1';
      countParams.push(tenant_id);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      pending_qualifications: result.rows,
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total: total,
        total_pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get pending qualifications error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching pending qualifications',
      },
    });
  }
};
