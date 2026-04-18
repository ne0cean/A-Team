# WF-3: Multi-Platform Publishing (n8n)

> 비주얼 + 콘텐츠 완성 후 자동 트리거.
> Postiz API로 22+ 플랫폼에 최적 시간 스케줄링.

## 노드 구조

```
[Webhook Trigger: from WF-2]
    ↓
[Read content/repurposed/{slug}/]
    ↓
[Check Visual Assets]          — content/visuals/{slug}/ 존재 확인
    ↓
[Branch by Platform]
    ├─→ Twitter Thread → Postiz
    ├─→ LinkedIn Post → Postiz
    ├─→ Instagram Carousel → Postiz (이미지 첨부)
    ├─→ Instagram Story → Postiz
    ├─→ TikTok Script → Notion (수동 촬영용)
    ├─→ YouTube Shorts → Notion
    └─→ Email → ConvertKit
    ↓
[Aggregate Results]
    ↓
[Update publish-log.md]
    ↓
[Slack 알림: 발행 완료 + 링크]
```

## 핵심 노드

### 1. Webhook Trigger
```json
{
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "publish-content",
    "httpMethod": "POST"
  }
}
```

### 2. Read Repurposed Content (Function)
```javascript
const fs = require('fs');
const path = require('path');

const slug = $json.slug;
const date = $json.date;
const dir = `${$env.PROJECT_ROOT}/content/repurposed/${date}-${slug}`;

const files = fs.readdirSync(dir);
const content = {};

for (const file of files) {
  const platform = file.replace(/^\d+-/, '').replace('.md', '');
  content[platform] = fs.readFileSync(path.join(dir, file), 'utf-8');
}

return { content, slug, date };
```

### 3. Check Visual Assets
```javascript
const fs = require('fs');
const visualsDir = `${$env.PROJECT_ROOT}/content/visuals/${$json.date}-${$json.slug}`;

if (!fs.existsSync(visualsDir)) {
  throw new Error(`Visuals missing: ${visualsDir}\nRun /design-generate --all first.`);
}

const visuals = {
  thumbnail: `${visualsDir}/thumbnail.png`,
  ogImage: `${visualsDir}/og-image.png`,
  instagramSquare: `${visualsDir}/instagram-square.png`,
  instagramStory: `${visualsDir}/instagram-story.png`
};

// 모든 파일 존재 확인
for (const [key, path] of Object.entries(visuals)) {
  if (!fs.existsSync(path)) {
    console.warn(`Missing: ${key} (${path})`);
  }
}

return { ...$json, visuals };
```

### 4. Postiz API 호출 (Twitter)
```json
{
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "{{ $env.POSTIZ_API_URL }}/api/posts",
    "authentication": "headerAuth",
    "headerParameters": {
      "Authorization": "Bearer {{ $env.POSTIZ_API_KEY }}"
    },
    "bodyParameters": {
      "platform": "twitter",
      "content": "{{ $json.content.twitter_thread }}",
      "scheduleAt": "{{ $json.scheduleTimes.twitter }}",
      "media": []
    }
  }
}
```

### 5. 최적 시간 계산 (Function)
```javascript
const platformTimes = {
  twitter: { hour: 8, minute: 30 },     // 출근길
  linkedin: { hour: 9, minute: 0 },     // 업무 시작
  instagram: { hour: 12, minute: 0 },   // 점심
  instagram_story: { hour: 19, minute: 0 }, // 저녁
  email: { hour: 7, minute: 0 }         // 모닝 체크
};

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const scheduleTimes = {};
for (const [platform, time] of Object.entries(platformTimes)) {
  const d = new Date(tomorrow);
  d.setHours(time.hour, time.minute, 0, 0);
  scheduleTimes[platform] = d.toISOString();
}

return { ...$json, scheduleTimes };
```

### 6. Update publish-log.md (Function)
```javascript
const fs = require('fs');
const logPath = `${$env.PROJECT_ROOT}/content/publish-log.md`;

const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
const entry = `
## ${now} — ${$json.slug}

| 필드 | 값 |
|------|-----|
| content_path | content/repurposed/${$json.date}-${$json.slug}/ |
| platforms | ${Object.keys($json.publishResults).join(', ')} |
| scheduled_at | ${$json.scheduleTimes.twitter} |
| status | scheduled |
| postiz_job_ids | ${JSON.stringify($json.publishResults)} |
| visual_assets | content/visuals/${$json.date}-${$json.slug}/ |

`;

fs.appendFileSync(logPath, entry);
return { ...$json, logged: true };
```

### 7. Slack 발행 완료 알림
```json
{
  "type": "n8n-nodes-base.slack",
  "parameters": {
    "channel": "#published",
    "text": "🚀 발행 스케줄 완료: {{ $json.slug }}\n플랫폼: {{ Object.keys($json.publishResults).join(', ') }}\n포스티즈 대시보드: http://localhost:3000"
  }
}
```

## 에러 핸들링

```
[Try]
  → 발행 시도
[Catch]
  → 실패한 플랫폼만 publish-log.md status=failed로 기록
  → Slack 에러 알림 (특정 플랫폼만 실패해도 다른 건 진행)
  → 24시간 후 재시도 (별도 cron)
```

## 의존성

- Postiz 셀프호스팅 또는 클라우드 ($0 또는 $29/월)
- 각 플랫폼 OAuth 연결 (Postiz UI에서 1회 설정)
- ConvertKit (이메일, 선택)
