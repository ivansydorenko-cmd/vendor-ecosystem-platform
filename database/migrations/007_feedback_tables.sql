-- Customer feedback
CREATE TABLE IF NOT EXISTS customer_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    satisfaction_rating INT CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    nps_score INT CHECK (nps_score >= 0 AND nps_score <= 10),
    quality_rating INT CHECK (quality_rating >= 1 AND quality_rating <= 5),
    timeliness_rating INT CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    professionalism_rating INT CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    comments TEXT,
    would_recommend BOOLEAN,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback photos (for quality verification)
CREATE TABLE IF NOT EXISTS feedback_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID NOT NULL REFERENCES customer_feedback(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_work_order ON customer_feedback(work_order_id);
CREATE INDEX IF NOT EXISTS idx_feedback_vendor ON customer_feedback(vendor_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON customer_feedback(satisfaction_rating);
CREATE INDEX IF NOT EXISTS idx_feedback_photos_feedback ON feedback_photos(feedback_id);
