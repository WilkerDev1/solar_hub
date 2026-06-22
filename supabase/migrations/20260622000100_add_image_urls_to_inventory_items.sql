-- Migration: Add image_urls array column to inventory_items
-- Objective: Allow multiple images to be attached to each inventory item

-- 1. Add image_urls column to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}'::TEXT[] NOT NULL;

-- 2. Backfill existing single image_url values into image_urls array
UPDATE public.inventory_items
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL 
  AND image_url <> '' 
  AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL OR image_urls = '{}'::TEXT[]);
