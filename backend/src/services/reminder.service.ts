import { query } from '../config/database';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const checkExpiringDocuments = async () => {
  try {
    const reminderDays = [60, 30, 5];
    
    for (const days of reminderDays) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + days);
      
      const result = await query(
        `SELECT vd.id, vd.vendor_id, vd.expiration_date, 
                dt.name as document_type, v.company_name, v.business_email
         FROM vendor_documents vd
         INNER JOIN document_types dt ON vd.document_type_id = dt.id
         INNER JOIN vendors v ON vd.vendor_id = v.id
         WHERE vd.expiration_date::date = $1
         AND vd.status = 'approved'
         AND NOT EXISTS (
           SELECT 1 FROM document_reminders dr
           WHERE dr.vendor_document_id = vd.id
           AND dr.reminder_type = $2
         )`,
        [expirationDate.toISOString().split('T')[0], days + '_day']
      );

      for (const doc of result.rows) {
        await sendReminderEmail(doc, days);
        
        const reminderId = uuidv4();
        await query(
          'INSERT INTO document_reminders (id, vendor_document_id, reminder_type) VALUES ($1, $2, $3)',
          [reminderId, doc.id, days + '_day']
        );
        
        logger.info('Document expiration reminder sent:', {
          vendor: doc.company_name,
          document: doc.document_type,
          days_until_expiration: days
        });
      }
    }
  } catch (error) {
    logger.error('Check expiring documents error:', error);
    throw error;
  }
};

async function sendReminderEmail(document: any, days: number) {
  logger.info('Email reminder (stub):', {
    to: document.business_email,
    subject: `Document Expiring in ${days} Days: ${document.document_type}`,
    vendor: document.company_name,
    expiration: document.expiration_date
  });
}

export const checkExpiredDocuments = async () => {
  try {
    const result = await query(
      `SELECT vd.id, vd.vendor_id, v.company_name, dt.name as document_type
       FROM vendor_documents vd
       INNER JOIN document_types dt ON vd.document_type_id = dt.id
       INNER JOIN vendors v ON vd.vendor_id = v.id
       WHERE vd.expiration_date < CURRENT_DATE
       AND vd.status = 'approved'`
    );

    for (const doc of result.rows) {
      await query(
        'UPDATE vendor_documents SET status = $1 WHERE id = $2',
        ['expired', doc.id]
      );
      
      logger.info('Document marked as expired:', {
        vendor: doc.company_name,
        document: doc.document_type
      });
    }

    return result.rows.length;
  } catch (error) {
    logger.error('Check expired documents error:', error);
    throw error;
  }
};
