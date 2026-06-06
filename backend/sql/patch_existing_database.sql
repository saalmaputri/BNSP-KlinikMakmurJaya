-- Jalankan file ini jika database klinik_makmur_jaya sudah dibuat dari docs/database-schema.sql
-- sebelum backend dibuat.

ALTER TABLE error_logs
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'UNRESOLVED';

CREATE INDEX IF NOT EXISTS idx_error_logs_status
ON error_logs(status);

-- Perbaiki email dummy lama yang memakai domain .test agar lolos validasi Pydantic EmailStr.
UPDATE users
SET email = 'admin@klinikmakmurjaya.com',
    updated_at = NOW()
WHERE email = 'admin@klinikmakmurjaya.test';

UPDATE users
SET email = 'apoteker@klinikmakmurjaya.com',
    updated_at = NOW()
WHERE email = 'apoteker@klinikmakmurjaya.test';

UPDATE users
SET email = 'kasir@klinikmakmurjaya.com',
    updated_at = NOW()
WHERE email = 'kasir@klinikmakmurjaya.test';

UPDATE users
SET email = 'budi@klinikmakmurjaya.com',
    updated_at = NOW()
WHERE email = 'budi@example.test';
