# 하이브리드 앱 구현 계획 (Mac 없이 진행)

## 📋 프로젝트 요구사항
- **환경**: Windows 개발 환경 (Mac 없음)
- **예산**: $200 (₩270,000)
- **출시 목표**: 3개월 후
- **핵심 기능**: 푸시 알림 (iOS + Android)
- **목표 플랫폼**: Google Play Store + Apple App Store

## 💰 예산 배분

### 필수 비용 ($124)
| 항목 | 비용 | 설명 |
|------|------|------|
| Google Play 등록 | $25 | 1회 결제 (평생) |
| Apple Developer | $99 | 연간 구독 |
| **합계** | **$124** | |

### 클라우드 빌드 서비스 ($0 - 무료 티어 활용)
| 서비스 | 무료 티어 | 유료 플랜 |
|--------|-----------|-----------|
| **EAS Build** | 30 빌드/월 | $29/월 (무제한) |
| Appetize.io | 100분/월 | $40/월 |
| Firebase | 무제한 푸시 | 무료 |

**전략**: EAS Build 무료 티어로 충분 (월 30회 빌드는 개발+배포에 넉넉함)

### 예비 예산 ($76)
- 긴급 유료 빌드 필요 시 1개월 EAS Pro ($29)
- 또는 Apple Push Notification 인증서 대행 서비스

## 🏗️ 기술 스택 결정

### ✅ 선택: Capacitor + EAS Build

**Capacitor를 선택한 이유**:
1. ✅ 기존 React 코드 100% 재사용
2. ✅ Vite + React 18 완벽 호환
3. ✅ EAS Build로 Mac 없이 iOS 빌드 가능
4. ✅ 푸시 알림 네이티브 지원 (iOS + Android)
5. ✅ 학습 곡선 낮음 (웹 개발자 친화적)

**대안 (React Native Expo)와 비교**:
| 항목 | Capacitor | React Native |
|------|-----------|--------------|
| 기존 코드 재사용 | 100% | 30-50% |
| 개발 기간 | 2주 | 6-8주 |
| Mac 필요 여부 | ❌ (EAS 활용) | ❌ (EAS 활용) |
| 푸시 알림 | ✅ 네이티브 | ✅ 네이티브 |
| 학습 난이도 | 낮음 | 높음 |

## 📅 3개월 타임라인

### Week 1-2: Capacitor 초기 설정 (2주)
**목표**: Android/iOS 프로젝트 생성 및 기본 빌드 성공

#### Day 1-3: Capacitor 설치 및 Android 설정
```bash
# Capacitor 설치
npm install @capacitor/core @capacitor/cli
npx cap init "셀미바이미" "com.sellmebuyme.app" --web-dir=dist

# Android 추가
npm install @capacitor/android
npx cap add android

# 빌드 및 동기화
npm run build
npx cap sync android
npx cap open android  # Android Studio 열림 (설치 필요)
```

**준비물**:
- ✅ Android Studio 설치 (무료)
- ✅ Android SDK 설치
- ✅ USB 디버깅 활성화된 Android 기기 (또는 에뮬레이터)

#### Day 4-7: iOS 프로젝트 설정 (Mac 없이)
```bash
# iOS 프로젝트 추가
npm install @capacitor/ios
npx cap add ios
```

**iOS 빌드 전략 (Mac 없이)**:
1. **EAS Build 계정 생성** (무료)
   ```bash
   npm install -g eas-cli
   eas login
   eas build:configure
   ```

2. **Apple Developer 계정 준비**:
   - Apple Developer Program 가입 ($99/year)
   - App ID 생성: `com.sellmebuyme.app`
   - Push Notification 권한 활성화
   - Certificates, Identifiers, Profiles 설정

3. **eas.json 설정**:
   ```json
   {
     "build": {
       "production": {
         "android": {
           "buildType": "apk"
         },
         "ios": {
           "buildType": "archive"
         }
       }
     }
   }
   ```

4. **클라우드 iOS 빌드 실행**:
   ```bash
   eas build --platform ios --profile production
   ```

#### Day 8-10: 푸시 알림 플러그인 설치
```bash
# 필수 플러그인
npm install @capacitor/push-notifications
npm install @capacitor/splash-screen
npm install @capacitor/status-bar
npm install @capacitor/app
npm install @capacitor/browser

# Firebase 설정 (Android)
npm install firebase
```

**Firebase 프로젝트 생성**:
1. Firebase Console에서 프로젝트 생성
2. Android 앱 등록: `com.sellmebuyme.app`
3. `google-services.json` 다운로드 → `android/app/`에 배치
4. iOS 앱 등록: `com.sellmebuyme.app`
5. `GoogleService-Info.plist` 다운로드 → EAS Build 설정에 추가

