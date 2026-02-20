import { TERMS_CHAPTERS, TERMS_EFFECTIVE_DATE, TERMS_APPENDIX } from './terms-content';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-esamanru">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">이용약관</h1>
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
            <h2 className="text-xl font-bold text-gray-900 mb-1">학교일자리.com 이용약관</h2>
            <p className="text-xs text-gray-500">시행일: {TERMS_EFFECTIVE_DATE}</p>
          </div>

          <div className="space-y-8">
            {TERMS_CHAPTERS.map((chapter) => (
              <div key={chapter.title}>
                <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                  {chapter.title}
                </h3>
                <div className="space-y-6">
                  {chapter.sections.map((section) => (
                    <div key={section.id} id={section.id}>
                      <h4 className="text-sm font-bold text-gray-800 mb-2">{section.title}</h4>
                      <div className="text-sm text-gray-600 leading-relaxed space-y-1">
                        {section.content.map((line, idx) => (
                          <p key={idx} className={line.startsWith('  ') ? 'pl-4' : ''}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 부칙 */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 mb-2">부칙</h3>
            <p className="text-sm text-gray-600">{TERMS_APPENDIX}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
