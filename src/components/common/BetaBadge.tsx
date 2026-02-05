export function BetaBadge() {
  // 환경 변수 또는 기본값 사용 (배포 환경에서도 작동)
  const isBeta = import.meta.env.VITE_IS_BETA === 'true' || import.meta.env.VITE_IS_BETA === undefined;
  const endDate = import.meta.env.VITE_BETA_END_DATE || null;

  // BETA 표시 조건 체크
  if (!isBeta) {
    return null;
  }

  // 종료일이 설정되어 있고, 현재 날짜가 종료일을 지났으면 표시 안 함
  if (endDate && new Date() > new Date(endDate)) {
    return null;
  }

  return (
    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#F87171] text-white rounded shadow-sm">
      BETA
    </span>
  );
}
