'use client';

import { useState } from 'react';
import JobPostingForm from '../forms/JobPostingForm';
import TalentRegistrationForm from '../forms/TalentRegistrationForm';
import ExperienceRegistrationForm from '../forms/ExperienceRegistrationForm';
import { createExperience, createTalent } from '@/lib/supabase/queries';
import type { ExperienceRegistrationFormData, TalentRegistrationFormData } from '@/lib/validation/formSchemas';

type RegisterType = 'job' | 'talent' | 'experience' | null;

export default function RegisterButtonsSection() {
  const [activeSection, setActiveSection] = useState<RegisterType>(null);

  return (
    <>
      {/* 등록 버튼 섹션 */}
      {!activeSection && (
        <section className="md:hidden bg-white py-4 border-b">
          <div className="max-w-container mx-auto px-6">
            <div className="flex justify-around gap-4">
              {/* 공고 등록 */}
              <button
                onClick={() => setActiveSection('job')}
                className="flex flex-col items-center gap-2 flex-1"
              >
                <div className="w-14 h-14 rounded-full bg-[#a8c5e0]/20 flex items-center justify-center">
                  <img src="/icon/noti.ico" alt="공고" className="w-8 h-8" />
                </div>
                <span className="text-sm font-medium text-gray-700">공고 등록</span>
              </button>

              {/* 인력 등록 */}
              <button
                onClick={() => setActiveSection('talent')}
                className="flex flex-col items-center gap-2 flex-1"
              >
                <div className="w-14 h-14 rounded-full bg-[#c5e3d8]/20 flex items-center justify-center">
                  <img src="/icon/people.ico" alt="인력" className="w-8 h-8" />
                </div>
                <span className="text-sm font-medium text-gray-700">인력 등록</span>
              </button>

              {/* 체험 등록 */}
              <button
                onClick={() => setActiveSection('experience')}
                className="flex flex-col items-center gap-2 flex-1"
              >
                <div className="w-14 h-14 rounded-full bg-[#ffd98e]/20 flex items-center justify-center">
                  <img src="/icon/play.ico" alt="체험" className="w-8 h-8" />
                </div>
                <span className="text-sm font-medium text-gray-700">체험 등록</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 등록 폼 섹션 */}
      {activeSection === 'job' && (
        <section className="bg-white py-4 border-b">
          <div className="max-w-container mx-auto px-6">
            <JobPostingForm onClose={() => setActiveSection(null)} />
          </div>
        </section>
      )}

      {activeSection === 'talent' && (
        <section className="bg-white py-4 border-b">
          <div className="max-w-container mx-auto px-6">
            <TalentRegistrationForm
              onClose={() => setActiveSection(null)}
              onSubmit={async (form: TalentRegistrationFormData) => {
                await createTalent(form);
                alert('인력 등록이 완료되었습니다.');
                setActiveSection(null);
              }}
            />
          </div>
        </section>
      )}

      {activeSection === 'experience' && (
        <section className="bg-white py-4 border-b">
          <div className="max-w-container mx-auto px-6">
            <ExperienceRegistrationForm
              onClose={() => setActiveSection(null)}
              onSubmit={async (form: ExperienceRegistrationFormData) => {
                await createExperience(form);
                alert('체험 등록이 완료되었습니다.');
                setActiveSection(null);
              }}
            />
          </div>
        </section>
      )}
    </>
  );
}