#### Day 11-14: 테스트 빌드 및 검증
```bash
# Android 로컬 빌드 및 테스트
npm run build
npx cap sync android
npx cap run android --target=device

# iOS 클라우드 빌드 (EAS)
eas build --platform ios --profile development
# → TestFlight 배포하여 실제 iOS 기기에서 테스트
```

---

### Week 3-4: 푸시 알림 구현 (2주)

#### Day 15-18: 푸시 알림 클라이언트 구현

**1. Capacitor Push 초기화** (`src/lib/push/capacitorPush.ts`)
```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase/client';

export const initCapacitorPush = async (userId: string) => {
  // 네이티브 앱에서만 실행
  if (!Capacitor.isNativePlatform()) {
    console.log('Not a native platform, skipping push initialization');
    return;
  }

  // 1. 권한 요청
  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.warn('Push notification permission denied');
    return;
  }

  // 2. 푸시 등록
  await PushNotifications.register();

  // 3. 토큰 수신 리스너
  await PushNotifications.addListener('registration', async (token) => {
    console.log('Push token:', token.value);

    // Supabase에 토큰 저장
    await supabase.from('push_tokens').upsert({
      user_id: userId,
      token: token.value,
      platform: Capacitor.getPlatform(), // 'ios' or 'android'
      created_at: new Date().toISOString(),
    });
  });

  // 4. 알림 수신 리스너 (앱이 foreground일 때)
  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);

    // 커스텀 in-app 알림 표시 (선택 사항)
    showInAppNotification(notification.title, notification.body);
  });

  // 5. 알림 탭 리스너 (앱 열기)
  await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Push action performed:', action);

    // 딥링크 처리 (예: 특정 공고로 이동)
    const data = action.notification.data;
    if (data.jobId) {
      navigateToJob(data.jobId);
    }
  });
};

// 알림 권한 재요청 함수
export const requestPushPermission = async () => {
  if (!Capacitor.isNativePlatform()) return false;

  const permStatus = await PushNotifications.requestPermissions();
  return permStatus.receive === 'granted';
};

// 푸시 토큰 삭제 (로그아웃 시)
export const removePushToken = async (userId: string) => {
  await supabase.from('push_tokens').delete().eq('user_id', userId);
};
```

**2. 앱 초기화 시 푸시 설정** (`src/App.tsx` 수정)
```typescript
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { initCapacitorPush } from '@/lib/push/capacitorPush';
import { useAuthStore } from '@/stores/authStore';

function App() {
  const { user } = useAuthStore();

  useEffect(() => {
    // 네이티브 앱에서 로그인 시 푸시 초기화
    if (Capacitor.isNativePlatform() && user?.id) {
      initCapacitorPush(user.id).catch(console.error);
    }
  }, [user?.id]);

  // 기존 App 코드...
}
```

#### Day 19-21: Supabase 푸시 전송 시스템 구축

**1. 데이터베이스 테이블 생성** (SQL Migration)
```sql
-- push_tokens 테이블
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_platform ON push_tokens(platform);

-- RLS 정책
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own push tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- notification_preferences 테이블
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  new_jobs BOOLEAN DEFAULT true,
  deadline_reminders BOOLEAN DEFAULT true,
  ai_recommendations BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);
```

