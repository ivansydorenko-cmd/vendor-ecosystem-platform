import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import logger from '../utils/logger';

function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const createWorkOrder = async (req: Request, res: Response) => {
  const client = await getClient();

  try {
    const {
      tenant_id,
      created_by,
      sku_id,
      title,
      description,
      priority,
      address,
      zipcode,
      latitude,
      longitude,
      customer_name,
      customer_phone,
      customer_email,
      preferred_date,
      preferred_time_start,
      preferred_time_end,
      vendor_selection_method,
    } = req.body;

    if (!tenant_id || !created_by || !sku_id || !title || !address || !zipcode || !preferred_date || !preferred_time_start) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
        },
      });
    }

    const skuResult = await query('SELECT * FROM skus WHERE id = $1', [sku_id]);
    if (skuResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'SKU_NOT_FOUND',
          message: 'SKU not found',
        },
      });
    }

    const sku = skuResult.rows[0];

    await client.query('BEGIN');

    const workOrderId = generateUuid();

    const woResult = await client.query(
      'INSERT INTO work_orders (id, tenant_id, created_by, sku_id, title, description, priority, address, zipcode, latitude, longitude, customer_name, customer_phone, customer_email, preferred_date, preferred_time_start, preferred_time_end, vendor_selection_method, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, \'created\') RETURNING *',
      [
        workOrderId,
        tenant_id,
        created_by,
        sku_id,
        title,
        description || null,
        priority || 'medium',
        address,
        zipcode,
        latitude || null,
        longitude || null,
        customer_name || null,
        customer_phone || null,
        customer_email || null,
        preferred_date,
        preferred_time_start,
        preferred_time_end || null,
        vendor_selection_method || 'auto_notify',
      ]
    );

    const lineItemId = generateUuid();
    await client.query(
      'INSERT INTO work_order_line_items (id, work_order_id, sku_id, quantity, unit_price, total_price, is_addon, status) VALUES ($1, $2, $3, 1, $4, $4, false, \'pending\')',
      [lineItemId, workOrderId, sku_id, sku.current_price]
    );

    await client.query('COMMIT');

    logger.info('Work order created:', { workOrderId, title });

    res.status(201).json({
      id: workOrderId,
      ...woResult.rows[0],
      total_amount: parseFloat(sku.current_price),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Create work order error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while creating work order',
      },
    });
  } finally {
    client.release();
  }
};

export const getAvailableWorkOrders = async (req: Request, res: Response) => {
  try {
    const { vendor_id } = req.query;

    if (!vendor_id) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'vendor_id is required',
        },
      });
    }

    const vendorZips = await query(
      'SELECT zipcode FROM vendor_service_areas_zipcodes WHERE vendor_id = $1',
      [vendor_id]
    );

    const zipcodes = vendorZips.rows.map(r => r.zipcode);

    if (zipcodes.length === 0) {
      return res.status(200).json({
        work_orders: [],
        total: 0,
      });
    }

    const result = await query(
      'SELECT wo.id, wo.title, wo.description, wo.priority, wo.zipcode, wo.preferred_date, wo.preferred_time_start, wo.preferred_time_end, wo.status, wo.created_at, s.sku_code, s.name as sku_name, s.current_price FROM work_orders wo JOIN skus s ON wo.sku_id = s.id WHERE wo.status = \'created\' AND wo.zipcode = ANY($1) ORDER BY wo.created_at DESC',
      [zipcodes]
    );

    res.status(200).json({
      work_orders: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    logger.error('Get available work orders error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching available work orders',
      },
    });
  }
};

export const acceptWorkOrder = async (req: Request, res: Response) => {
  const client = await getClient();

  try {
    const { id } = req.params;
    const { vendor_id, notes } = req.body;

    if (!vendor_id) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'vendor_id is required',
        },
      });
    }

    await client.query('BEGIN');

    const woResult = await client.query(
      'SELECT * FROM work_orders WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (woResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: {
          code: 'WORK_ORDER_NOT_FOUND',
          message: 'Work order not found',
        },
      });
    }

    const workOrder = woResult.rows[0];

    if (workOrder.status !== 'created') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: {
          code: 'WORK_ORDER_ALREADY_ASSIGNED',
          message: 'This work order has already been assigned',
          current_status: workOrder.status,
        },
      });
    }

    await client.query(
      'UPDATE work_orders SET assigned_vendor_id = $1, assigned_at = CURRENT_TIMESTAMP, status = \'assigned\', updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [vendor_id, id]
    );

    const responseId = generateUuid();
    await client.query(
      'INSERT INTO work_order_vendor_responses (id, work_order_id, vendor_id, response, notes) VALUES ($1, $2, $3, \'accepted\', $4)',
      [responseId, id, vendor_id, notes || null]
    );

    await client.query('COMMIT');

    logger.info('Work order accepted:', { workOrderId: id, vendorId: vendor_id });

    res.status(200).json({
      work_order_id: id,
      status: 'assigned',
      assigned_vendor_id: vendor_id,
      assigned_at: new Date().toISOString(),
      message: 'Work order assigned successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Accept work order error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while accepting work order',
      },
    });
  } finally {
    client.release();
  }
};

export const getWorkOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT wo.*, s.sku_code, s.name as sku_name, v.company_name as vendor_name FROM work_orders wo JOIN skus s ON wo.sku_id = s.id LEFT JOIN vendors v ON wo.assigned_vendor_id = v.id WHERE wo.id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'WORK_ORDER_NOT_FOUND',
          message: 'Work order not found',
        },
      });
    }

    const lineItems = await query(
      'SELECT li.*, s.sku_code, s.name as sku_name FROM work_order_line_items li JOIN skus s ON li.sku_id = s.id WHERE li.work_order_id = $1',
      [id]
    );

    res.status(200).json({
      ...result.rows[0],
      line_items: lineItems.rows,
    });
  } catch (error) {
    logger.error('Get work order error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching work order',
      },
    });
  }
};

export const completeWorkOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { completion_notes } = req.body;

    const result = await query(
      'UPDATE work_orders SET status = \'completed\', completed_at = CURRENT_TIMESTAMP, completion_notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [completion_notes || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'WORK_ORDER_NOT_FOUND',
          message: 'Work order not found',
        },
      });
    }

    logger.info('Work order completed:', { workOrderId: id });

    res.status(200).json({
      ...result.rows[0],
      message: 'Work order completed successfully',
    });
  } catch (error) {
    logger.error('Complete work order error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while completing work order',
      },
    });
  }
};
