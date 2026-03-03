export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-esamanru">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">개인정보처리방침</h1>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            돌아가기
          </button>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm">
          <div className="mb-6 pb-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-1">학교일자리.com 개인정보처리방침</h2>
            <p className="text-xs text-gray-500">시행일: 2026년 2월 3일 | 최종 수정일: 2026년 2월 3일</p>
          </div>

          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            학교일자리.com(이하 "서비스")은 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 준수하고 있습니다. 본 개인정보처리방침을 통해 이용자의 개인정보가 어떻게 수집·이용·보호되는지 안내드립니다.
          </p>

          <div className="space-y-8">
            {/* 제1조 */}
            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-3">제1조 (수집하는 개인정보)</h3>
              <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">1. 필수 수집 항목</h4>
                  <table className="w-full text-xs border border-gray-200 rounded">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 border-b border-gray-200">수집 시점</th>
                        <th className="text-left px-3 py-2 border-b border-gray-200">항목</th>
                        <th className="text-left px-3 py-2 border-b border-gray-200">수집 방법</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2">소셜로그인</td>
                        <td className="px-3 py-2">이메일 주소</td>
                        <td className="px-3 py-2">Google/Kakao OAuth</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">2. 선택 수집 항목</h4>
                  <table className="w-full text-xs border border-gray-200 rounded">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 border-b border-gray-200">수집 시점</th>
                        <th className="text-left px-3 py-2 border-b border-gray-200">항목</th>
                        <th className="text-left px-3 py-2 border-b border-gray-200">수집 방법</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="px-3 py-2 border-b border-gray-100">프로필 설정</td><td className="px-3 py-2 border-b border-gray-100">표시명(닉네임)</td><td className="px-3 py-2 border-b border-gray-100">이용자 직접 입력</td></tr>
                      <tr><td className="px-3 py-2 border-b border-gray-100">프로필 설정</td><td className="px-3 py-2 border-b border-gray-100">역할(교사, 강사 등)</td><td className="px-3 py-2 border-b border-gray-100">이용자 선택</td></tr>
                      <tr><td className="px-3 py-2 border-b border-gray-100">프로필 설정</td><td className="px-3 py-2 border-b border-gray-100">관심 지역</td><td className="px-3 py-2 border-b border-gray-100">이용자 선택</td></tr>
                      <tr><td className="px-3 py-2 border-b border-gray-100">프로필 설정</td><td className="px-3 py-2 border-b border-gray-100">관심 과목/분야</td><td className="px-3 py-2 border-b border-gray-100">이용자 선택</td></tr>
                      <tr><td className="px-3 py-2 border-b border-gray-100">프로필 설정</td><td className="px-3 py-2 border-b border-gray-100">전화번호</td><td className="px-3 py-2 border-b border-gray-100">이용자 직접 입력</td></tr>
                      <tr><td className="px-3 py-2">프로필 설정</td><td className="px-3 py-2">자기소개</td><td className="px-3 py-2">이용자 직접 입력</td></tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">3. 자동 수집 항목</h4>
                  <table className="w-full text-xs border border-gray-200 rounded">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 border-b border-gray-200">항목</th>
                        <th className="text-left px-3 py-2 border-b border-gray-200">수집 방법</th>
                        <th className="text-left px-3 py-2 border-b border-gray-200">목적</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="px-3 py-2 border-b border-gray-100">접속 로그</td><td className="px-3 py-2 border-b border-gray-100">서버 자동 기록</td><td className="px-3 py-2 border-b border-gray-100">서비스 이용 분석</td></tr>
                      <tr><td className="px-3 py-2 border-b border-gray-100">기기 정보</td><td className="px-3 py-2 border-b border-gray-100">브라우저 정보</td><td className="px-3 py-2 border-b border-gray-100">서비스 최적화</td></tr>
                      <tr><td className="px-3 py-2">쿠키</td><td className="px-3 py-2">브라우저 저장</td><td className="px-3 py-2">로그인 유지</td></tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">4. 수집하지 않는 정보</h4>
                  <p>다음 정보는 수집하지 않습니다: 주민등록번호, 신용카드 정보, 건강 정보, 위치 정보(GPS), 연령/생년월일</p>
                </div>
              </div>
            </section>

            {/* 제2조 */}
            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-3">제2조 (개인정보의 수집·이용 목적)</h3>
              <table className="w-full text-xs border border-gray-200 rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-gray-200">목적</th>
                    <th className="text-left px-3 py-2 border-b border-gray-200">상세 내용</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr><td className="px-3 py-2 border-b border-gray-100">회원 관리</td><td className="px-3 py-2 border-b border-gray-100">회원 식별, 로그인 상태 유지, 서비스 이용 기록 관리</td></tr>
                  <tr><td className="px-3 py-2 border-b border-gray-100">서비스 제공</td><td className="px-3 py-2 border-b border-gray-100">채용 공고 검색, 맞춤형 공고 추천, 관심 지역 필터링</td></tr>
                  <tr><td className="px-3 py-2 border-b border-gray-100">서비스 개선</td><td className="px-3 py-2 border-b border-gray-100">이용 통계 분석, 기능 개선, 오류 수정</td></tr>
                  <tr><td className="px-3 py-2">고객 지원</td><td className="px-3 py-2">문의 응대, 공지사항 전달</td></tr>
                </tbody>
              </table>
            </section>

            {/* 제3조 */}
            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-3">제3조 (개인정보의 보유 및 이용 기간)</h3>
              <div className="text-sm text-gray-600 leading-relaxed space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">1. 원칙</h4>
                  <p>회원 탈퇴 시까지 보유하며, 이용자가 탈퇴 요청 시 즉시 파기합니다.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">2. 예외 (법령에 따른 보존)</h4>
                  <table className="w-full text-xs border border-gray-200 rounded">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 border-b border-gray-200">보존 항목</th>
                        <th className="text-left px-3 py-2 border-b border-gray-200">보존 기간</th>
                        <th className="text-left px-3 py-2 border-b border-gray-200">근거 법령</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr><td className="px-3 py-2 border-b border-gray-100">접속 기록</td><td className="px-3 py-2 border-b border-gray-100">3개월</td><td className="px-3 py-2 border-b border-gray-100">통신비밀보호법</td></tr>
                      <tr><td className="px-3 py-2">서비스 이용 기록</td><td className="px-3 py-2">3개월</td><td className="px-3 py-2">전자상거래법 (해당 시)</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* 제4조 */}
            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-3">제4조 (개인정보의 제3자 제공)</h3>
              <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                <p>학교일자리.com은 이용자의 개인정보를 제3자에게 제공하지 않습니다.</p>
                <p>인력풀 기능을 통해 이용자가 등록한 프로필 정보는 서비스 내에서 다른 로그인 회원에게 노출될 수 있으며, 이는 인력풀 등록 시 별도의 동의를 받습니다. 동의 철회 시 즉시 노출이 중단됩니다.</p>
              </div>
            </section>

            {/* 제5조 */}
            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-3">제5조 (개인정보 처리의 위탁)</h3>
              <table className="w-full text-xs border border-gray-200 rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-gray-200">수탁자</th>
                    <th className="text-left px-3 py-2 border-b border-gray-200">위탁 업무</th>
                    <th className="text-left px-3 py-2 border-b border-gray-200">보유 기간</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr><td className="px-3 py-2 border-b border-gray-100">Supabase Inc.</td><td className="px-3 py-2 border-b border-gray-100">데이터베이스 운영 및 저장</td><td className="px-3 py-2 border-b border-gray-100">회원 탈퇴 시까지</td></tr>
                  <tr><td className="px-3 py-2 border-b border-gray-100">Google LLC</td><td className="px-3 py-2 border-b border-gray-100">소셜로그인 (Google)</td><td className="px-3 py-2 border-b border-gray-100">OAuth 세션 유지 기간</td></tr>
                  <tr><td className="px-3 py-2 border-b border-gray-100">카카오 주식회사</td><td className="px-3 py-2 border-b border-gray-100">소셜로그인 (Kakao)</td><td className="px-3 py-2 border-b border-gray-100">OAuth 세션 유지 기간</td></tr>
                  <tr><td className="px-3 py-2">Cloudflare Inc.</td><td className="px-3 py-2">웹사이트 호스팅 및 CDN</td><td className="px-3 py-2">접속 로그 보관 기간</td></tr>
                </tbody>
              </table>
            </section>

            {/* 제6조 */}
            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-3">제6조 (정보주체의 권리·의무 및 행사 방법)</h3>
              <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
                <table className="w-full text-xs border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 border-b border-gray-200">권리</th>
                      <th className="text-left px-3 py-2 border-b border-gray-200">행사 방법</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="px-3 py-2 border-b border-gray-100">개인정보 열람 요청</td><td className="px-3 py-2 border-b border-gray-100">프로필에서 직접 확인</td></tr>
                    <tr><td className="px-3 py-2 border-b border-gray-100">개인정보 정정 요청</td><td className="px-3 py-2 border-b border-gray-100">프로필 수정에서 직접 수정</td></tr>
                    <tr><td className="px-3 py-2 border-b border-gray-100">개인정보 삭제 요청</td><td className="px-3 py-2 border-b border-gray-100">회원 탈퇴 또는 이메일 문의</td></tr>
                    <tr><td className="px-3 py-2 border-b border-gray-100">처리 정지 요청</td><td className="px-3 py-2 border-b border-gray-100">이메일 문의</td></tr>
                    <tr><td className="px-3 py-2">동의 철회</td><td className="px-3 py-2">프로필에서 직접 변경</td></tr>
                  </tbody>
                </table>
                <p className="text-xs text-gray-500 mt-2">요청 후 10일 이내에 처리 결과를 안내드립니다. 법령에 따라 보존이 필요한 경우 일부 삭제가 제한될 수 있습니다.</p>
              </div>
            </section>

            {/* 제7조 */}
            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-3">제7조 (개인정보의 파기 절차 및 방법)</h3>
              <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                <p>회원 탈퇴 요청 시 본인 확인(소셜로그인 인증) 후 개인정보를 즉시 삭제합니다.</p>
                <p>전자적 파일 형태로 저장된 개인정보는 복구 불가능한 방법으로 삭제합니다.</p>
              </div>
            </section>

            {/* 제8조 */}
            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-3">제8조 (쿠키의 사용)</h3>
              <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                <table className="w-full text-xs border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 border-b border-gray-200">쿠키 종류</th>
                      <th className="text-left px-3 py-2 border-b border-gray-200">목적</th>
                      <th className="text-left px-3 py-2 border-b border-gray-200">필수 여부</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="px-3 py-2 border-b border-gray-100">인증 쿠키</td><td className="px-3 py-2 border-b border-gray-100">로그인 상태 유지</td><td className="px-3 py-2 border-b border-gray-100">필수</td></tr>
                    <tr><td className="px-3 py-2">설정 쿠키</td><td className="px-3 py-2">사용자 설정 저장</td><td className="px-3 py-2">선택</td></tr>
                  </tbody>
                </table>
                <p>이용자는 브라우저 설정을 통해 쿠키를 허용하거나 거부할 수 있습니다. 쿠키를 거부하면 로그인 기능 등 일부 서비스 이용이 제한될 수 있습니다.</p>
              </div>
            </section>

            {/* 제9조 */}
            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-3">제9조 (개인정보의 안전성 확보 조치)</h3>
              <table className="w-full text-xs border border-gray-200 rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-gray-200">구분</th>
                    <th className="text-left px-3 py-2 border-b border-gray-200">조치 내용</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr><td className="px-3 py-2 border-b border-gray-100">관리적 조치</td><td className="px-3 py-2 border-b border-gray-100">개인정보 취급 담당자 지정, 정기 점검</td></tr>
                  <tr><td className="px-3 py-2 border-b border-gray-100">기술적 조치</td><td className="px-3 py-2 border-b border-gray-100">SSL/TLS 암호화 통신, 비밀번호 암호화 저장</td></tr>
                  <tr><td className="px-3 py-2">물리적 조치</td><td className="px-3 py-2">클라우드 서비스(Supabase) 보안 정책 준수</td></tr>
                </tbody>
              </table>
            </section>

            {/* 제10조 */}
            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-3">제10조 (개인정보 보호책임자)</h3>
              <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                <p>개인정보 보호에 관한 문의사항은 이메일(teamsellba@gmail.com)로 문의해 주시기 바랍니다. 접수 후 10일 이내에 답변드립니다.</p>
                <div className="mt-3">
                  <h4 className="font-semibold text-gray-700 mb-1">권익침해 구제 기관</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>개인정보침해신고센터: (국번없이) 118 | privacy.kisa.or.kr</li>
                    <li>개인정보분쟁조정위원회: 1833-6972 | www.kopico.go.kr</li>
                    <li>대검찰청 사이버수사과: (국번없이) 1301 | www.spo.go.kr</li>
                    <li>경찰청 사이버안전국: (국번없이) 182 | cyberbureau.police.go.kr</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제11조 */}
            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-3">제11조 (개인정보처리방침의 변경)</h3>
              <div className="text-sm text-gray-600 leading-relaxed space-y-1">
                <p>본 개인정보처리방침은 법령 또는 서비스 변경 사항을 반영하기 위해 수정될 수 있습니다.</p>
                <p>변경 시 시행 7일 전에 공지사항을 통해 안내드리며, 중요한 변경 시 이메일 또는 팝업으로 별도 안내드립니다.</p>
              </div>
            </section>
          </div>

          {/* 부칙 */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 mb-2">부칙</h3>
            <p className="text-sm text-gray-600">본 방침은 2026년 2월 3일부터 시행됩니다.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
