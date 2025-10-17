-- 더미 데이터 삽입 (테스트용)

-- 공고 데이터
INSERT INTO public.job_postings (organization, title, tags, location, compensation, deadline, is_urgent) VALUES
('수원 OO초등학교', '코딩 방과후 강사 모집', ARRAY['파이썬', '스크래치', '초등'], '수원 영통구', '시급 30,000원', '2025-10-25', false),
('용인 XX중학교', 'AI 코딩 교육 강사 모집', ARRAY['인공지능', '파이썬', '중등'], '용인 수지구', '시급 35,000원', '2025-10-30', false),
('화성 ◇◇고등학교', '수학 방과후 강사', ARRAY['고등수학', '수능대비'], '화성 동탄', '시급 45,000원', '2025-11-10', false),
('성남 ☆☆초등학교', '체육 대체교사 긴급', ARRAY['초등체육', '구기종목'], '성남 분당구', '일급 180,000원', '2025-10-18', true),
('안양 ◎◎중학교', '미술 방과후 강사', ARRAY['회화', '디자인', '중등'], '안양 만안구', '시급 32,000원', '2025-11-01', false),
('수원 OO초등학교', '대체교사 긴급 모집', ARRAY['초등전학년'], '수원', '시급 35,000원', '2025-10-17', true),
('용인 XX중학교', '코딩 방과후 강사', ARRAY['파이썬', 'AI'], '용인', '시급 30,000원', '2025-10-25', false),
('성남 △△초등학교', '영어 원어민 보조', ARRAY['회화', 'TEE'], '성남', '시급 40,000원', '2025-11-05', false);

-- 인력풀 데이터
INSERT INTO public.talents (name, specialty, tags, location, experience_years, is_verified, rating, review_count) VALUES
('이OO 강사님', '파이썬/AI 교육 전문', ARRAY['파이썬', '머신러닝', '초등코딩', '중등코딩'], ARRAY['수원', '용인', '화성'], 6, true, 4.9, 18),
('박OO 강사님', '영어 회화 전문', ARRAY['원어민수준', '초등영어', 'TOEIC'], ARRAY['수원', '화성'], 4, false, 4.7, 12),
('최OO 강사님', '과학실험 교육 전문', ARRAY['물리', '화학', '실험'], ARRAY['용인', '성남'], 10, true, 5.0, 31),
('정OO 강사님', '음악 교육 전문', ARRAY['피아노', '바이올린', '합창'], ARRAY['수원', '용인'], 7, true, 4.8, 15),
('김OO 강사', '초등 과학실험 전문', ARRAY['STEAM', '영재교육'], ARRAY['수원', '용인', '화성'], 8, true, 4.9, 23);

-- 크롤링 소스 데이터 (경기도 교육청 예시)
INSERT INTO public.crawl_sources (name, base_url, parser_type, status) VALUES
('경기도 수원교육지원청', 'https://suwon.goe.go.kr', 'html', 'active'),
('경기도 용인교육지원청', 'https://yongin.goe.go.kr', 'html', 'active'),
('경기도 화성오산교육지원청', 'https://hsosedu.goe.go.kr', 'html', 'active'),
('경기도 성남교육지원청', 'https://sn.goe.go.kr', 'html', 'active'),
('경기도 안양과천교육지원청', 'https://aygc.goe.go.kr', 'html', 'active');
