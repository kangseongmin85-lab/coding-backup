# EO2 부활 가이드 — Step 1: APK 설치 (Windows)

> 목표: 죽은 Electric Objects 서버에서 벗어나, EO2가 우리가 원하는 앱을 실행하게 만들기
> 예상 소요 시간: 30분 ~ 1시간 (처음 하시면 1시간)
> 코딩 지식 필요 없음 — 명령어 복사/붙여넣기만 하면 됨

---

## 준비물 체크리스트

- [ ] Windows PC (사장님 컴퓨터)
- [ ] **Micro USB 케이블** (중요: 데이터 전송 가능한 것 — 충전 전용 케이블은 안 됨)
- [ ] EO2 본체 (전원 켜진 상태)
- [ ] 인터넷 연결
- [ ] 약 1~2GB의 디스크 여유 공간

> **케이블 팁**: Micro USB 케이블이 데이터 전송 가능한지 확인하려면, 핸드폰을 PC에 연결했을 때 파일 탐색이 되는지 보면 돼요. 안 되면 데이터 전송 안 되는 케이블입니다.

---

## Part 1: ADB(Android Debug Bridge) 설치

ADB는 PC에서 Android 기기를 제어하는 도구예요. EO2가 Android 기반이라서 이게 필요합니다.

### 1-1. SDK Platform Tools 다운로드

1. 웹브라우저에서 다음 주소 접속:
   `https://developer.android.com/tools/releases/platform-tools`
2. 페이지 상단의 **"Download SDK Platform-Tools for Windows"** 클릭
3. 약관 동의 체크 → 다운로드 시작
4. zip 파일이 다운로드됨 (예: `platform-tools-latest-windows.zip`)

### 1-2. 압축 풀기

1. 다운받은 zip 파일을 **C 드라이브 루트**에 복사
2. 우클릭 → "압축 풀기" → 위치를 `C:\` 로 지정
3. 결과: `C:\platform-tools\` 폴더 생성됨
4. 폴더 안에 `adb.exe`가 있는지 확인

> **왜 C 드라이브 루트?** 경로에 한글이나 공백 들어가면 명령어 실행 시 문제 생길 수 있어요. `C:\platform-tools\` 가 가장 안전합니다.

### 1-3. ADB 동작 확인

1. **Windows 키 + R** 동시에 누르기
2. 입력창에 `cmd` 입력 후 엔터 → 검은 명령 프롬프트 창 열림
3. 다음 명령어를 한 줄씩 입력 (각 줄마다 엔터):

```
cd C:\platform-tools
adb version
```

4. 결과로 `Android Debug Bridge version 1.0.xx` 같은 메시지가 나오면 성공.
5. `'adb'은(는) 내부 또는 외부 명령... 아닙니다` 에러가 나오면 → `C:\platform-tools` 폴더에 `adb.exe`가 있는지 다시 확인.

---

## Part 2: 대체 앱(APK) 다운로드

`spalt/EO1` 버전을 먼저 시도합니다 (가장 검증됨, 자료 많음).

### 2-1. EO1.apk 다운로드

1. 웹브라우저로 접속:
   `https://github.com/spalt/EO1/releases`
2. 최신 릴리즈 (v0.0.9 이상) 클릭
3. **EO1.apk** 파일을 다운로드
4. 다운받은 파일을 **`C:\platform-tools\`** 폴더로 이동

### 2-2. (선택) Partner App도 다운로드

폰에서 EO2로 사진 푸시하려면 Partner 앱도 필요해요.
- `https://github.com/spalt/EO1/releases/download/0.0.6/EO1-Partner.apk`
- 이건 사장님 폰에 설치할 거니까 일단 다운만 받아두기

---

## Part 3: EO2와 PC 연결

### 3-1. USB 케이블 연결

1. EO2 뒷면 micro USB 포트에 케이블 연결 (사장님이 보내준 사진의 그 포트)
2. 반대쪽을 PC USB 포트에 연결
3. EO2 화면에서 변화가 있는지 확인 — 일부 기기는 USB 연결 시 알림 표시

### 3-2. 디바이스 인식 확인

명령 프롬프트에서:

```
adb devices
```

**가능한 결과:**

**(A) 성공 케이스:**
```
List of devices attached
ABCD1234        device
```
→ Part 4로 진행 OK

