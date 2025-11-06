import React, { useEffect, useMemo, useState } from 'react'
import '../styles/landing.css'
import { motion } from 'motion/react'
import TalentCard from '@/components/cards/TalentCard'
import { transformLandingToTalentCard, transformLandingToInsertData, hashPhone, saveRegisteredTalentToLocalStorage, type LandingUserInput } from '@/lib/utils/landingTransform'
import { supabase } from '@/lib/supabase/client'

type SlideKey =
  | 'greeting'
  | 'platform'
  | 'pain'
  | 'connect'
  | 'structure'
  | 'easy'
  | 'ask1min'
  | 'name'
  | 'role'
  | 'region'
  | 'field'
  | 'field-title'
  | 'phone'
  | 'experience'
  | 'review'
  | 'card-registration'
  | 'done'

const order: SlideKey[] = [
  'greeting',
  'platform',
  'pain',
  'connect',
  'structure',
  'easy',
  'ask1min',
  'name',
  'role',
  'region',
  'field-title',
  'field',
  'phone',
  'experience',
  'review',
  'card-registration',
  'done'
]

const hoverLabelSteps: SlideKey[] = ['greeting', 'platform', 'pain']

function hexToRgb(hex: string) {
  const cleaned = hex.replace('#', '')
  const bigint = parseInt(cleaned, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  }
}

function interpolateColor(start: string, end: string, ratio: number) {
  const s = hexToRgb(start)
  const e = hexToRgb(end)
  const clampRatio = Math.min(Math.max(ratio, 0), 1)
  const r = Math.round(s.r + (e.r - s.r) * clampRatio)
  const g = Math.round(s.g + (e.g - s.g) * clampRatio)
  const b = Math.round(s.b + (e.b - s.b) * clampRatio)
  return `rgb(${r}, ${g}, ${b})`
}

const SlideTitle = ({ text, highlight = false }: { text: string; highlight?: boolean }) => {
  const [start, end] = highlight ? ['#A78BFA', '#EC4899'] : ['#60A5FA', '#3730A3']
  const lines = text.split('\n')
  
  return (
    <motion.h2 className="title" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
      {lines.map((line, lineIdx) => {
        const chars = Array.from(line)
        const count = chars.filter(ch => ch.trim().length > 0).length
        let painted = -1
        
        return (
          <div key={lineIdx}>
            {chars.map((char, idx) => {
              const isSpace = char.trim().length === 0
              if (!isSpace) painted += 1
              const ratio = count <= 1 ? 0 : painted / (count - 1)
              const color = isSpace ? (highlight ? '#EC4899' : '#3730A3') : interpolateColor(start, end, ratio)
              return (
                <span key={`${char}-${idx}`} style={{ color, display: 'inline-block' }}>
                  {isSpace ? '\u00A0' : char}
                </span>
              )
            })}
          </div>
        )
      })}
    </motion.h2>
  )
}

