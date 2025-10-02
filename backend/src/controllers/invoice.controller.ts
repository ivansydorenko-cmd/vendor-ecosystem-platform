import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const getAllInvoices = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, tenant_id, vendor_id, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let queryText = `
      SELECT i.id, i.work_order_id, i.tenant_id, i.vendor_id, i.invoice_number,
             i.subtotal, i.tax_amount, i.total_amount, i.status, i.due_date,
             i.issued_at, i.paid_at, i.created_at,
             t.name as tenant_name,
             v.company_name as vendor_name,
             wo.title as work_order_title
      FROM invoices i
      LEFT JOIN tenants t ON i.tenant_id = t.id
      LEFT JOIN vendors v ON i.vendor_id = v.id
      LEFT JOIN work_orders wo ON i.work_order_id = wo.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (tenant_id) {
      queryText += ` AND i.tenant_id = $${paramCount}`;
      params.push(tenant_id);
      paramCount++;
    }

    if (vendor_id) {
      queryText += ` AND i.vendor_id = $${paramCount}`;
      params.push(vendor_id);
      paramCount++;
    }

    if (status) {
      queryText += ` AND i.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    queryText += ` ORDER BY i.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(Number(limit), offset);

    const result = await query(queryText, params);

    let countQuery = 'SELECT COUNT(*) FROM invoices i WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (tenant_id) {
      countQuery += ` AND i.tenant_id = $${countParamIndex}`;
      countParams.push(tenant_id);
      countParamIndex++;
    }

    if (vendor_id) {
      countQuery += ` AND i.vendor_id = $${countParamIndex}`;
      countParams.push(vendor_id);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND i.status = $${countParamIndex}`;
      countParams.push(status);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      invoices: result.rows,
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total: total,
        total_pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get all invoices error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching invoices',
      },
    });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoiceResult = await query(
      `SELECT i.*, t.name as tenant_name, v.company_name as vendor_name,
              wo.title as work_order_title
       FROM invoices i
       LEFT JOIN tenants t ON i.tenant_id = t.id
       LEFT JOIN vendors v ON i.vendor_id = v.id
       LEFT JOIN work_orders wo ON i.work_order_id = wo.id
       WHERE i.id = $1`,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: 'Invoice not found',
        },
      });
    }

    const lineItemsResult = await query(
      `SELECT il.*, woli.sku_id, s.name as sku_name, s.sku_code
       FROM invoice_line_items il
       LEFT JOIN work_order_line_items woli ON il.work_order_line_item_id = woli.id
       LEFT JOIN skus s ON woli.sku_id = s.id
       WHERE il.invoice_id = $1
       ORDER BY il.created_at`,
      [id]
    );

    const paymentsResult = await query(
      'SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC',
      [id]
    );

    res.status(200).json({
      ...invoiceResult.rows[0],
      line_items: lineItemsResult.rows,
      payments: paymentsResult.rows,
    });
  } catch (error) {
    logger.error('Get invoice by ID error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching invoice',
      },
    });
  }
};

