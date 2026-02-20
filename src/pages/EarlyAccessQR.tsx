import { QRCodeSVG } from 'qrcode.react';

const QR_URL = 'https://xn--9d0bk8ucxkkcw59f.com/earlyteacher2026';

export default function EarlyAccessQR() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-400 to-emerald-400" />

        <div className="p-8 flex flex-col items-center">
          {/* 제목 */}
          <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">
            학교일자리<br />한번 등록해보세요
          </h1>
          <div className="w-20 h-0.5 bg-[#F87171] mb-6" />

          {/* 대상 1: 학생 교육 */}
          <div className="w-full flex gap-3 items-start mb-4">
            <div className="w-1 shrink-0 self-stretch rounded-full bg-[#3B82F6]" />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">방과후, 정규시간 협력수업 등</p>
              <p className="text-base font-semibold text-gray-800 leading-snug">
                학생 대상 교육으로<br />일자리를 구하는 선생님들
              </p>
            </div>
          </div>

          {/* 구분선 */}
          <div className="w-full border-t border-gray-100 mb-4" />

          {/* 대상 2: 성인 교육 */}
          <div className="w-full flex gap-3 items-start mb-6">
            <div className="w-1 shrink-0 self-stretch rounded-full bg-[#F87171]" />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">에듀테크, 학급세우기 등</p>
              <p className="text-base font-semibold text-gray-800 leading-snug">
                교직원, 학부모 대상 연수를<br />하실 수 있는 정규교원이나<br />강사 선생님들
              </p>
            </div>
          </div>

          {/* QR 코드 */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 mb-4">
            <QRCodeSVG
              value={QR_URL}
              size={100}
              level="M"
              marginSize={0}
            />
          </div>

          <p className="text-sm text-gray-400">
            카메라로 QR코드를 스캔해주세요
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-300">
        학교일자리.com
      </p>
    </div>
  );
}
