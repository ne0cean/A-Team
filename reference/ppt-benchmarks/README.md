# PPT Benchmark Corpus

공개 컨설팅펌 자료를 기준점으로 삼아 A-Team PPT 엔진을 개선하기 위한 벤치마크 코퍼스.

## 원칙

- 공식 사이트에서 공개 배포한 자료만 사용한다.
- PDF 원문은 가능하면 재다운로드 가능한 URL로 추적하고, 레포에는 URL과 분석 메타데이터를 우선 저장한다.
- 유출 템플릿, 비공식 재배포본, 저작권 상태가 불명확한 슬라이드는 사용하지 않는다.
- 벤치마크는 복제 대상이 아니라 품질 기준이다. 레이아웃 문법, 정보 밀도, 제목 방식, 차트 언어를 분석해 A-Team 자체 템플릿으로 재구성한다.

## 구조

- `manifest.json` — 공식 소스 목록, 평가 루브릭, 선별 기준
- `pdfs/` — 로컬에서 내려받은 PDF 캐시. Git 추적 제외 권장
- `slides/` — PDF를 PNG로 렌더링한 로컬 이미지 캐시. Git 추적 제외 권장
- `notes/` — 사람이 선별한 슬라이드 분석 메모

## 사용법

```bash
node scripts/ppt/benchmark-corpus.mjs validate
node scripts/ppt/benchmark-corpus.mjs list
node scripts/ppt/benchmark-corpus.mjs fetch --dry-run
node scripts/ppt/benchmark-corpus.mjs fetch
node scripts/ppt/benchmark-corpus.mjs render
```

`render`는 `pdftoppm`이 설치되어 있을 때만 동작한다.

## 선별 기준

좋은 벤치마크 슬라이드는 다음 중 하나 이상을 충족해야 한다.

- 제목이 단순 주제가 아니라 결론이나 시사점을 말한다.
- 표, 차트, 매트릭스, 타임라인, 이슈트리 등 컨설팅식 도표 문법이 명확하다.
- 정보 밀도가 높지만 읽는 순서가 분명하다.
- 주석, 출처, 콜아웃, 강조색이 의사결정에 필요한 위계를 만든다.
- 한 장의 메시지가 분명하고 다음 장과 논리적으로 이어진다.