export default function Landing() {
  const [step, setStep] = useState<SlideKey>('greeting')
  const [name, setName] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [regions, setRegions] = useState<string[]>([])
  const [fields, setFields] = useState<string[]>([])
  const [phone, setPhone] = useState('')
  const [experience, setExperience] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const [hoveredSide, setHoveredSide] = useState<'left' | 'right' | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const regionsList = useMemo(() => [
    '서울',
    '경기',
    '인천',
    '강원',
    '충북',
    '충남',
    '전북',
    '전남',
    '경북',
    '경남',
    '대구',
    '부산',
    '울산',
    '세종',
    '광주',
    '제주',
    '대전'
  ], [])
  const fieldsList = useMemo(
    () => [
      '멘토링',
      '방과후·돌봄',
      '교육자료 제작',
      '상담·진로',
      '행정업무 보조',
      '공고 등록',
      '대체인력 구함',
      '성인대상 각종 체험프로그램 운영',
      '초등교과',
      '중등교과',
      '요리',
      '코딩',
      '음악',
      '체육',
      'AI교육',
      '심리상담',
      '교권보호',
      '유아놀이',
      '미술교육',
      '독서코칭',
      '기초학력',
      '다문화 교육',
      '한국어 교육',
      '생태환경',
      '지속가능발전교육(ESD)',
      '창의융합교육',
      'STEAM 교육',
      '에듀테크',
      '프로그래밍 교육',
      '메이커 교육',
      '인성교육',
      '안전교육',
      '응급처치',
      '보건교육',
      '성교육',
      '인권교육',
      '문화예술교육',
      '연극·뮤지컬',
      '무용교육',
      '영상제작',
      '진로교육',
      '특수교육',
      '장애학생 지원',
      '통합교육',
      '학부모 교육',
      '교직원 연수',
      '영재교육',
      '기타'
    ],
    []
  )

  function toggleMulti(value: string, list: string[], setter: (v: string[]) => void) {
    if (list.includes(value)) setter(list.filter(i => i !== value))
    else setter([...list, value])
  }

  function isValidPhone(p: string) {
    return /^\d{10,11}$/.test(p.replace(/[^0-9]/g, ''))
  }

  function idxOf(k: SlideKey) {
    return order.indexOf(k)
  }

  function goNext() {
    const i = idxOf(step)
    if (i < order.length - 1) {
      setShowHint(false)
      setStep(order[i + 1])
    }
  }
  function goPrev() {
    const i = idxOf(step)
    if (i > 0) {
      setShowHint(false)
      setStep(order[i - 1])
    }
  }

  // validation for enabling next
  const isNextDisabled = () => {
    if (step === 'name') return name.trim().length === 0
    if (step === 'role') return role == null
    if (step === 'phone') return !isValidPhone(phone)
    if (step === 'experience') return experience == null
    return false
  }

  async function handleInterested() {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const userInput: LandingUserInput = {
        name,
        role: role!,
        regions,
        fields,
        phone,
        experience,
      }

      const talentData = transformLandingToInsertData(userInput)
      const tempId = hashPhone(phone)

      const { data, error } = await supabase
        .from('talents')
        .insert({
          ...talentData,
          temp_identifier: tempId,
          user_id: null,  // 게스트 등록
        })
        .select()
        .single()

      if (error) throw error

      // LocalStorage 저장
      saveRegisteredTalentToLocalStorage(data.id, userInput)

      setStep('done')
    } catch (error) {
      console.error('등록 실패:', error)
      alert('등록 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSkip() {
    // DB 저장 없이 바로 메인페이지로
    window.location.href = '/'
  }

  useEffect(() => {
    if (step !== 'done') return
    const timer = setTimeout(() => {
      window.location.href = '/'
    }, 1800)
    return () => clearTimeout(timer)
  }, [step])

  const handleMainClick = (e: React.MouseEvent) => {
    // 선택 메뉴 제외 (chip, button, input 등)
    const target = e.target as HTMLElement
    if (target.closest('.chip') || target.closest('button') || target.closest('input') || target.closest('.floating-panel')) {
      return
    }

    // 화면 절반 기준으로 클릭 처리
    if (e.clientX < window.innerWidth / 2) {
      goPrev()
    } else {
      goNext()
    }
  }

  const handleMainMouseMove = (e: React.MouseEvent) => {
    // 선택 메뉴 위에서는 호버 표시 안 함
    const target = e.target as HTMLElement
    if (target.closest('.chip') || target.closest('button') || target.closest('input') || target.closest('.floating-panel')) {
      setHoveredSide(null)
      return
    }

    if (!hoverLabelSteps.includes(step)) {
      setHoveredSide(null)
      return
    }

    setMousePos({ x: e.clientX, y: e.clientY })
    if (e.clientX < window.innerWidth / 2) {
      setHoveredSide('left')
    } else {
      setHoveredSide('right')
    }
  }

  const handleMainMouseLeave = () => {
    setHoveredSide(null)
  }

  return (
    <div className="landing-root">
      <main 
        className="slides-wrapper"
        onClick={handleMainClick}
        onMouseMove={handleMainMouseMove}
        onMouseLeave={handleMainMouseLeave}
      >
        {/* Slide 1 - greeting */}
        {step === 'greeting' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="slide hero-slide">
            <SlideTitle text={`안녕하세요,
셀미바이미 입니다`} />
            {showHint && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="onboarding-hint"
                onClick={goNext}
                style={{ cursor: 'pointer' }}
              >
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                >
                  클릭하거나 터치하면 다음화면으로 넘어가요
                </motion.span>
              </motion.div>
            )}
          </motion.section>
        )}

        {/* Slide 2 - platform */}
        {step === 'platform' && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="slide"
          >
            <SlideTitle text={`셀바는 학교가 중심이 되는
인력매칭 플랫폼 입니다`} />
          </motion.section>
        )}

        {/* Slide 3 - pain */}
        {step === 'pain' && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="slide"
          >
            <SlideTitle text={`학교에서는 사람 구하느라
애타고 힘들었던 적
분명 있으실 거에요`} />
          </motion.section>
        )}

        {/* Slide 4 - connect */}
        {step === 'connect' && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="slide"
          >
            <SlideTitle text={`전국 17개 모든 교육청
구인게시판을 연결하고`} />
          </motion.section>
        )}

        {/* Slide 5 - structure */}
        {step === 'structure' && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="slide"
          >
            <SlideTitle text={`1회성에 그친 인력풀등록도
구조적으로 체계화
하고자 합니다`} />
          </motion.section>
        )}

        {/* Slide 6 - easy */}
        {step === 'easy' && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="slide"
          >
            <SlideTitle text="어렵지 않습니다" />
          </motion.section>
        )}

        {/* Slide 7 - ask1min */}
        {step === 'ask1min' && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="slide"
          >
            <SlideTitle text={`선생님의 시간을 저희에게
1분만 주세요`} highlight />
          </motion.section>
        )}
        
        {/* Hover label - global */}
        {hoveredSide && hoverLabelSteps.includes(step) && (
          <div 
            className="hover-label"
            style={{ 
              position: 'fixed',
              left: hoveredSide === 'left' ? mousePos.x - 40 : mousePos.x + 10,
              top: mousePos.y - 10,
              pointerEvents: 'none'
            }}
          >
            {hoveredSide === 'left' ? '이전' : '다음'}
          </div>
        )}

        {/* Slide 8 - name input */}
        {step === 'name' && (
          <motion.section initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="slide">
            <SlideTitle text="선생님의 성함을 알려주십시오" />
            <motion.div className="floating-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <input className="phone-input big" placeholder="홍길동" value={name} onChange={e => setName(e.target.value)} />
            </motion.div>
            {/* Removed per-slide navigation */}
          </motion.section>
        )}

        {/* Slide 9 - role selection (7 options) */}
        {step === 'role' && (
          <motion.section initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="slide">
            <SlideTitle text="선생님은 어떤 역할이십니까?" />
            <motion.div className="floating-panel" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }}>
              {['교사', '기간제 교사', '강사', '교사이자 강사', '행정인력', '기간제 행정인력', '업체'].map(opt => (
                <button key={opt} className={`chip large ${role === opt ? 'selected' : ''}`} onClick={() => setRole(opt)} style={{ margin: 8 }}>{opt}</button>
              ))}
            </motion.div>
            {/* role description shown below the panel as animated text */}
            {role && (
              <div className="role-desc">
                <p className="role-desc-text">
                  {role === '교사'
                    ? '교사는 공고등록, 인력구하거나 협력강사 구하는 업무를 맡은, 또는 다양한 인력자원을 활용해서 교육과정을 풍성히 구성하는 사람입니다.'
                    : role === '기간제 교사'
                    ? '기간제 교사는 본인의 전문성을 활용하여 계약된 기간동안 근무하는 교사입니다.'
                    : role === '강사'
                    ? '강사는 방과후 또는 돌봄, 정규수업시간 협력수업 또는 교직원 및 학부모 대상 성인 수업도 가능한 사람입니다.'
                    : role === '교사이자 강사'
                    ? '교사이자 강사는 정규교원이면서도 강사로서 전문분야가 있어 교직원 및 학부모 대상 연수가 가능한 사람입니다.'
                    : role === '행정인력'
                    ? '행정인력은 조리사, 행정실무, 자원봉사자 등 학교 교육을 지원하는 사람입니다.'
                    : role === '기간제 행정인력'
                    ? '기간제 행정인력은 본인의 전문성을 활용하여 계약된 기간동안 근무하는 행정인력입니다.'
                    : '업체는 각종 프로그램을 운영하고 교육과정을 풍성하게 만드는 조직에 소속된 사람입니다.'}
                </p>
              </div>
            )}
          </motion.section>
        )}

        {/* Slide 10 - region */}
        {step === 'region' && (
          <motion.section initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="slide">
            <SlideTitle text="선생님께서는 어떤 지역에서 주로 활동하십니까?" />
            <motion.div className="floating-panel multi" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              {regionsList.map(r => (
                <button key={r} className={`chip ${regions.includes(r) ? 'selected' : ''}`} onClick={() => toggleMulti(r, regions, setRegions)}>{r}</button>
              ))}
            </motion.div>
            {/* Removed per-slide navigation */}
          </motion.section>
        )}

        {/* Slide 11 - field-title */}
        {step === 'field-title' && (
          <motion.section initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="slide">
            <SlideTitle text={`어떤 분야에\n관심이 있으십니까?`} />
          </motion.section>
        )}

        {/* Slide 12 - field */}
        {step === 'field' && (
          <motion.section initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="slide">
            <SlideTitle text="관심분야 선택" />
            <motion.div className="floating-panel multi" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              {fieldsList.map(f => (
                <button key={f} className={`chip ${fields.includes(f) ? 'selected' : ''}`} onClick={() => toggleMulti(f, fields, setFields)}>{f}</button>
              ))}
            </motion.div>
            {/* Removed per-slide navigation */}
          </motion.section>
        )}

        {/* Slide 12 - phone */}
        {step === 'phone' && (
          <motion.section initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="slide">
            <SlideTitle text="연락 가능한 전화번호를 입력해주세요" />
            <motion.div className="floating-panel" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <input className="phone-input big" placeholder="010-1234-5678" value={phone} onChange={e => setPhone(e.target.value)} />
            </motion.div>
            {/* Removed per-slide navigation */}
          </motion.section>
        )}

        {/* Slide 13 - review */}
        {step === 'review' && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="slide">
            <SlideTitle text="이 정보가 맞습니까?" />
            <motion.div className="floating-panel preview" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <div className="preview-card">
                <div className="pc-header">
                  <div className="pc-role">{role}</div>
                  <div className="pc-region">{regions.join(' · ')}</div>
                </div>
                <div className="pc-body">
                  <div className="pc-name">{name}</div>
                  <div className="pc-fields">{fields.join(', ')}</div>
                  <div className="pc-phone">연락처: {phone}</div>
                </div>
              </div>
            </motion.div>
            {/* Removed per-slide navigation */}
          </motion.section>
        )}

        {/* Slide 14 - card-registration with preview */}
        {step === 'card-registration' && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="slide">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%', maxWidth: '600px' }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  marginBottom: '24px',
                  background: 'linear-gradient(90deg, #60A5FA, #3730A3)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-line'
                }}>
                  {`인력풀로 한번 등록해 보세요
저희가 학교에
적극 추천해드리겠습니다`}
                </h2>
              </div>

              {/* 인력카드 미리보기 */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{ width: '100%', maxWidth: '400px' }}
              >
                <TalentCard
                  talent={transformLandingToTalentCard({
                    name,
                    role: role!,
                    regions,
                    fields,
                    phone,
                    experience,
                  })}
                />
              </motion.div>

              {/* 버튼 그룹 - 가로 배치 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ display: 'flex', flexDirection: 'row', gap: '12px', width: '100%', justifyContent: 'center' }}
              >
                <button
                  onClick={handleInterested}
                  disabled={isSubmitting}
                  style={{
                    flex: '0 0 auto',
                    minWidth: '140px',
                    background: isSubmitting ? '#9CA3AF' : 'linear-gradient(120deg, #BBD8FF, #82B4FF)',
                    color: 'white',
                    border: 'none',
                    padding: '16px 24px',
                    borderRadius: '12px',
                    fontSize: '18px',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: isSubmitting ? 'none' : '0 12px 24px rgba(59,130,246,0.2)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 18px 32px rgba(59,130,246,0.24)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 12px 24px rgba(59,130,246,0.2)';
                    }
                  }}
                >
                  {isSubmitting ? '등록 중...' : '관심있음'}
                </button>
                <button
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  style={{
                    flex: '0 0 auto',
                    minWidth: '180px',
                    background: 'rgba(255,255,255,0.85)',
                    color: '#6B7280',
                    border: '1px solid #E5E7EB',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.background = 'rgba(255,255,255,1)';
                      e.currentTarget.style.borderColor = '#93C5FD';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.85)';
                      e.currentTarget.style.borderColor = '#E5E7EB';
                    }
                  }}
                >
                  안해도 괜찮습니다
                </button>
              </motion.div>
            </div>
          </motion.section>
        )}

        {/* Slide 15 - experience */}
        {step === 'experience' && (
          <motion.section initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="slide">
            <SlideTitle text="선생님의 경력은 어느 정도이십니까?" />
            <motion.div className="floating-panel" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }}>
              {['신규', '1~3년', '3~5년', '5년 이상'].map(opt => (
                <button key={opt} className={`chip large ${experience === opt ? 'selected' : ''}`} onClick={() => setExperience(opt)} style={{ margin: 8 }}>{opt}</button>
              ))}
            </motion.div>
          </motion.section>
        )}

        {/* Slide 16 - done (static) */}
        {step === 'done' && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="slide">
            <SlideTitle text="이제 메인페이지로 이동합니다" />
            <div className="loader">연결 중…</div>
            {/* Removed per-slide navigation */}
          </motion.section>
        )}
        {/* side navigation buttons - hidden */}
      </main>

    </div>
  )
}
