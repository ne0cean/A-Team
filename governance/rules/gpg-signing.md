# GPG Commit Signing Policy (CSO-L03)

A-Team 프로젝트의 커밋 서명 정책. supply-chain 무결성 보장.

## 정책

| 항목 | 정책 |
|------|------|
| 커밋 서명 | 필수 (commit.gpgsign = true) |
| 태그 서명 | 필수 (tag.gpgsign = true) |
| 키 유형 | RSA 4096 또는 Ed25519 |
| 키 만료 | 2년 권장 (무기한 허용) |
| GitHub 등록 | 필수 (Verified 배지 확인) |

## 초기 설정 (사용자 1회 액션 필요)

### 1. 설치
```bash
brew install gnupg pinentry-mac
```

### 2. 키 생성 (없는 경우)
```bash
gpg --full-generate-key
# 추천: ECC (Curve 25519) 또는 RSA 4096
# 유효기간: 2y
# Real name: GitHub 계정명
# Email: GitHub primary email (no-reply 주소 포함)
```

### 3. 자동 설정 실행
```bash
bash scripts/setup-gpg-signing.sh --global
```

### 4. GitHub에 공개키 등록
```bash
gpg --armor --export <KEY_ID> | pbcopy
# GitHub → Settings → SSH and GPG keys → New GPG key → Paste
```

### 5. 서명 확인
```bash
git log --show-signature -1
# "Good signature from ..." 확인
```

## Claude Code 자율 모드 호환성

- `claude --print` (headless) 환경에서는 pinentry GUI 팝업 불가
- 해결: `gpg-agent` + `pinentry-mac` + `allow-loopback-pinentry` 조합
  ```
  # ~/.gnupg/gpg-agent.conf
  pinentry-program /opt/homebrew/bin/pinentry-mac
  allow-loopback-pinentry
  ```
- 또는 passphrase 없는 키 (개인 개발 환경에서 허용)

## CI (GitHub Actions)

GitHub Actions에서는 서명 불필요 — 봇 커밋은 서명 예외.
`.github/workflows/ci.yml`의 커밋은 서명 없이 동작.

## 검증

```bash
# 마지막 커밋 서명 확인
git log --show-signature -1

# GitHub에서 "Verified" 배지 확인
gh api repos/{owner}/{repo}/commits/{sha} | jq '.commit.verification'
```
