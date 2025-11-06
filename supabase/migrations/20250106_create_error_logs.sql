-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 에러 로그 테이블 생성 (모바일 디버깅용)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL,
  user_agent text NOT NULL,
  url text NOT NULL,
  error_type text NOT NULL,
  error_message text NOT NULL,
  stack_trace text,
  device_info jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON public.error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_url ON public.error_logs(url);

-- RLS 비활성화 (누구나 에러 로그 작성 가능)
ALTER TABLE public.error_logs DISABLE ROW LEVEL SECURITY;

-- 코멘트 추가
COMMENT ON TABLE public.error_logs IS '모바일 환경에서 발생하는 에러를 추적하기 위한 로그 테이블';
COMMENT ON COLUMN public.error_logs.error_type IS 'runtime, network, page_load, service_worker, uncaught_error, unhandled_rejection';
COMMENT ON COLUMN public.error_logs.device_info IS 'isMobile, platform, screenSize, connection 정보';
