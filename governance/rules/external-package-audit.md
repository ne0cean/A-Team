# External Package Audit Protocol

외부 패키지/도구 도입 전 필수 보안 감사 프로세스.

## 도구

```bash
# 설치 (1회)
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
```

## 4-Phase Pipeline

### Phase 0: 메타데이터 (2분)
```bash
# GitHub 활성도
git log -1 --format="%ci %s"
# npm/PyPI 다운로드, 유지보수자 수 확인
```
- ⚠️ WARN: 6개월+ 미업데이트, 유지보수자 1명

### Phase 1: Supply Chain (5분)
```bash
# Socket.dev 웹 확인: https://socket.dev/npm/package/<name>
# 또는 CLI
syft <repo> -o json | jq '.artifacts | length'
```
체크:
- 악성 패턴 (network access, child_process)
- 설치 스크립트 (preinstall/postinstall)
- 의존성 깊이 (5+ levels = ⚠️)

🚫 BLOCK: Socket < 60, 악성 플래그

### Phase 2: 취약점 (5분)
```bash
syft <repo> -o cyclonedx-json > sbom.json
grype sbom:sbom.json --fail-on critical
```
체크:
- Critical/High CVE
- EPSS > 0.1 (실제 악용 확률)
- CISA KEV (활발히 악용 중)

🚫 BLOCK: Critical + EPSS > 0.1
⚠️ WARN: High CVE

### Phase 3: 동작 분석 (10분)
```bash
# 위험 패턴 검색
grep -rn "fetch\|axios\|http\|child_process\|eval\|exec" src/
grep -rn "process.env" src/  # 환경변수
grep -rn "https?://" src/ | grep -v localhost  # 외부 URL
```
체크:
- 네트워크 호출 → 어디로?
- 파일시스템 접근 → 어떤 경로?
- 환경변수 읽기 → 어떤 변수?
- 데이터 전송 → 외부 서버로?

🚫 BLOCK: 외부 데이터 전송 + 정당 사유 없음

### Phase 4: 품질 (5분)
```bash
npm audit  # 또는 pip audit
```
- 라이센스 호환성 (GPL 전염성 주의)
- 테스트 존재 여부

## Pass/Fail 기준

| Phase | BLOCK | WARN | PASS |
|-------|-------|------|------|
| 0 | - | 6개월+ 미업데이트 | 활발 |
| 1 | Socket<60, 악성 | 설치스크립트 | Socket≥80 |
| 2 | Critical+EPSS>0.1 | High CVE | No Critical |
| 3 | 외부전송(의심) | eval/exec | 정당사용 |
| 4 | - | GPL | MIT/Apache |

## 참고

- Trivy 사용 금지 (2026-03 공급망 공격)
- Semgrep: `pip install semgrep` (Python 3.13 이하)
