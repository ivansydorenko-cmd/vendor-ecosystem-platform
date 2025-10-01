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

export const getDocumentTypes = async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT id, name, description, category, validity_period_days, is_required, created_at FROM document_types ORDER BY category, name',
      []
    );

    res.status(200).json({
      document_types: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    logger.error('Get document types error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching document types',
      },
    });
  }
};

export const uploadVendorDocument = async (req: Request, res: Response) => {
  try {
    const {
      vendor_id,
      document_type_id,
      file_name,
      file_path,
      file_size,
      mime_type,
      expiration_date,
      coverage_amount,
    } = req.body;

    if (!vendor_id || !document_type_id || !file_name || !file_path) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: vendor_id, document_type_id, file_name, file_path',
        },
      });
    }

    const vendorExists = await query('SELECT id FROM vendors WHERE id = $1', [vendor_id]);
    if (vendorExists.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'VENDOR_NOT_FOUND',
          message: 'Vendor not found',
        },
      });
    }

    const docTypeExists = await query('SELECT id FROM document_types WHERE id = $1', [document_type_id]);
    if (docTypeExists.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'DOCUMENT_TYPE_NOT_FOUND',
          message: 'Document type not found',
        },
      });
    }

    const documentId = generateUuid();

    const result = await query(
      'INSERT INTO vendor_documents (id, vendor_id, document_type_id, file_name, file_path, file_size, mime_type, expiration_date, coverage_amount, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, \'pending\') RETURNING id, vendor_id, document_type_id, file_name, expiration_date, coverage_amount, status, created_at',
      [documentId, vendor_id, document_type_id, file_name, file_path, file_size || null, mime_type || null, expiration_date || null, coverage_amount || null]
    );

    logger.info('Vendor document uploaded:', { documentId, vendor_id });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Upload vendor document error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while uploading document',
      },
    });
  }
};

export const getVendorDocuments = async (req: Request, res: Response) => {
  try {
    const { vendor_id } = req.params;

    const result = await query(
      'SELECT vd.id, vd.vendor_id, vd.document_type_id, dt.name as document_type_name, dt.category, vd.file_name, vd.file_path, vd.expiration_date, vd.coverage_amount, vd.status, vd.reviewed_by, vd.reviewed_at, vd.review_notes, vd.created_at FROM vendor_documents vd JOIN document_types dt ON vd.document_type_id = dt.id WHERE vd.vendor_id = $1 ORDER BY vd.created_at DESC',
      [vendor_id]
    );

    res.status(200).json({
      vendor_id: vendor_id,
      documents: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    logger.error('Get vendor documents error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching documents',
      },
    });
  }
};

export const reviewDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, review_notes, reviewed_by } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status must be either "approved" or "rejected"',
        },
      });
    }

    const existingDoc = await query('SELECT id FROM vendor_documents WHERE id = $1', [id]);
    if (existingDoc.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        },
      });
    }

    const result = await query(
      'UPDATE vendor_documents SET status = $1, review_notes = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [status, review_notes || null, reviewed_by || null, id]
    );

    logger.info('Document reviewed:', { documentId: id, status });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    logger.error('Review document error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while reviewing document',
      },
    });
  }
};

export const getExpiringDocuments = async (req: Request, res: Response) => {
  try {
    const { days = 60 } = req.query;

    const result = await query(
      'SELECT vd.id, vd.vendor_id, v.company_name, vd.document_type_id, dt.name as document_type_name, vd.file_name, vd.expiration_date, vd.status FROM vendor_documents vd JOIN vendors v ON vd.vendor_id = v.id JOIN document_types dt ON vd.document_type_id = dt.id WHERE vd.expiration_date IS NOT NULL AND vd.expiration_date <= CURRENT_DATE + INTERVAL \'' + Number(days) + ' days\' AND vd.status = \'approved\' ORDER BY vd.expiration_date ASC',
      []
    );

    res.status(200).json({
      expiring_documents: result.rows,
      total: result.rows.length,
      days_ahead: Number(days),
    });
  } catch (error) {
    logger.error('Get expiring documents error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching expiring documents',
      },
    });
  }
};
