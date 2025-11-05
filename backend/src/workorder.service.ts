import { query, getClient } from '../config/database';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface VendorMatch {
  vendor_id: string;
  company_name: string;
  business_email: string;
  distance_miles?: number;
}

export const findQualifiedVendors = async (
  workOrderId: string,
  categoryId: string,
  zipcode: string,
  tenantId: string
): Promise<VendorMatch[]> => {
  try {
    const zipcodeMatches = await query(
      `SELECT DISTINCT v.id as vendor_id, v.company_name, v.business_email
       FROM vendors v
       INNER JOIN vendor_service_areas_zipcodes vsaz ON v.id = vsaz.vendor_id
       INNER JOIN vendor_capabilities vc ON v.id = vc.vendor_id
       WHERE vsaz.zipcode = $1
       AND vc.category_id = $2
       AND v.registration_status = 'registered'
       AND NOT EXISTS (
         SELECT 1 FROM vendor_documents vd
         INNER JOIN document_types dt ON vd.document_type_id = dt.id
         WHERE vd.vendor_id = v.id
         AND dt.is_required = true
         AND (vd.status != 'approved' OR vd.expiration_date < CURRENT_DATE)
       )`,
      [zipcode, categoryId]
    );

    const radiusMatches = await query(
      `SELECT DISTINCT v.id as vendor_id, v.company_name, v.business_email,
              vsar.radius_miles
       FROM vendors v
       INNER JOIN vendor_service_areas_radius vsar ON v.id = vsar.vendor_id
       INNER JOIN vendor_capabilities vc ON v.id = vc.vendor_id
       INNER JOIN work_orders wo ON wo.id = $1
       WHERE vc.category_id = $2
       AND v.registration_status = 'registered'
       AND wo.latitude IS NOT NULL
       AND wo.longitude IS NOT NULL
       AND (
         (6371 * acos(
           cos(radians(wo.latitude)) *
           cos(radians(vsar.center_latitude)) *
           cos(radians(vsar.center_longitude) - radians(wo.longitude)) +
           sin(radians(wo.latitude)) *
           sin(radians(vsar.center_latitude))
         ) * 0.621371) <= vsar.radius_miles
       )
       AND NOT EXISTS (
         SELECT 1 FROM vendor_documents vd
         INNER JOIN document_types dt ON vd.document_type_id = dt.id
         WHERE vd.vendor_id = v.id
         AND dt.is_required = true
         AND (vd.status != 'approved' OR vd.expiration_date < CURRENT_DATE)
       )`,
      [workOrderId, categoryId]
    );

    const allVendors = [...zipcodeMatches.rows, ...radiusMatches.rows];
    const uniqueVendors = Array.from(
      new Map(allVendors.map(v => [v.vendor_id, v])).values()
    );

    if (tenantId) {
      const qualifiedVendors = await query(
        `SELECT vendor_id FROM vendor_tenant_qualifications
         WHERE tenant_id = $1 AND status = 'qualified'`,
        [tenantId]
      );

      const qualifiedIds = new Set(qualifiedVendors.rows.map(v => v.vendor_id));
      
      return uniqueVendors.filter(v => qualifiedIds.has(v.vendor_id));
    }

    return uniqueVendors;
  } catch (error) {
    logger.error('Find qualified vendors error:', error);
    throw error;
  }
};

