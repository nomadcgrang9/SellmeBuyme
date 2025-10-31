import React, { useEffect, useMemo, useState } from 'react'
import '../styles/landing.css'
import { motion } from 'motion/react'

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
  | 'phone'
  | 'review'
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
  'field',
  'phone',
  'review',
  'done'
]

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
  const chars = Array.from(text)
  const count = chars.filter(ch => ch.trim().length > 0).length
  let painted = -1

  return (
    <motion.h2 className="title" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
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
      '수업·강의',
      '멘토링',
      '방과후·돌봄',
      '교육자료 제작',
      '상담·진로',
      '행정업무 보조',
      '공고 등록',
      '대체인력 구함',
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
    if (i < order.length - 1) setStep(order[i + 1])
  }
  function goPrev() {
    const i = idxOf(step)
    if (i > 0) setStep(order[i - 1])
  }

  // validation for enabling next
  const isNextDisabled = () => {
    if (step === 'name') return name.trim().length === 0
    if (step === 'role') return role == null
    if (step === 'phone') return !isValidPhone(phone)
    return false
  }

  useEffect(() => {
    if (step !== 'done') return
    const timer = setTimeout(() => {
      window.location.href = '/'
    }, 1800)
    return () => clearTimeout(timer)
  }, [step])

  return (
    <div className="landing-root">
      <main className="slides-wrapper">
        {/* Slide 1 - greeting */}
        {step === 'greeting' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="slide hero-slide">
            <SlideTitle text="안녕하세요, 셀미바이미 입니다" />
          </motion.section>
        )}

        {/* Slide 2 - platform */}
        {step === 'platform' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="slide">
            <SlideTitle text="셀바는 학교가 중심이 되는 인력자원 매칭 플랫폼 입니다" />
          </motion.section>
        )}

        {/* Slide 3 - pain */}
        {step === 'pain' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="slide">
            <SlideTitle text="그간 발 동동구르면서 사람 구해왔던 것을" />
          </motion.section>
        )}

        {/* Slide 4 - connect */}
        {step === 'connect' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="slide">
            <SlideTitle text="전국 17개 모든 교육청 구인 게시판을 연결하고" />
          </motion.section>
        )}

        {/* Slide 5 - structure */}
        {step === 'structure' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="slide">
            <SlideTitle text="1회성 등록에 그쳤던 인력풀도 체계적으로 구조화하고자 합니다" />
          </motion.section>
        )}

        {/* Slide 6 - easy */}
        {step === 'easy' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="slide">
            <SlideTitle text="어렵지 않습니다." />
          </motion.section>
        )}

        {/* Slide 7 - ask1min */}
        {step === 'ask1min' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="slide">
            <SlideTitle text="선생님의 시간을 저희에게 1분만 주세요" highlight />
          </motion.section>
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

        {/* Slide 9 - role selection (5 options) */}
        {step === 'role' && (
          <motion.section initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="slide">
            <SlideTitle text="선생님은 어떤 역할이십니까?" />
            <motion.div className="floating-panel" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }}>
              {['교사', '강사', '교사이자 강사', '행정인력', '업체'].map(opt => (
                <button key={opt} className={`chip large ${role === opt ? 'selected' : ''}`} onClick={() => setRole(opt)} style={{ margin: 8 }}>{opt}</button>
              ))}
            </motion.div>
            {/* role description shown below the panel as animated text */}
            {role && (
              <div className="role-desc">
                <p className="role-desc-text">
                  {role === '교사'
                    ? '교사는 공고등록, 인력구하거나 협력강사 구하는 업무를 맡은, 또는 다양한 인력자원을 활용해서 교육과정을 풍성히 구성하는 사람입니다.'
                    : role === '강사'
                    ? '강사는 방과후 또는 돌봄, 정규수업시간 협력수업 또는 교직원 및 학부모 대상 성인 수업도 가능한 사람입니다.'
                    : role === '교사이자 강사'
                    ? '교사이자 강사는 정규교원이면서도 강사로서 전문분야가 있어 교직원 및 학부모 대상 연수가 가능한 사람입니다.'
                    : role === '행정인력'
                    ? '행정인력은 조리사, 행정실무, 자원봉사자 등 학교 교육을 지원하는 사람입니다.'
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

        {/* Slide 11 - field */}
        {step === 'field' && (
          <motion.section initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="slide">
            <SlideTitle text="어떤 분야에 관심이 있으십니까?" />
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

        {/* Slide 14 - done (static) */}
        {step === 'done' && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="slide">
            <SlideTitle text="감사합니다 — 바로 메인으로 이동합니다." />
            <div className="loader">연결 중…</div>
            {/* Removed per-slide navigation */}
          </motion.section>
        )}
        {/* global bottom nav */}
        <div className="global-nav">
          <button className="btn-prev" onClick={goPrev} disabled={idxOf(step) === 0}>
            이전
          </button>
          <button className="btn-next" onClick={goNext} disabled={isNextDisabled() || step === 'done'}>
            다음
          </button>
        </div>
      </main>

    </div>
  )
}
