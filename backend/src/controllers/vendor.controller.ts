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

export const registerVendor = async (req: Request, res: Response) => {
  const client = await getClient();

  try {
    const {
      company_name,
      business_email,
      business_phone,
      business_address,
      service_area,
      categories,
      user,
    } = req.body;

    if (!company_name || !business_email || !service_area || !categories || !user) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: 'Required: company_name, business_email, service_area, categories, user',
        },
      });
    }

    if (service_area.type !== 'radius' && service_area.type !== 'zipcodes') {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'service_area.type must be either "radius" or "zipcodes"',
        },
      });
    }

    await client.query('BEGIN');

    const vendorId = generateUuid();

    const vendorResult = await client.query(
      'INSERT INTO vendors (id, company_name, business_email, business_phone, business_address, registration_status) VALUES ($1, $2, $3, $4, $5, \'registered\') RETURNING *',
      [vendorId, company_name, business_email, business_phone || null, business_address || null]
    );

    if (service_area.type === 'radius') {
      const areaId = generateUuid();
      await client.query(
        'INSERT INTO vendor_service_areas_radius (id, vendor_id, center_address, center_latitude, center_longitude, radius_miles) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          areaId,
          vendorId,
          service_area.center_address,
          service_area.center_latitude,
          service_area.center_longitude,
          service_area.radius_miles,
        ]
      );
    } else if (service_area.type === 'zipcodes') {
      for (const zipcode of service_area.zipcodes) {
        const areaId = generateUuid();
        await client.query(
          'INSERT INTO vendor_service_areas_zipcodes (id, vendor_id, zipcode) VALUES ($1, $2, $3)',
          [areaId, vendorId, zipcode]
        );
      }
    }

    for (const categoryId of categories) {
      const capabilityId = generateUuid();
      await client.query(
        'INSERT INTO vendor_capabilities (id, vendor_id, category_id) VALUES ($1, $2, $3)',
        [capabilityId, vendorId, categoryId]
      );
    }

    await client.query('COMMIT');

    logger.info('Vendor registered:', { vendorId, company_name });

    res.status(201).json({
      vendor_id: vendorId,
      company_name: company_name,
      registration_status: 'registered',
      message: 'Registration successful. Complete your profile to start receiving work opportunities.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Vendor registration error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred during registration',
      },
    });
  } finally {
    client.release();
  }
};

export const getVendorProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const vendorResult = await query(
      'SELECT * FROM vendors WHERE id = $1',
      [id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'VENDOR_NOT_FOUND',
          message: 'Vendor not found',
        },
      });
    }

    const vendor = vendorResult.rows[0];

    const radiusAreas = await query(
      'SELECT * FROM vendor_service_areas_radius WHERE vendor_id = $1',
      [id]
    );

    const zipcodeAreas = await query(
      'SELECT zipcode FROM vendor_service_areas_zipcodes WHERE vendor_id = $1',
      [id]
    );

    const capabilities = await query(
      'SELECT vc.category_id, sc.name as category_name FROM vendor_capabilities vc JOIN service_categories sc ON vc.category_id = sc.id WHERE vc.vendor_id = $1',
      [id]
    );

    res.status(200).json({
      ...vendor,
      service_areas: {
        radius: radiusAreas.rows,
        zipcodes: zipcodeAreas.rows.map(r => r.zipcode),
      },
      capabilities: capabilities.rows,
    });
  } catch (error) {
    logger.error('Get vendor profile error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching vendor profile',
      },
    });
  }
};

export const getAllVendors = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status, zipcode } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let queryText = 'SELECT id, company_name, business_email, business_phone, registration_status, created_at FROM vendors WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      queryText += ' AND registration_status = $' + paramCount;
      params.push(status);
      paramCount++;
    }

    if (zipcode) {
      queryText += ' AND id IN (SELECT vendor_id FROM vendor_service_areas_zipcodes WHERE zipcode = $' + paramCount + ')';
      params.push(zipcode);
      paramCount++;
    }

    queryText += ' ORDER BY created_at DESC LIMIT $' + paramCount + ' OFFSET $' + (paramCount + 1);
    params.push(Number(limit), offset);

    const result = await query(queryText, params);

    let countQuery = 'SELECT COUNT(*) FROM vendors WHERE 1=1';
    const countParams: any[] = [];
    let countIndex = 1;

    if (status) {
      countQuery += ' AND registration_status = $' + countIndex;
      countParams.push(status);
      countIndex++;
    }

    if (zipcode) {
      countQuery += ' AND id IN (SELECT vendor_id FROM vendor_service_areas_zipcodes WHERE zipcode = $' + countIndex + ')';
      countParams.push(zipcode);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      vendors: result.rows,
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total: total,
        total_pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get all vendors error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching vendors',
      },
    });
  }
};

export const updateVendorProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { company_name, business_email, business_phone, business_address, website } = req.body;

    const existingVendor = await query('SELECT id FROM vendors WHERE id = $1', [id]);

    if (existingVendor.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'VENDOR_NOT_FOUND',
          message: 'Vendor not found',
        },
      });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (company_name) {
      updates.push('company_name = $' + paramCount);
      values.push(company_name);
      paramCount++;
    }

    if (business_email) {
      updates.push('business_email = $' + paramCount);
      values.push(business_email);
      paramCount++;
    }

    if (business_phone) {
      updates.push('business_phone = $' + paramCount);
      values.push(business_phone);
      paramCount++;
    }

    if (business_address) {
      updates.push('business_address = $' + paramCount);
      values.push(business_address);
      paramCount++;
    }

    if (website) {
      updates.push('website = $' + paramCount);
      values.push(website);
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

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const updateQuery = 'UPDATE vendors SET ' + updates.join(', ') + ' WHERE id = $' + paramCount + ' RETURNING *';

    const result = await query(updateQuery, values);

    logger.info('Vendor profile updated:', { vendorId: id });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    logger.error('Update vendor profile error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating vendor profile',
      },
    });
  }
};
