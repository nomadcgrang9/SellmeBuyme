/**
 * 점검 페이지 컴포넌트
 * MAINTENANCE_MODE를 true로 설정하면 전체 사이트가 이 페이지로 대체됩니다.
 */

// 🚨 점검 모드 ON/OFF - 여기서 제어
export const MAINTENANCE_MODE = false;  // 로컬 테스트 중 (프로덕션은 true로 배포됨)

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* 아이콘 */}
        <div className="text-6xl mb-6">🔧</div>

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          잠시 점검 중입니다
        </h1>

        {/* 메시지 */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          접속량 폭주로 인해<br />
          <span className="font-semibold text-blue-600">오늘(2월 2일) 밤 12시</span>까지<br />
          잠깐 닫아두겠습니다.
        </p>

        {/* 부가 설명 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            더 안정적인 서비스로 찾아뵙겠습니다.<br />
            잠시만 기다려 주세요! 🙏
          </p>
        </div>

        {/* 예상 복구 시간 */}
        <div className="text-sm text-gray-500">
          예상 복구: 2026년 2월 3일 00:00
        </div>
      </div>
    </div>
  );
}
