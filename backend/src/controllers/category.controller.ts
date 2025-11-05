import { Request, Response } from 'express';
import { query } from '../config/database';
import logger from '../utils/logger';

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT id, name, description, status, created_at FROM service_categories WHERE status = $1 ORDER BY name',
      ['active']
    );

    res.status(200).json({
      categories: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching categories'
      }
    });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, name, description, status, created_at FROM service_categories WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        }
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    logger.error('Get category error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while fetching category'
      }
    });
  }
};
