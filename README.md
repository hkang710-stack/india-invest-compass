# 인도 주별 투자 나침반 (India Invest Compass)

HUFS H-UP 프로젝트 — 진출 산업과 중요 조건을 고르면 인도 8개 주의 점수를 계산해 추천 카드와 전체 순위를 보여줍니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 배포용 빌드
```

> 이 PC는 보안 정책(Application Control)으로 Turbopack 네이티브 바이너리가 차단되어 있어 `--webpack`으로 실행합니다.

## 데이터 고치기 (코드 수정 없이)

| 파일 | 내용 |
|---|---|
| `data/states.json` | 8개 주 기본정보, 조건 점수(`scores`), 산업 적합도(`industryFit`), 근거(`basis`) |
| `data/industries.json` | 산업 목록, 산업별 추천 조건 |
| `data/criteria.json` | 조건 목록, 산업 적합도 비중(`industryWeight`), 거점 상태별 가중치 |
| `data/korean-sites.json` | 한국 기업 거점 (「한국 대기업 인도 거점 지도」에서 변환) — 한국 기업 클러스터 점수를 자동 계산 |

점수는 모두 0~100. 인건비는 **부담이 낮을수록 높은 점수**입니다.

총점 = 산업 적합도 × industryWeight + 선택 조건 평균 × (1 − industryWeight)

## 환경변수

`.env.example`을 `.env.local`로 복사해 사용합니다. API 키는 서버 코드에서만 읽고, `NEXT_PUBLIC_` 접두사를 붙이지 않습니다.

## 폴더 구조

```
data/                 바꾸기 쉬운 JSON 데이터
src/app/              페이지 (Next.js App Router)
src/app/api/          (2단계) 서버 API — 뉴스 검색, 질문하기, cron 수집
src/components/       화면 조각 (선택 패널, 추천 카드, 순위)
src/lib/              데이터 로딩·점수 계산 (scoring.ts)
scripts/              (2단계) GDELT 수집·AI 요약 배치
supabase/migrations/  (2단계) DB 스키마
```
