-- CreateTable
CREATE TABLE "org_units" (
    "id" VARCHAR(80) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "parent_id" VARCHAR(80),
    "members" TEXT[] NOT NULL DEFAULT '{}',

    CONSTRAINT "org_units_pkey" PRIMARY KEY ("id")
);

-- Seed default org units
INSERT INTO "org_units" ("id", "name", "parent_id", "members") VALUES
  ('org-root', '본사', NULL, ARRAY['u1','u2','u3','u4','u5']::TEXT[]),
  ('org-eng', '엔지니어링', 'org-root', ARRAY['u1','u2']::TEXT[]),
  ('org-design', '디자인', 'org-root', ARRAY['u3']::TEXT[]),
  ('org-platform', '플랫폼', 'org-eng', ARRAY['u1']::TEXT[]);