**2. Supabase Edge Function: 푸시 전송** (`supabase/functions/send-push/index.ts`)
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Firebase Admin SDK for FCM (Android + iOS via FCM)
const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')!;

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  try {
    const { userId, title, body, data }: PushPayload = await req.json();

    // Supabase 클라이언트 (service_role로 모든 토큰 접근)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. 사용자의 푸시 토큰 가져오기
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId);

    if (tokenError || !tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ error: 'No push tokens found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. FCM으로 푸시 전송 (Android + iOS 모두)
    const results = await Promise.all(
      tokens.map(async ({ token, platform }) => {
        const fcmPayload = {
          to: token,
          notification: {
            title,
            body,
            sound: 'default',
          },
          data: data || {},
          priority: 'high',
        };

        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${FIREBASE_SERVER_KEY}`,
          },
          body: JSON.stringify(fcmPayload),
        });

        const result = await response.json();
        return { platform, success: result.success === 1, result };
      })
    );

    // 3. last_used_at 업데이트
    await supabase
      .from('push_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', userId);

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.filter((r) => r.success).length,
        total: results.length,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Push send error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

**3. Edge Function 배포**
```bash
# Firebase Server Key를 Supabase Secret으로 설정
supabase secrets set FIREBASE_SERVER_KEY=your_firebase_server_key

# Edge Function 배포
supabase functions deploy send-push
```

#### Day 22-25: 알림 시나리오 구현

**1. 새 공고 알림** (Database Trigger)
```sql
-- job_postings INSERT 트리거로 푸시 전송
CREATE OR REPLACE FUNCTION notify_new_job_posting()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- 알림 설정이 활성화된 사용자들에게 푸시 전송
  FOR user_record IN
    SELECT DISTINCT pt.user_id, up.display_name
    FROM push_tokens pt
    INNER JOIN notification_preferences np ON pt.user_id = np.user_id
    INNER JOIN user_profiles up ON pt.user_id = up.id
    WHERE np.new_jobs = true
      AND up.interest_regions && ARRAY[NEW.location] -- 관심 지역 매칭
  LOOP
    -- Supabase Edge Function 호출 (비동기)
    PERFORM net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
      body := jsonb_build_object(
        'userId', user_record.user_id,
        'title', '새 공고가 등록되었어요!',
        'body', NEW.organization || ' - ' || NEW.title,
        'data', jsonb_build_object('jobId', NEW.id, 'type', 'new_job')
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_job
  AFTER INSERT ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_job_posting();
```

**2. 마감 임박 알림** (Cron Job via Supabase Edge Function)
```typescript
// supabase/functions/deadline-reminders/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 3일 이내 마감 공고 조회
  const threeDaysLater = new Date();
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const { data: jobs } = await supabase
    .from('job_postings')
    .select('id, title, organization, deadline')
    .lte('deadline', threeDaysLater.toISOString().split('T')[0])
    .gte('deadline', new Date().toISOString().split('T')[0]);

  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ message: 'No deadlines approaching' }), {
      status: 200,
    });
  }

  // 관심 공고를 북마크한 사용자들에게 알림
  for (const job of jobs) {
    const { data: bookmarks } = await supabase
      .from('bookmarks')
      .select('user_id')
      .eq('job_id', job.id);

    if (bookmarks) {
      for (const { user_id } of bookmarks) {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user_id,
            title: '마감 임박! ⏰',
            body: `${job.organization} - ${job.title} (${job.deadline} 마감)`,
            data: { jobId: job.id, type: 'deadline_reminder' },
          }),
        });
      }
    }
  }

  return new Response(JSON.stringify({ success: true, processed: jobs.length }), {
    status: 200,
  });
});
```

**Cron 설정** (Supabase Dashboard > Edge Functions > Cron)
```
0 9 * * *  # 매일 오전 9시 실행
```

#### Day 26-28: 푸시 알림 UI 설정 화면

**1. 알림 설정 컴포넌트** (`src/components/settings/NotificationSettings.tsx`)
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { requestPushPermission } from '@/lib/push/capacitorPush';

export default function NotificationSettings() {
  const { user } = useAuthStore();
  const [preferences, setPreferences] = useState({
    new_jobs: true,
    deadline_reminders: true,
    ai_recommendations: true,
    reminder_days_before: 3,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user?.id]);

  const loadPreferences = async () => {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user!.id)
      .single();

    if (data) {
      setPreferences(data);
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      await supabase.from('notification_preferences').upsert({
        user_id: user!.id,
        ...preferences,
        updated_at: new Date().toISOString(),
      });
      alert('알림 설정이 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('저장 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    if (granted) {
      alert('푸시 알림이 활성화되었습니다.');
    } else {
      alert('푸시 알림 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.');
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-bold">알림 설정</h2>

      <div className="space-y-4">
        <label className="flex items-center justify-between">
          <span>새 공고 알림</span>
          <input
            type="checkbox"
            checked={preferences.new_jobs}
            onChange={(e) =>
              setPreferences({ ...preferences, new_jobs: e.target.checked })
            }
            className="w-5 h-5"
          />
        </label>

        <label className="flex items-center justify-between">
          <span>마감 임박 알림</span>
          <input
            type="checkbox"
            checked={preferences.deadline_reminders}
            onChange={(e) =>
              setPreferences({ ...preferences, deadline_reminders: e.target.checked })
            }
            className="w-5 h-5"
          />
        </label>

        <label className="flex items-center justify-between">
          <span>AI 추천 알림</span>
          <input
            type="checkbox"
            checked={preferences.ai_recommendations}
            onChange={(e) =>
              setPreferences({ ...preferences, ai_recommendations: e.target.checked })
            }
            className="w-5 h-5"
          />
        </label>

        <div>
          <label className="block mb-2">마감 며칠 전 알림</label>
          <select
            value={preferences.reminder_days_before}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                reminder_days_before: Number(e.target.value),
              })
            }
            className="w-full p-2 border rounded"
          >
            <option value={1}>1일 전</option>
            <option value={3}>3일 전</option>
            <option value={7}>7일 전</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={savePreferences}
          disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-lg font-semibold"
        >
          {loading ? '저장 중...' : '설정 저장'}
        </button>

        <button
          onClick={handleEnablePush}
          className="w-full py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold"
        >
          푸시 알림 권한 요청
        </button>
      </div>
    </div>
  );
}
```