**(B) Unauthorized 케이스:**
```
List of devices attached
ABCD1234        unauthorized
```
→ EO2 화면에 "USB 디버깅 허용?" 팝업이 떠있을 거예요. "허용" 또는 "Always allow" 선택. 그 후 다시 `adb devices` 실행.

**(C) 빈 목록 케이스:**
```
List of devices attached

```
→ ADB 디버깅이 비활성화 상태. **Part 5(트러블슈팅)** 로 가서 해결 후 돌아오기.

---

## Part 4: APK 설치 및 적용

### 4-1. APK 설치 명령

명령 프롬프트에서:

```
adb install EO1.apk
```

성공 시 결과:
```
Performing Streamed Install
Success
```

### 4-2. EO2 재부팅

```
adb reboot
```

### 4-3. 홈스크린(런처) 선택

EO2가 다시 켜지면, 부팅 후 화면에서 **"홈 화면 선택"** 또는 **"런처 선택"** 팝업이 떠야 정상이에요.

- 선택지: `Electric Objects` / `EO1`
- **"EO1"** 선택
- **"Always"** 또는 **"항상"** 체크

이제 EO2가 부팅할 때마다 EO1 앱이 실행됩니다. 죽은 서버 안 쳐다봄.

### 4-4. 동작 확인

EO1 앱이 실행되면 초기 설정 화면이 나타날 거예요. 이 단계는 별도로 진행할 거고, 일단 여기까지 오면 **EO2 부활 성공**입니다.

---

## Part 5: 트러블슈팅

### Q1. `adb devices`에서 디바이스가 안 잡혀요

**시도 1: USB 드라이버 설치**
1. Google USB Driver 다운로드: `https://developer.android.com/studio/run/win-usb`
2. 압축 풀기 후 장치 관리자 → EO2 (또는 "알 수 없는 장치") 우클릭 → 드라이버 업데이트 → "내 컴퓨터에서 드라이버 찾아보기" → 압축 푼 폴더 지정

**시도 2: 다른 케이블/포트**
- 충전 전용 케이블 아닌지 확인
- PC의 다른 USB 포트로 옮겨 연결
- USB 허브 거치지 말고 PC에 직접 연결

**시도 3: ADB 서버 재시작**
```
adb kill-server
adb start-server
adb devices
```

### Q2. EO2에 USB 디버깅 활성화하는 법을 모르겠어요

**좋은 소식: EO2는 ADB가 공장 출하 시부터 활성화되어 있습니다.**

EO2는 의도적으로 입력 장치(터치/키보드/마우스)가 없는 원격 관리 전용 디스플레이로 설계됐어요. 그래서 회사가 펌웨어 업데이트 등을 위해 ADB를 기본 켜놓은 상태로 출하했고, 커뮤니티에서 `adb shell`로 root 쉘 접근까지 확인됐습니다.

따라서 **케이블만 잘 연결되면 디바이스 인식이 거의 무조건 됩니다**. 만약 안 되면 거의 100% **케이블 또는 USB 드라이버 문제**예요. 시도 1, 2, 3을 순서대로 해보세요.

### Q3. APK 설치 시 "INSTALL_FAILED_INSUFFICIENT_STORAGE" 에러

```
adb shell pm install -r -s EO1.apk
```
(외부 저장소에 설치)

### Q4. APK 설치 시 "INSTALL_FAILED_USER_RESTRICTED" 에러

EO2에서 "출처를 알 수 없는 앱" 설치 허용 필요:
```
adb shell settings put secure install_non_market_apps 1
```

---

## 진행 중 도움 요청 방법

각 단계에서 막히시면, 저한테:
1. **에러 메시지 그대로 복붙** (스크린샷도 좋음)
2. **어느 Step에서 막혔는지** (예: "Part 3-2에서 빈 목록 나옴")
3. **EO2 화면 상태** (가능하면 사진)

알려주시면 즉시 트러블슈팅 도와드릴게요.

---

## 다음 단계 미리보기 (Step 2)

EO1 앱 설치가 끝나면:
1. EO1 앱 초기 설정 (Wi-Fi, 화면 방향)
2. Partner 앱을 사장님 폰에 설치
3. 첫 사진/GIF 업로드 테스트
4. 가족용 공유 셋업

여기까지 오면 사장님이 원하는 핵심 기능 1, 2, 3번이 작동하기 시작합니다.

그 다음 Step 3에서는 자체 웹앱 (시계, 날씨, 주식, 명화 큐레이션 등) 추가 기능 구현으로 넘어갑니다.
