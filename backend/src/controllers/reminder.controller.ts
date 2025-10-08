import { Request, Response } from 'express';
import * as reminderService from '../services/reminder.service';
import logger from '../utils/logger';

export const runExpirationCheck = async (req: Request, res: Response) => {
  try {
    await reminderService.checkExpiringDocuments();
    const expiredCount = await reminderService.checkExpiredDocuments();
    
    res.status(200).json({
      message: 'Document expiration check completed',
      expired_documents: expiredCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Run expiration check error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while running expiration check'
      }
    });
  }
};

export const getUpcomingExpirations = async (req: Request, res: Response) => {
  try {
    const { query } = await import('../config/database');
    const { days = 30 } = req.query;
    
    const result = await query(
      `SELECT vd.id, vd.expiration_date, dt.name as document_type,
              v.id as vendor_id, v.company_name, v.business_email
       FROM vendor_documents vd
       INNER JOIN document_types dt ON vd.document_type_id = dt.id
       INNER JOIN vendors v ON vd.vendor_id = v.id
       WHERE vd.expiration_date <= CURRENT_DATE + INTERVAL '1 day' * $1
       AND vd.expiration_date >= CURRENT_DATE
       AND vd.status = 'approved'
       ORDER BY vd.expiration_date ASC`,
      [Number(days)]
    );

    res.status(200).json({
      upcoming_expirations: result.rows,
      count: result.rows.length,
      within_days: Number(days)
    });
  } catch (error) {
    logger.error('Get upcoming expirations error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching upcoming expirations'
      }
    });
  }
};