---

### Week 5-8: 모바일 UI 최적화 (4주)

#### Week 5: 모바일 헤더 및 필터 최적화
- BottomSheet 필터 UI 구현
- Pull to Refresh 구현
- 모바일 헤더 분리 (DesktopHeader vs MobileHeader)

#### Week 6: 성능 최적화
- App.tsx 코드 분할 (1,105줄 → 300줄 이하로 분리)
- 이미지 최적화 (lazy loading, WebP 변환)
- 초기 로딩 속도 개선 (Core Web Vitals)

#### Week 7: 네이티브 앱 기능 추가
- 스플래시 스크린 커스터마이징
- 상태바 색상 설정 (iOS/Android)
- 오프라인 페이지 구현
- 앱 아이콘 및 스크린샷 제작

#### Week 8: 앱 스토어 제출 준비
- Google Play Console 계정 생성 ($25)
- Apple Developer 계정 가입 ($99)
- 앱 설명, 스크린샷, 프리뷰 비디오 준비
- 개인정보처리방침 페이지 작성

---

### Week 9-12: 스토어 등록 및 베타 테스트 (4주)

#### Week 9: Android 배포 (Google Play)
```bash
# Release APK 빌드
cd android
./gradlew bundleRelease  # AAB 파일 생성
# → android/app/build/outputs/bundle/release/app-release.aab

# Google Play Console 업로드
# 1. Internal Testing 트랙에 업로드
# 2. 베타 테스터 초대 (이메일 리스트)
# 3. 승인 대기 (1-3일)
```

#### Week 10: iOS 배포 (App Store)
```bash
# EAS Build로 production iOS 빌드
eas build --platform ios --profile production

# App Store Connect에서 설정
# 1. TestFlight에 업로드 (자동)
# 2. 외부 테스터 초대
# 3. App Store 심사 제출
# 4. 승인 대기 (평균 24-48시간)
```

#### Week 11-12: 베타 테스트 및 버그 수정
- Internal Testing: 팀 내부 테스트 (5-10명)
- Closed Beta: 지인 테스터 초대 (20-50명)
- 피드백 수집 및 버그 수정
- 푸시 알림 실제 시나리오 테스트

---

## 🔧 Mac 없이 iOS 개발하는 방법

### EAS Build 사용 시나리오

**1. 초기 설정 (Windows에서)**
```bash
# EAS CLI 설치
npm install -g eas-cli

# Expo 계정 로그인
eas login

# 프로젝트에 EAS 설정
eas build:configure
```

**2. eas.json 설정**
```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "buildType": "archive"
      },
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD123456"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "production"
      }
    }
  }
}
```

**3. iOS 빌드 실행 (클라우드)**
```bash
# Development 빌드 (테스트용)
eas build --platform ios --profile development

# Production 빌드 (앱스토어 제출용)
eas build --platform ios --profile production

# 빌드 진행 상황 모니터링
# → EAS 웹 대시보드에서 실시간 로그 확인
# → 빌드 완료 시 이메일 알림
# → .ipa 파일 다운로드 링크 제공
```

**4. TestFlight 자동 배포**
```bash
# 빌드와 동시에 TestFlight 업로드
eas submit --platform ios --profile production
```

**5. 빌드 크레딧 관리**
- 무료 티어: 월 30회 빌드
- 개발 초기: 15-20회 소진 (버그 수정, 테스트)
- 출시 후: 월 5-10회 소진 (업데이트)
- 유료 전환 필요 시: $29/월 (무제한)

---

## 📱 테스트 전략 (Mac 없이)

### Android 테스트
1. **로컬 디바이스**: USB 연결 → `npx cap run android`
2. **Android Studio 에뮬레이터**: Pixel 5 이미지 사용
3. **Firebase Test Lab**: 실제 디바이스 클라우드 테스트

