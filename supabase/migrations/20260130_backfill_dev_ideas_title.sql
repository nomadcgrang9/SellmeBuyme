-- 기존 제목 없는 아이디어에 첫 문장 추출하여 title로 설정
-- 작성일: 2026-01-30
-- 목적: 아이디어 검색성 개선을 위한 제목 백필

-- 1. 기존 title이 비어있는 아이디어에 content 첫 문장(또는 50자)을 title로 설정
UPDATE dev_ideas
SET title = CASE
  -- 마침표가 있으면 첫 문장 (최대 50자)
  WHEN POSITION('.' IN content) > 0 THEN
    LEFT(SUBSTRING(content FROM 1 FOR POSITION('.' IN content)), 50)
  -- 줄바꿈이 있으면 첫 줄 (최대 50자)
  WHEN POSITION(E'\n' IN content) > 0 THEN
    LEFT(SUBSTRING(content FROM 1 FOR POSITION(E'\n' IN content) - 1), 50)
  -- 둘 다 없으면 처음 50자
  ELSE
    LEFT(content, 50)
END
WHERE title IS NULL OR title = '';

-- 2. title 끝에 불필요한 공백/줄바꿈 제거
UPDATE dev_ideas
SET title = TRIM(title)
WHERE title != TRIM(title);