export const notifyVendors = async (
  workOrderId: string,
  vendorIds: string[],
  notificationMethod: 'auto_notify' | 'invite_specific' | 'discoverable' | 'open'
): Promise<void> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    for (const vendorId of vendorIds) {
      const responseId = uuidv4();
      await client.query(
        `INSERT INTO work_order_vendor_responses (id, work_order_id, vendor_id, response, response_at)
         VALUES ($1, $2, $3, 'notified', CURRENT_TIMESTAMP)
         ON CONFLICT (work_order_id, vendor_id) DO NOTHING`,
        [responseId, workOrderId, vendorId]
      );
    }

    await client.query('COMMIT');
    logger.info('Vendors notified:', { workOrderId, vendorCount: vendorIds.length });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Notify vendors error:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const assignVendorToWorkOrder = async (
  workOrderId: string,
  vendorId: string
): Promise<boolean> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const workOrderResult = await client.query(
      'SELECT assigned_vendor_id, status FROM work_orders WHERE id = $1 FOR UPDATE',
      [workOrderId]
    );

    if (workOrderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    const workOrder = workOrderResult.rows[0];

    if (workOrder.assigned_vendor_id) {
      await client.query('ROLLBACK');
      logger.info('Work order already assigned:', { workOrderId, existingVendor: workOrder.assigned_vendor_id });
      return false;
    }

    await client.query(
      `UPDATE work_orders
       SET assigned_vendor_id = $1, assigned_at = CURRENT_TIMESTAMP,
           status = 'assigned', updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [vendorId, workOrderId]
    );

    await client.query(
      `UPDATE work_order_vendor_responses
       SET response = 'accepted', response_at = CURRENT_TIMESTAMP
       WHERE work_order_id = $1 AND vendor_id = $2`,
      [workOrderId, vendorId]
    );

    await client.query(
      `UPDATE work_order_vendor_responses
       SET response = 'declined_auto', response_at = CURRENT_TIMESTAMP
       WHERE work_order_id = $1 AND vendor_id != $2 AND response = 'notified'`,
      [workOrderId, vendorId]
    );

    await client.query('COMMIT');

    logger.info('Vendor assigned to work order:', { workOrderId, vendorId });
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Assign vendor error:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getAvailableWorkOrdersForVendor = async (
  vendorId: string,
  page: number = 1,
  limit: number = 20
): Promise<any> => {
  try {
    const offset = (page - 1) * limit;

    const vendorCapabilities = await query(
      'SELECT category_id FROM vendor_capabilities WHERE vendor_id = $1',
      [vendorId]
    );

    const categoryIds = vendorCapabilities.rows.map(c => c.category_id);

    if (categoryIds.length === 0) {
      return { work_orders: [], pagination: { current_page: page, per_page: limit, total: 0, total_pages: 0 } };
    }

    const vendorZipcodes = await query(
      'SELECT zipcode FROM vendor_service_areas_zipcodes WHERE vendor_id = $1',
      [vendorId]
    );

    const zipcodes = vendorZipcodes.rows.map(z => z.zipcode);

    let workOrders;
    if (zipcodes.length > 0) {
      const placeholders = categoryIds.map((_, i) => `$${i + 2}`).join(',');
      const zipPlaceholders = zipcodes.map((_, i) => `$${i + 2 + categoryIds.length}`).join(',');

      workOrders = await query(
        `SELECT wo.id, wo.title, wo.description, wo.priority, wo.address,
                wo.zipcode, wo.preferred_date, wo.preferred_time_start,
                wo.created_at, s.name as sku_name, s.current_price,
                sc.name as category_name, t.name as tenant_name
         FROM work_orders wo
         INNER JOIN skus s ON wo.sku_id = s.id
         INNER JOIN service_categories sc ON s.category_id = sc.id
         INNER JOIN tenants t ON wo.tenant_id = t.id
         WHERE wo.assigned_vendor_id IS NULL
         AND wo.status IN ('created', 'pending')
         AND s.category_id IN (${placeholders})
         AND wo.zipcode IN (${zipPlaceholders})
         AND EXISTS (
           SELECT 1 FROM work_order_vendor_responses wovr
           WHERE wovr.work_order_id = wo.id
           AND wovr.vendor_id = $1
           AND wovr.response = 'notified'
         )
         ORDER BY wo.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        [vendorId, ...categoryIds, ...zipcodes]
      );
    } else {
      const placeholders = categoryIds.map((_, i) => `$${i + 2}`).join(',');

      workOrders = await query(
        `SELECT wo.id, wo.title, wo.description, wo.priority, wo.address,
                wo.zipcode, wo.preferred_date, wo.preferred_time_start,
                wo.created_at, s.name as sku_name, s.current_price,
                sc.name as category_name, t.name as tenant_name
         FROM work_orders wo
         INNER JOIN skus s ON wo.sku_id = s.id
         INNER JOIN service_categories sc ON s.category_id = sc.id
         INNER JOIN tenants t ON wo.tenant_id = t.id
         WHERE wo.assigned_vendor_id IS NULL
         AND wo.status IN ('created', 'pending')
         AND s.category_id IN (${placeholders})
         AND EXISTS (
           SELECT 1 FROM work_order_vendor_responses wovr
           WHERE wovr.work_order_id = wo.id
           AND wovr.vendor_id = $1
           AND wovr.response = 'notified'
         )
         ORDER BY wo.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        [vendorId, ...categoryIds]
      );
    }

    const countQuery = await query(
      `SELECT COUNT(*) FROM work_orders wo
       INNER JOIN skus s ON wo.sku_id = s.id
       WHERE wo.assigned_vendor_id IS NULL
       AND wo.status IN ('created', 'pending')
       AND s.category_id = ANY($1)
       AND EXISTS (
         SELECT 1 FROM work_order_vendor_responses wovr
         WHERE wovr.work_order_id = wo.id
         AND wovr.vendor_id = $2
         AND wovr.response = 'notified'
       )`,
      [categoryIds, vendorId]
    );

    const total = parseInt(countQuery.rows[0].count);

    return {
      work_orders: workOrders.rows,
      pagination: {
        current_page: page,
        per_page: limit,
        total: total,
        total_pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Get available work orders error:', error);
    throw error;
  }
};
