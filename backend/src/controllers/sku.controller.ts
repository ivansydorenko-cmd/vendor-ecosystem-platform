import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const getAllSkus = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, category_id, tenant_id, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let queryText = `
      SELECT s.id, s.tenant_id, s.category_id, s.sku_code, s.name, s.description,
             s.current_price, s.estimated_duration_minutes, s.status, s.is_addon_allowed,
             s.created_at, s.updated_at,
             c.name as category_name,
             t.name as tenant_name
      FROM skus s
      LEFT JOIN service_categories c ON s.category_id = c.id
      LEFT JOIN tenants t ON s.tenant_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (category_id) {
      queryText += ` AND s.category_id = $${paramCount}`;
      params.push(category_id);
      paramCount++;
    }

    if (tenant_id) {
      queryText += ` AND s.tenant_id = $${paramCount}`;
      params.push(tenant_id);
      paramCount++;
    }

    if (status) {
      queryText += ` AND s.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    queryText += ` ORDER BY s.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(Number(limit), offset);

    const result = await query(queryText, params);

    let countQuery = 'SELECT COUNT(*) FROM skus s WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (category_id) {
      countQuery += ` AND s.category_id = $${countParamIndex}`;
      countParams.push(category_id);
      countParamIndex++;
    }

    if (tenant_id) {
      countQuery += ` AND s.tenant_id = $${countParamIndex}`;
      countParams.push(tenant_id);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND s.status = $${countParamIndex}`;
      countParams.push(status);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      skus: result.rows,
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total: total,
        total_pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get all SKUs error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching SKUs',
      },
    });
  }
};

export const getSkuById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT s.id, s.tenant_id, s.category_id, s.sku_code, s.name, s.description,
              s.current_price, s.estimated_duration_minutes, s.status, s.is_addon_allowed,
              s.created_at, s.updated_at,
              c.name as category_name,
              t.name as tenant_name
       FROM skus s
       LEFT JOIN service_categories c ON s.category_id = c.id
       LEFT JOIN tenants t ON s.tenant_id = t.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'SKU_NOT_FOUND',
          message: 'SKU not found',
        },
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    logger.error('Get SKU by ID error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching SKU',
      },
    });
  }
};

export const createSku = async (req: Request, res: Response) => {
  const client = await getClient();

  try {
    const {
      tenant_id,
      category_id,
      sku_code,
      name,
      description,
      current_price,
      estimated_duration_minutes,
      is_addon_allowed,
    } = req.body;

    if (!category_id || !sku_code || !name || current_price === undefined) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: category_id, sku_code, name, current_price',
        },
      });
    }

    const categoryExists = await query(
      'SELECT id FROM service_categories WHERE id = $1',
      [category_id]
    );

    if (categoryExists.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Service category not found',
        },
      });
    }

    if (tenant_id) {
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
    }

    const existingSku = await query(
      'SELECT id FROM skus WHERE tenant_id IS NOT DISTINCT FROM $1 AND sku_code = $2',
      [tenant_id || null, sku_code]
    );

    if (existingSku.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'SKU_CODE_EXISTS',
          message: 'A SKU with this code already exists for this tenant',
        },
      });
    }

    await client.query('BEGIN');

    const skuId = uuidv4();

    const result = await client.query(
      `INSERT INTO skus (id, tenant_id, category_id, sku_code, name, description, 
                         current_price, estimated_duration_minutes, is_addon_allowed, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
       RETURNING id, tenant_id, category_id, sku_code, name, description, 
                 current_price, estimated_duration_minutes, is_addon_allowed, status, created_at`,
      [
        skuId,
        tenant_id || null,
        category_id,
        sku_code,
        name,
        description || null,
        current_price,
        estimated_duration_minutes || null,
        is_addon_allowed || false,
      ]
    );

    const priceHistoryId = uuidv4();
    await client.query(
      `INSERT INTO sku_price_history (id, sku_id, price, effective_date, reason)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'Initial price')`,
      [priceHistoryId, skuId, current_price]
    );

    await client.query('COMMIT');

    logger.info('SKU created:', { skuId, sku_code });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Create SKU error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while creating SKU',
      },
    });
  } finally {
    client.release();
  }
};

export const updateSku = async (req: Request, res: Response) => {
  const client = await getClient();

  try {
    const { id } = req.params;
    const {
      name,
      description,
      current_price,
      estimated_duration_minutes,
      status,
      is_addon_allowed,
    } = req.body;

    const existingSku = await query('SELECT * FROM skus WHERE id = $1', [id]);

    if (existingSku.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'SKU_NOT_FOUND',
          message: 'SKU not found',
        },
      });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (current_price !== undefined) {
      updates.push(`current_price = $${paramCount}`);
      values.push(current_price);
      paramCount++;
    }

    if (estimated_duration_minutes !== undefined) {
      updates.push(`estimated_duration_minutes = $${paramCount}`);
      values.push(estimated_duration_minutes);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (is_addon_allowed !== undefined) {
      updates.push(`is_addon_allowed = $${paramCount}`);
      values.push(is_addon_allowed);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_UPDATES',
          message: 'No fields to update',
        },
      });
    }

    await client.query('BEGIN');

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `
      UPDATE skus
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, tenant_id, category_id, sku_code, name, description,
                current_price, estimated_duration_minutes, is_addon_allowed, status,
                created_at, updated_at
    `;

    const result = await client.query(updateQuery, values);

    if (current_price !== undefined && current_price !== existingSku.rows[0].current_price) {
      const priceHistoryId = uuidv4();
      await client.query(
        `INSERT INTO sku_price_history (id, sku_id, price, effective_date, reason)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'Price updated')`,
        [priceHistoryId, id, current_price]
      );
    }

    await client.query('COMMIT');

    logger.info('SKU updated:', { skuId: id });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Update SKU error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating SKU',
      },
    });
  } finally {
    client.release();
  }
};

export const getSkuPriceHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const skuExists = await query('SELECT id FROM skus WHERE id = $1', [id]);

    if (skuExists.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'SKU_NOT_FOUND',
          message: 'SKU not found',
        },
      });
    }

    const result = await query(
      `SELECT id, sku_id, price, effective_date, reason, created_at
       FROM sku_price_history
       WHERE sku_id = $1
       ORDER BY effective_date DESC`,
      [id]
    );

    res.status(200).json({
      sku_id: id,
      price_history: result.rows,
    });
  } catch (error) {
    logger.error('Get SKU price history error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching price history',
      },
    });
  }
};
