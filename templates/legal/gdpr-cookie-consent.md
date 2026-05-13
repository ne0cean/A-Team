# GDPR Cookie Consent Implementation Guide

> EU/EEA 사용자 대상 쿠키 동의 구현 가이드.

## 필수 요구사항

1. **사전 동의**: 필수 쿠키 외 모든 쿠키는 사용자 동의 전 설치 금지
2. **명시적 동의**: "이 사이트를 계속 사용하면 동의" = 불법
3. **거부 가능**: 동의만큼 쉽게 거부할 수 있어야 함
4. **세분화**: 카테고리별 선택 가능 (필수/분석/마케팅)
5. **기록**: 동의 시점, 버전, 선택 내용 저장

## 권장 도구

| 도구 | 비용 | 특징 |
|------|------|------|
| **CookieYes** | 무료~$55/월 | G2 #1, 자동 쿠키 스캔, 17+ 언어 |
| **Iubenda** | ~$9/월 | Privacy Policy + Cookie 통합 |
| **Cookiebot** | 무료~$40/월 | IAB TCF 2.0 호환 |

## 구현 체크리스트

- [ ] 쿠키 스캔 실행 (어떤 쿠키가 설치되는지 파악)
- [ ] 쿠키를 카테고리 분류 (필수/분석/마케팅/기능)
- [ ] 동의 배너 구현 (위 도구 중 택 1)
- [ ] 동의 전 비필수 쿠키 차단 스크립트
- [ ] 동의 기록 저장 (증명용)
- [ ] Privacy Policy에 쿠키 섹션 추가
- [ ] 동의 철회 메커니즘 (설정 페이지)
- [ ] 13개월마다 재동의 요청

## 코드 패턴 (동의 전 차단)

```html
<!-- 분석 스크립트: 동의 전 차단 -->
<script type="text/plain" data-cookiecategory="analytics"
        src="https://www.googletagmanager.com/gtag/js?id=GA_ID">
</script>

<!-- CookieYes가 동의 후 type="text/javascript"로 변경 -->
```

## CCPA (캘리포니아) 추가 요구

- "Do Not Sell My Personal Information" 링크 (footer)
- 판매 옵트아웃 메커니즘
- 12개월 내 2회 무료 데이터 접근 요청 처리

---
*이 가이드는 템플릿이며 법률 자문을 대체하지 않습니다.*