### iOS 테스트
1. **EAS Build + TestFlight**: 클라우드 빌드 → TestFlight 배포 → 실제 iPhone에서 테스트
2. **Appetize.io**: 브라우저 기반 iOS 시뮬레이터 (무료 100분/월)
3. **BrowserStack**: 실제 iOS 디바이스 원격 접속 (유료 $39/월)

**추천 방식**: EAS Build + TestFlight (무료)
- 실제 iPhone 필요 (본인 또는 지인 것 빌려서 테스트)
- TestFlight 링크 공유하면 누구나 테스트 가능

---

## ✅ 체크리스트

### Phase 1: 개발 환경 (Week 1-2)
- [ ] Android Studio 설치
- [ ] Capacitor 프로젝트 초기화
- [ ] EAS CLI 설치 및 계정 생성
- [ ] Firebase 프로젝트 생성 (FCM 설정)
- [ ] Apple Developer 계정 가입 ($99)
- [ ] Google Play Console 계정 생성 ($25)

### Phase 2: 푸시 알림 구현 (Week 3-4)
- [ ] `@capacitor/push-notifications` 설치
- [ ] Android FCM 설정 (`google-services.json`)
- [ ] iOS APNs 설정 (EAS Build 환경 변수)
- [ ] Supabase `push_tokens` 테이블 생성
- [ ] Edge Function `send-push` 구현
- [ ] Database Trigger (새 공고 알림)
- [ ] Cron Job (마감 임박 알림)
- [ ] 알림 설정 UI 구현

### Phase 3: 모바일 UI 최적화 (Week 5-8)
- [ ] 모바일 헤더 분리 (DesktopHeader vs MobileHeader)
- [ ] BottomSheet 필터 구현
- [ ] Pull to Refresh 구현
- [ ] App.tsx 코드 분할 (< 300줄)
- [ ] 이미지 lazy loading
- [ ] 스플래시 스크린 커스터마이징
- [ ] 오프라인 페이지 구현

### Phase 4: 앱 스토어 준비 (Week 7-8)
- [ ] 앱 아이콘 제작 (1024x1024)
- [ ] 스크린샷 제작 (각 플랫폼 5-8장)
- [ ] 앱 설명 작성 (한글 + 영문)
- [ ] 개인정보처리방침 페이지
- [ ] 서비스 이용약관 페이지

### Phase 5: 스토어 등록 (Week 9-10)
- [ ] Google Play Internal Testing 업로드
- [ ] TestFlight 베타 테스트 시작
- [ ] 베타 테스터 피드백 수집
- [ ] 버그 수정 및 재배포
- [ ] Google Play Production 배포
- [ ] App Store 심사 제출

---

## 💡 중요 팁

### iOS 개발 시 주의사항 (Mac 없이)
1. **인증서 관리**: Apple Developer Portal에서 수동으로 생성
   - Development Certificate
   - Distribution Certificate
   - Push Notification Certificate (APNs)
   - Provisioning Profiles

2. **EAS Build 환경 변수 설정**:
   ```bash
   # Apple 인증서를 EAS에 등록
   eas credentials
   # → iOS 선택
   # → "Set up Push Notifications"
   # → P8 key 업로드
   ```

3. **디버깅 방법**:
   - EAS Build 로그 확인 (웹 대시보드)
   - TestFlight 크래시 로그 (App Store Connect)
   - Sentry/Firebase Crashlytics 연동 (선택 사항)

### 예산 절약 팁
1. **EAS Build 무료 티어 최대 활용**:
   - 로컬 Android 빌드 우선 (무제한)
   - iOS는 검증된 코드만 클라우드 빌드 (월 30회 제한)

2. **Firebase 무료 티어**:
   - FCM 푸시는 완전 무료 (무제한)
   - Crashlytics도 무료

3. **스토어 수수료**:
   - Google Play: $25 (1회)
   - Apple: $99 (연간) - 갱신 필수

### 타임라인 단축 전략
- Week 1-4: 푸시 알림에 집중 (핵심 기능 우선)
- Week 5-8: UI 최적화는 병렬 진행 가능
- Week 9-12: 스토어 등록은 심사 대기 시간 고려

---

## 🚀 다음 단계

이제 구체적인 구현을 시작할까요?

**추천 시작 순서**:
1. ✅ Capacitor 초기 설정 (Day 1-3)
2. ✅ Android Studio 설치 및 Android 프로젝트 빌드
3. ✅ EAS Build 계정 생성 및 iOS 프로젝트 추가
4. ✅ Firebase 프로젝트 생성 (FCM 설정)

시작하시겠습니까? 첫 번째 단계부터 같이 진행해드리겠습니다! 🎯
