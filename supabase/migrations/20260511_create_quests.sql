-- Step 8: 뉴스 퀘스트 자동 생성 파이프라인
-- Supabase SQL Editor에서 수동 실행

CREATE TABLE IF NOT EXISTS public.quests (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  description       TEXT DEFAULT '',
  estimated_minutes INT  DEFAULT 5,
  category          TEXT DEFAULT '뉴스',
  key_summary       TEXT[] DEFAULT '{}',
  learning_points   TEXT[] DEFAULT '{}',
  screens           JSONB NOT NULL DEFAULT '[]',
  quest_type        TEXT DEFAULT 'auto',
  news_source       JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자라면 누구나 퀘스트를 읽을 수 있음
CREATE POLICY "Authenticated users can read quests"
  ON public.quests FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON TABLE public.quests TO authenticated;
GRANT ALL ON TABLE public.quests TO service_role;
