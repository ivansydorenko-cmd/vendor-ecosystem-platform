import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const {
      work_order_id,
      satisfaction_rating,
      nps_score,
      quality_rating,
      timeliness_rating,
      professionalism_rating,
      comments,
      would_recommend,
    } = req.body;

    if (!work_order_id || !satisfaction_rating) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'work_order_id and satisfaction_rating are required',
        },
      });
    }

    const workOrderResult = await query(
      'SELECT * FROM work_orders WHERE id = $1',
      [work_order_id]
    );

    if (workOrderResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'WORK_ORDER_NOT_FOUND',
          message: 'Work order not found',
        },
      });
    }

    const workOrder = workOrderResult.rows[0];

    if (workOrder.status !== 'completed') {
      return res.status(400).json({
        error: {
          code: 'WORK_ORDER_NOT_COMPLETED',
          message: 'Feedback can only be submitted for completed work orders',
        },
      });
    }

    if (!workOrder.assigned_vendor_id) {
      return res.status(400).json({
        error: {
          code: 'NO_VENDOR_ASSIGNED',
          message: 'Work order has no assigned vendor',
        },
      });
    }

    const existingFeedback = await query(
      'SELECT id FROM customer_feedback WHERE work_order_id = $1',
      [work_order_id]
    );

    if (existingFeedback.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'FEEDBACK_EXISTS',
          message: 'Feedback has already been submitted for this work order',
        },
      });
    }

    const feedbackId = uuidv4();
    const result = await query(
      `INSERT INTO customer_feedback (
        id, work_order_id, vendor_id, customer_name, customer_email,
        satisfaction_rating, nps_score, quality_rating, timeliness_rating,
        professionalism_rating, comments, would_recommend
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        feedbackId,
        work_order_id,
        workOrder.assigned_vendor_id,
        workOrder.customer_name || null,
        workOrder.customer_email || null,
        satisfaction_rating,
        nps_score || null,
        quality_rating || null,
        timeliness_rating || null,
        professionalism_rating || null,
        comments || null,
        would_recommend || null,
      ]
    );

    logger.info('Feedback submitted:', { feedbackId, work_order_id });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Submit feedback error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while submitting feedback',
      },
    });
  }
};

export const getFeedbackByWorkOrder = async (req: Request, res: Response) => {
  try {
    const { work_order_id } = req.params;

    const result = await query(
      `SELECT cf.*, v.company_name as vendor_name
       FROM customer_feedback cf
       LEFT JOIN vendors v ON cf.vendor_id = v.id
       WHERE cf.work_order_id = $1`,
      [work_order_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'FEEDBACK_NOT_FOUND',
          message: 'No feedback found for this work order',
        },
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    logger.error('Get feedback by work order error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching feedback',
      },
    });
}
};

export const getVendorFeedback = async (req: Request, res: Response) => {
  try {
    const { vendor_id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await query(
      `SELECT cf.*, wo.title as work_order_title
       FROM customer_feedback cf
       LEFT JOIN work_orders wo ON cf.work_order_id = wo.id
       WHERE cf.vendor_id = $1
       ORDER BY cf.submitted_at DESC
       LIMIT $2 OFFSET $3`,
      [vendor_id, Number(limit), offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM customer_feedback WHERE vendor_id = $1',
      [vendor_id]
    );

    const total = parseInt(countResult.rows[0].count);

    const statsResult = await query(
      `SELECT 
        AVG(satisfaction_rating) as avg_satisfaction,
        AVG(nps_score) as avg_nps,
        AVG(quality_rating) as avg_quality,
        AVG(timeliness_rating) as avg_timeliness,
        AVG(professionalism_rating) as avg_professionalism,
        COUNT(*) as total_feedback,
        SUM(CASE WHEN would_recommend = true THEN 1 ELSE 0 END) as would_recommend_count
       FROM customer_feedback
       WHERE vendor_id = $1`,
      [vendor_id]
    );

    res.status(200).json({
      feedback: result.rows,
      statistics: statsResult.rows[0],
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total: total,
        total_pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get vendor feedback error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching vendor feedback',
      },
    });
  }
};

export const getAllFeedback = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, tenant_id, min_rating } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let queryText = `
      SELECT cf.*, wo.title as work_order_title, wo.tenant_id,
             v.company_name as vendor_name, t.name as tenant_name
      FROM customer_feedback cf
      LEFT JOIN work_orders wo ON cf.work_order_id = wo.id
      LEFT JOIN vendors v ON cf.vendor_id = v.id
      LEFT JOIN tenants t ON wo.tenant_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (tenant_id) {
      queryText += ` AND wo.tenant_id = $${paramCount}`;
      params.push(tenant_id);
      paramCount++;
    }

    if (min_rating) {
      queryText += ` AND cf.satisfaction_rating >= $${paramCount}`;
      params.push(Number(min_rating));
      paramCount++;
    }

    queryText += ` ORDER BY cf.submitted_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(Number(limit), offset);

    const result = await query(queryText, params);

    let countQuery = `
      SELECT COUNT(*)
      FROM customer_feedback cf
      LEFT JOIN work_orders wo ON cf.work_order_id = wo.id
      WHERE 1=1
    `;
    const countParams: any[] = [];
    let countIndex = 1;

    if (tenant_id) {
      countQuery += ` AND wo.tenant_id = $${countIndex}`;
      countParams.push(tenant_id);
      countIndex++;
    }

    if (min_rating) {
      countQuery += ` AND cf.satisfaction_rating >= $${countIndex}`;
      countParams.push(Number(min_rating));
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      feedback: result.rows,
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total: total,
        total_pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get all feedback error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching feedback',
      },
    });
  }
};
