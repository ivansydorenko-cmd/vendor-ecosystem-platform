import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import logger from '../utils/logger';

/**
 * Addon Controller
 * Manages add-on SKU relationships for the platform
 */

/**
 * Create a new add-on relationship between a parent SKU and an add-on SKU
 * POST /api/v1/addons
 * Body: { parent_sku_id, addon_sku_id, is_auto_approved }
 */
export const createAddonRelationship = async (req: Request, res: Response): Promise<void> => {
  const client = await getClient();
  
  try {
    const { parent_sku_id, addon_sku_id, is_auto_approved = true } = req.body;

    // Validation
    if (!parent_sku_id || !addon_sku_id) {
      res.status(400).json({
        success: false,
        error: 'parent_sku_id and addon_sku_id are required'
      });
      return;
    }

    if (parent_sku_id === addon_sku_id) {
      res.status(400).json({
        success: false,
        error: 'A SKU cannot be an add-on to itself'
      });
      return;
    }

    await client.query('BEGIN');

    // Check if both SKUs exist
    const skuCheck = await client.query(
      `SELECT id, sku_code, name, status FROM skus WHERE id = ANY($1)`,
      [[parent_sku_id, addon_sku_id]]
    );

    if (skuCheck.rows.length !== 2) {
      await client.query('ROLLBACK');
      res.status(404).json({
        success: false,
        error: 'One or both SKUs not found'
      });
      return;
    }

    const parentSku = skuCheck.rows.find((s: any) => s.id === parent_sku_id);
    const addonSku = skuCheck.rows.find((s: any) => s.id === addon_sku_id);

    if (parentSku?.status !== 'active' || addonSku?.status !== 'active') {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: 'Both SKUs must be active'
      });
      return;
    }

    // Check if relationship already exists
    const existingCheck = await client.query(
      `SELECT id FROM addon_skus WHERE parent_sku_id = $1 AND addon_sku_id = $2`,
      [parent_sku_id, addon_sku_id]
    );

    if (existingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(409).json({
        success: false,
        error: 'This add-on relationship already exists'
      });
      return;
    }

    // Insert the add-on relationship
    const insertResult = await client.query(
      `INSERT INTO addon_skus (parent_sku_id, addon_sku_id, is_auto_approved, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [parent_sku_id, addon_sku_id, is_auto_approved]
    );

    await client.query('COMMIT');

    logger.info(`Add-on relationship created: ${parentSku.sku_code} -> ${addonSku.sku_code}`);

    res.status(201).json({
      success: true,
      data: {
        ...insertResult.rows[0],
        parent_sku: parentSku,
        addon_sku: addonSku
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating add-on relationship:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create add-on relationship'
    });
  } finally {
    client.release();
  }
};

/**
 * Get all add-ons for a specific SKU
 * GET /api/v1/addons/sku/:id
 */
export const getAddonsForSku = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if parent SKU exists
    const skuCheck = await query(
      `SELECT id, sku_code, name FROM skus WHERE id = $1`,
      [id]
    );

    if (skuCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Parent SKU not found'
      });
      return;
    }

    // Get all add-ons for this SKU
    const result = await query(
      `SELECT 
        a.id,
        a.parent_sku_id,
        a.addon_sku_id,
        a.is_auto_approved,
        a.created_at,
        s.sku_code as addon_sku_code,
        s.name as addon_name,
        s.description as addon_description,
        s.current_price as addon_price,
        s.status as addon_status,
        sc.name as addon_category
       FROM addon_skus a
       JOIN skus s ON a.addon_sku_id = s.id
       LEFT JOIN service_categories sc ON s.category_id = sc.id
       WHERE a.parent_sku_id = $1
       ORDER BY s.name ASC`,
      [id]
    );

    res.status(200).json({
      success: true,
      data: {
        parent_sku: skuCheck.rows[0],
        addons: result.rows,
        count: result.rows.length
      }
    });

  } catch (error) {
    logger.error('Error fetching add-ons:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch add-ons'
    });
  }
};

/**
 * Delete an add-on relationship
 * DELETE /api/v1/addons/:id
 */
export const deleteAddonRelationship = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if relationship exists
    const existingCheck = await query(
      `SELECT a.id, ps.sku_code as parent_sku_code, ads.sku_code as addon_sku_code
       FROM addon_skus a
       JOIN skus ps ON a.parent_sku_id = ps.id
       JOIN skus ads ON a.addon_sku_id = ads.id
       WHERE a.id = $1`,
      [id]
    );

    if (existingCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Add-on relationship not found'
      });
      return;
    }

    const relationship = existingCheck.rows[0];

    // Delete the relationship
    await query(
      `DELETE FROM addon_skus WHERE id = $1`,
      [id]
    );

    logger.info(`Add-on relationship deleted: ${relationship.parent_sku_code} -> ${relationship.addon_sku_code}`);

    res.status(200).json({
      success: true,
      message: 'Add-on relationship deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting add-on relationship:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete add-on relationship'
    });
  }
};

/**
 * Toggle auto-approval for an add-on relationship
 * PATCH /api/v1/addons/:id/approval
 * Body: { is_auto_approved: boolean }
 */
export const toggleAutoApproval = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_auto_approved } = req.body;

    if (typeof is_auto_approved !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'is_auto_approved must be a boolean value'
      });
      return;
    }

    // Check if relationship exists
    const existingCheck = await query(
      `SELECT id FROM addon_skus WHERE id = $1`,
      [id]
    );

    if (existingCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Add-on relationship not found'
      });
      return;
    }

    // Update is_auto_approved setting
    const result = await query(
      `UPDATE addon_skus 
       SET is_auto_approved = $1
       WHERE id = $2
       RETURNING *`,
      [is_auto_approved, id]
    );

    logger.info(`Add-on auto-approval toggled: ${id} -> ${is_auto_approved}`);

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error toggling auto-approval:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle auto-approval'
    });
  }
};

/**
 * Get all add-on relationships (admin)
 * GET /api/v1/addons
 * Query params: ?parent_sku_id=xxx&addon_sku_id=xxx&is_auto_approved=true
 */
export const getAllAddonRelationships = async (req: Request, res: Response): Promise<void> => {
  try {
    const { parent_sku_id, addon_sku_id, is_auto_approved } = req.query;

    let queryText = `
      SELECT 
        a.id,
        a.parent_sku_id,
        a.addon_sku_id,
        a.is_auto_approved,
        a.created_at,
        ps.sku_code as parent_sku_code,
        ps.name as parent_sku_name,
        ads.sku_code as addon_sku_code,
        ads.name as addon_name,
        ads.current_price as addon_price
      FROM addon_skus a
      JOIN skus ps ON a.parent_sku_id = ps.id
      JOIN skus ads ON a.addon_sku_id = ads.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (parent_sku_id) {
      queryText += ` AND a.parent_sku_id = $${paramCount}`;
      params.push(parent_sku_id);
      paramCount++;
    }

    if (addon_sku_id) {
      queryText += ` AND a.addon_sku_id = $${paramCount}`;
      params.push(addon_sku_id);
      paramCount++;
    }

    if (is_auto_approved !== undefined) {
      queryText += ` AND a.is_auto_approved = $${paramCount}`;
      params.push(is_auto_approved === 'true');
      paramCount++;
    }

    queryText += ` ORDER BY ps.sku_code, ads.sku_code`;

    const result = await query(queryText, params);

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    logger.error('Error fetching all add-on relationships:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch add-on relationships'
    });
  }
};