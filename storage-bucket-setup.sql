-- Storage Bucket Setup for Document Management with Organization Isolation
-- Run this in the Supabase SQL editor

-- Create the documents storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents', 
  false,
  10485760, -- 10MB in bytes
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain'
  ]
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain'
  ];

-- Drop existing policies if any
DROP POLICY IF EXISTS "Organization members can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can view their documents" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Organization admins can delete documents" ON storage.objects;

-- Policy: Allow authenticated users to upload documents to their organization's folder
CREATE POLICY "Organization members can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles
    WHERE organization_id IN (
      -- Extract organization_id from the path structure
      -- Path format: {user_id}/{folder_id}/filename
      -- We need to verify the folder belongs to user's organization
      SELECT df.organization_id
      FROM public.document_folders df
      WHERE df.id = split_part(name, '/', 2)::uuid
    )
  )
);

-- Policy: Allow organization members to view documents in their organization
CREATE POLICY "Organization members can view their documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles
    WHERE organization_id IN (
      -- Check if the document belongs to user's organization
      SELECT df.organization_id
      FROM public.document_folders df
      WHERE df.id = split_part(name, '/', 2)::uuid
    )
  )
);

-- Policy: Allow organization members to update their own uploaded documents
CREATE POLICY "Organization members can update their documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND split_part(name, '/', 1)::uuid = auth.uid() -- User can only update their own uploads
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles
    WHERE organization_id IN (
      SELECT df.organization_id
      FROM public.document_folders df
      WHERE df.id = split_part(name, '/', 2)::uuid
    )
  )
)
WITH CHECK (
  bucket_id = 'documents' 
  AND split_part(name, '/', 1)::uuid = auth.uid()
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles
    WHERE organization_id IN (
      SELECT df.organization_id
      FROM public.document_folders df
      WHERE df.id = split_part(name, '/', 2)::uuid
    )
  )
);

-- Policy: Allow organization admins to delete any document in their organization
CREATE POLICY "Organization admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles
    WHERE role = 'admin'
    AND organization_id IN (
      SELECT df.organization_id
      FROM public.document_folders df
      WHERE df.id = split_part(name, '/', 2)::uuid
    )
  )
);

-- Create a function to validate file uploads
CREATE OR REPLACE FUNCTION validate_file_upload()
RETURNS trigger AS $$
DECLARE
  v_organization_id uuid;
  v_file_count integer;
  v_storage_used numeric;
  v_storage_limit integer;
BEGIN
  -- Get organization_id from the folder
  SELECT df.organization_id INTO v_organization_id
  FROM public.document_folders df
  WHERE df.id = NEW.folder_id;

  -- Check storage limits (if needed)
  -- This is a placeholder for storage limit checking
  -- You can implement actual storage tracking here
  
  -- Validate file size
  IF NEW.file_size > 10485760 THEN
    RAISE EXCEPTION 'File size exceeds 10MB limit';
  END IF;

  -- Validate file type
  IF NEW.file_type NOT IN (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain'
  ) THEN
    RAISE EXCEPTION 'Unsupported file type';
  END IF;

  -- Set organization_id if not set
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id = v_organization_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for file upload validation
DROP TRIGGER IF EXISTS validate_file_upload_trigger ON public.document_files;
CREATE TRIGGER validate_file_upload_trigger
  BEFORE INSERT OR UPDATE ON public.document_files
  FOR EACH ROW
  EXECUTE FUNCTION validate_file_upload();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_files_organization_id ON public.document_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_files_folder_id ON public.document_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_document_files_processing_status ON public.document_files(processing_status);
CREATE INDEX IF NOT EXISTS idx_document_folders_organization_id ON public.document_folders(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_category_id ON public.document_folders(category_id);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;