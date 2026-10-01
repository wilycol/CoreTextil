-- Migration: 0016_vision_engine_fields.sql
-- Description: Adds necessary columns for the SAM 2 Knolling Engine MVP

-- Add master exploded map image URL to garments
ALTER TABLE public.garments 
ADD COLUMN IF NOT EXISTS ai_exploded_image_url TEXT;

-- Add transparent part image URL and bounding box coordinates to garment_parts
ALTER TABLE public.garment_parts 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS svg_hotspot_coords JSONB;
