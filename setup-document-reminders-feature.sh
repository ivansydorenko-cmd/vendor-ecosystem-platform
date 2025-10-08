#!/bin/bash

echo "Setting up Document Expiration Reminders Feature..."

# Create reminder service
cat > backend/src/services/reminder.service.ts << 'EOF'
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
EOF

echo "✓ Created reminder.service.ts"

# Create reminder controller
cat > backend/src/controllers/reminder.controller.ts << 'EOF'
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
EOF

echo "✓ Created reminder.controller.ts"

# Create reminder routes
cat > backend/src/routes/reminder.routes.ts << 'EOF'
import { Router } from 'express';
import * as reminderController from '../controllers/reminder.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';

const router = Router();

router.post('/check', authenticateToken, authorize('admin'), reminderController.runExpirationCheck);
router.get('/upcoming', authenticateToken, reminderController.getUpcomingExpirations);

export default router;
EOF

echo "✓ Created reminder.routes.ts"

echo ""
echo "✓ Document Expiration Reminders feature files created!"
echo ""
echo "To complete setup:"
echo "1. Add to backend/src/server.ts imports:"
echo "   import reminderRoutes from './routes/reminder.routes';"
echo ""
echo "2. Add to backend/src/server.ts routes:"
echo "   app.use('/api/v1/reminders', reminderRoutes);"
echo ""
echo "3. Optional: Set up a cron job to run the check daily:"
echo "   curl -X POST http://localhost:3000/api/v1/reminders/check"
echo ""
echo "4. Run: docker-compose restart backend"
EOF

chmod +x setup-document-reminders-feature.sh
