# Design Enterprise Stack — $300-500/월

> Pro Stack으로 월 $2,000+ 수익 달성 후, 또는 클라이언트 에이전시 운영 시.
> 브랜드 학습 AI + 완전 자동화 파이프라인 + 비디오 대량 생성.

## 구성

| 역할 | 도구 | 비용 |
|------|------|------|
| AI 이미지 | Midjourney Pro (스타일 학습) | $60/월 |
| 비디오 생성 | Runway ML Standard | $35/월 |
| AI 아바타 | Synthesia Starter | $29/월 |
| 디자인 자동화 | Figma Organization | $45/월 |
| Canva Enterprise | 팀 + 브랜드 킷 + API | $30/월 |
| 이미지 편집 | Adobe Creative Cloud | $55/월 |
| 자산 관리 | Brandfolder Starter | $50/월 |
| **합계** | | **$304/월** |

## Pro 대비 핵심 차이

### 1. Midjourney Pro — 브랜드 스타일 완전 학습

**Style References (`--sref`)** + **Character References (`--cref`)**:
```
브랜드 스타일 학습:
1. 브랜드를 잘 표현하는 이미지 20-30장 선별
2. Midjourney /tune 으로 학습 → style code 발급
3. 이후 모든 프롬프트에 --sref [code] 추가

효과:
→ "AI 만든 것" 느낌 대신 일관된 브랜드 비주얼
→ 새 프롬프트도 브랜드 팔레트/구성/분위기 자동 반영
→ 여러 브랜드 운영 시 각각 style code 관리
```

**API 자동화**:
```python
# Midjourney API (비공식이지만 안정적)
import requests

def generate_brand_image(prompt: str, style_ref: str) -> str:
    response = requests.post(
        "https://api.midjourney.com/v1/imagine",
        json={
            "prompt": f"{prompt} --sref {style_ref} --ar 16:9 --style raw",
            "webhook_url": "https://your-webhook.com/midjourney"
        }
    )
    return response.json()["task_id"]
```

Make.com 자동화:
```
블로그 발행 → Make.com 트리거
  → Midjourney API → 썸네일 생성
  → 결과 webhook → Canva API → 텍스트 추가
  → S3 업로드 → WordPress 자동 첨부
```

### 2. Synthesia — AI 아바타 비디오

블로그 → AI 아바타 낭독 → YouTube 자동화:

```
입력: 블로그 포스트 텍스트 (자동 요약)
출력: 2-5분 AI 아바타 비디오

워크플로우:
1. 블로그 발행 후 Make.com 트리거
2. Claude Haiku → 2분 요약 스크립트 생성
3. Synthesia API → 아바타가 낭독
4. 자동 자막 + 배경 음악 추가
5. YouTube + LinkedIn 자동 업로드 (Postiz MCP)
```

다국어 버전:
```
한국어 원문 → Claude → 영어/일본어/중국어 번역
→ Synthesia 해당 언어 아바타 선택
→ 3개 언어 동시 발행 (글로벌 확장)
```

### 3. Brandfolder — 자산 관리 시스템

30개 이상의 자산이 쌓이면 관리가 필요:
```
Brandfolder 역할:
- 모든 승인된 비주얼 자산 중앙 저장
- 버전 관리 (v1, v2 추적)
- AI 태깅 (자동으로 "썸네일", "Instagram", "2026-Q1" 태그)
- 팀 공유 (외주/협력자에게 특정 자산만 공유)

API 연동:
→ 발행 승인된 자산이 자동으로 Brandfolder에 아카이브
→ 슬랙/노션에서 자산 검색 가능 (Brandfolder 통합)
```

### 4. Canva Enterprise API — 대량 생성

1개 디자인 → 100개 맞춤 버전:
```python
# Canva API: 템플릿에 데이터 주입
import canva

template = canva.designs.get("template-id")

# CSV에서 데이터 로드
import csv
with open("content-list.csv") as f:
    for row in csv.DictReader(f):
        design = template.create({
            "title": row["title"],
            "image_url": row["midjourney_image"],
            "date": row["publish_date"]
        })
        design.export(f"output/{row['slug']}-thumbnail.png")
```

활용:
- 월 40개 블로그 → 40개 썸네일 10분 내 자동 생성
- 시즌별 캠페인 → 100개 광고 소재 변형
- A/B 테스트 → 5개 헤드라인 변형 × 20개 이미지 = 100개 조합

## 완전 자동화 파이프라인

```
[블로그 초안 승인]
  ↓
Make.com 트리거
  ↓
Claude → Art Direction Brief 자동 생성
  ↓
Midjourney API → 이미지 생성 (스타일 학습 자동 적용)
  ↓
Canva API → 텍스트 오버레이 + 플랫폼별 크기 변환
  ↓
/design-audit 자동 실행
  ↓
AI 냄새 ≤4 → Brandfolder 저장
  ↓
Postiz MCP → 멀티플랫폼 자동 발행
  ↓
Synthesia API → 비디오 버전 생성
  ↓
YouTube + TikTok 자동 업로드

총 인간 개입: 0분 (승인만 하면 자동)
소요 시간: 30-45분 (비동기)
비용: 이미지 $0.10-0.30 + 비디오 $1-3
```

## 예상 아웃풋 (월간)

- 정적 이미지: 150-200개
- AI 아바타 비디오: 30-40개
- 자동 생성 비디오 클립 (Runway): 50-80개
- 멀티플랫폼 커버리지: 모든 채널
- 인간 개입 시간: 주 2-3시간

## ROI

```
월 $300 투입 대비:
- 디자이너 비용 절감: $3,000-5,000/월 (프리랜서 비교)
- 콘텐츠 생산량: 3-5× 증가
- 브랜드 일관성: 95%+ (수동 대비 40% 향상)
- 손익분기: 첫 달 (비용 절감만으로)
```
