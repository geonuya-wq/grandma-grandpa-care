# My Care Companion

3040 자녀가 멀리 계신 부모님의 복약과 병원 일정을 챙기는 모바일 전용 웹앱(PWA)을 만들어줘. 

화면은 깔끔하고 따뜻한 톤(파스텔 그린/웜 화이트)으로 디자인해줘.

[필수 구현 화면 3가지]

1. 홈 대시보드 (자녀 시점)

- 상단: 부모님 프로필(예: '엄마 🌸')과 오늘의 복약 진행률(원형 프로그래스 바, 예: 2/3 완료)

- 중앙: 오늘 복약 타임라인 (아침 식후 완료 [체크됨], 점심 식후 [부모님 대기중], 저녁 식후 [예정])

- 하단: [약봉투 사진으로 빠른 등록] 플로팅 액션 버튼(FAB)

2. 약봉투 사진 등록 모달 (카메라 촬영)

- 파일 업로드 및 카메라 촬영 인터페이스

- 사진이 업로드되면 시뮬레이션으로 3초간 AI 분석 로딩 인디케이터 표시

- 분석 결과 프리뷰: 병원/약국명, 처방 기간(예: 7일분), 아침/점심/저녁 체크박스, 약 이름 목록을 보여주고 [캘린더에 일정 저장] 버튼

3. 부모님 카톡 응답 시뮬레이터 (하단 탭 또는 토글 버튼)

- 실제 부모님이 카톡 알림톡을 받았을 때의 모바일 화면 시뮬레이션

- 카톡 알림 카드: "어머니, 점심 약 드실 시간이에요!"

- 카드 아래 초대형 버튼 2개: [약 먹었어요 👍], [30분 뒤 다시 알림 ⏰]

- [약 먹었어요] 버튼을 누르면 자녀 홈 대시보드의 점심 상태가 즉시 '완료'로 바뀌고 축하 애니메이션 표시

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8f7f1203-2ace-4a06-9040-77c752d45662).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