export const createInvoiceFromWorkOrder = async (req: Request, res: Response) => {
  const client = await getClient();

  try {
    const { work_order_id, tax_rate = 0, due_days = 30 } = req.body;

    if (!work_order_id) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'work_order_id is required',
        },
      });
    }

    const workOrderResult = await query(
      `SELECT wo.*, v.company_name as vendor_name
       FROM work_orders wo
       LEFT JOIN vendors v ON wo.assigned_vendor_id = v.id
       WHERE wo.id = $1`,
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
          message: 'Work order must be completed before generating invoice',
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

    const existingInvoice = await query(
      'SELECT id FROM invoices WHERE work_order_id = $1',
      [work_order_id]
    );

    if (existingInvoice.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'INVOICE_EXISTS',
          message: 'Invoice already exists for this work order',
        },
      });
    }

    const lineItemsResult = await query(
      `SELECT woli.*, s.name as sku_name, s.sku_code
       FROM work_order_line_items woli
       LEFT JOIN skus s ON woli.sku_id = s.id
       WHERE woli.work_order_id = $1 AND woli.status = 'approved'`,
      [work_order_id]
    );

    if (lineItemsResult.rows.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_LINE_ITEMS',
          message: 'No approved line items found for work order',
        },
      });
    }

    await client.query('BEGIN');

    const subtotal = lineItemsResult.rows.reduce(
      (sum, item) => sum + parseFloat(item.total_price),
      0
    );
    const taxAmount = subtotal * (Number(tax_rate) / 100);
    const totalAmount = subtotal + taxAmount;

    const invoiceId = uuidv4();
    const invoiceNumber = 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(due_days));

    const invoiceResult = await client.query(
      `INSERT INTO invoices (id, work_order_id, tenant_id, vendor_id, invoice_number,
                             subtotal, tax_amount, total_amount, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
       RETURNING *`,
      [
        invoiceId,
        work_order_id,
        workOrder.tenant_id,
        workOrder.assigned_vendor_id,
        invoiceNumber,
        subtotal.toFixed(2),
        taxAmount.toFixed(2),
        totalAmount.toFixed(2),
        dueDate,
      ]
    );

    for (const lineItem of lineItemsResult.rows) {
      const lineItemId = uuidv4();
      await client.query(
        `INSERT INTO invoice_line_items (id, invoice_id, work_order_line_item_id,
                                         description, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          lineItemId,
          invoiceId,
          lineItem.id,
          lineItem.sku_name || 'Service',
          lineItem.quantity,
          lineItem.unit_price,
          lineItem.total_price,
        ]
      );
    }

    await client.query('COMMIT');

    logger.info('Invoice created:', { invoiceId, work_order_id });

    res.status(201).json(invoiceResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Create invoice error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while creating invoice',
      },
    });
  } finally {
    client.release();
  }
};

export const recordPayment = async (req: Request, res: Response) => {
  const client = await getClient();

  try {
    const { invoice_id, amount, payment_method, transaction_id, notes } = req.body;

    if (!invoice_id || !amount) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'invoice_id and amount are required',
        },
      });
    }

    const invoiceResult = await query(
      'SELECT * FROM invoices WHERE id = $1',
      [invoice_id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: 'Invoice not found',
        },
      });
    }

    const invoice = invoiceResult.rows[0];

    if (invoice.status === 'paid') {
      return res.status(400).json({
        error: {
          code: 'INVOICE_ALREADY_PAID',
          message: 'Invoice is already marked as paid',
        },
      });
    }

    await client.query('BEGIN');

    const paymentId = uuidv4();
    const paymentResult = await client.query(
      `INSERT INTO payments (id, invoice_id, amount, payment_method,
                             transaction_id, status, notes)
       VALUES ($1, $2, $3, $4, $5, 'completed', $6)
       RETURNING *`,
      [paymentId, invoice_id, amount, payment_method || null, transaction_id || null, notes || null]
    );

    const paymentsTotal = await client.query(
      `SELECT SUM(amount) as total FROM payments
       WHERE invoice_id = $1 AND status = 'completed'`,
      [invoice_id]
    );

    const totalPaid = parseFloat(paymentsTotal.rows[0].total || 0);
    const invoiceTotal = parseFloat(invoice.total_amount);

    let newStatus = 'pending';
    let paidAt = null;

    if (totalPaid >= invoiceTotal) {
      newStatus = 'paid';
      paidAt = new Date();
    } else if (totalPaid > 0) {
      newStatus = 'partially_paid';
    }

    await client.query(
      'UPDATE invoices SET status = $1, paid_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [newStatus, paidAt, invoice_id]
    );

    await client.query('COMMIT');

    logger.info('Payment recorded:', { paymentId, invoice_id, amount });

    res.status(201).json({
      payment: paymentResult.rows[0],
      invoice_status: newStatus,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Record payment error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while recording payment',
      },
    });
  } finally {
    client.release();
  }
};

export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'status is required',
        },
      });
    }

    const validStatuses = ['pending', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(422).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Invalid status value',
          valid_statuses: validStatuses,
        },
      });
    }

    const existingInvoice = await query('SELECT * FROM invoices WHERE id = $1', [id]);

    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: 'Invoice not found',
        },
      });
    }

    const result = await query(
      `UPDATE invoices
       SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, notes || existingInvoice.rows[0].notes, id]
    );

    logger.info('Invoice status updated:', { invoiceId: id, status });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    logger.error('Update invoice status error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating invoice',
      },
    });
  }
};
