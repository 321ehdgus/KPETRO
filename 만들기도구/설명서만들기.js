// 사용설명서.pdf 를 만드는 보조 프로그램입니다. (도구를 쓰는 사람은 실행할 필요 없음)
// 글과 표로 된 설명서를 HTML로 쓰고 자동 브라우저(playwright)로 PDF로 인쇄합니다. (사용자 요청으로 화면 사진은 넣지 않음)
// 화면 사진을 넣고 싶으면 맨 아래에서 사진찍기()를 다시 쓰면 됩니다.
// 실행: node 설명서만들기.js   (playwright가 설치된 환경. 글꼴 폴더는 FONT_DIR 로 줄 수 있음)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const 루트 = path.resolve(__dirname, "..");
const 도구주소 = "file://" + path.join(루트, "도구.html");
const 출력 = path.join(루트, "사용설명서.pdf");
const 글꼴폴더 = process.env.FONT_DIR || "";

// ---- 가상 데이터 (화면 사진용) ----
const 가짜답 = {
  해당작업여부: true, 범위밖사유: "", 추천작업: "",
  정보: { 날짜: "12월 18일", 날짜확인필요: false, 시간: null, 장소: "청사 옥상", 인원: "시설팀 2명", 총인원: 2,
    작업내용: "사다리를 이용한 태극기 교체", 사용기구: ["사다리", "로프"], 구분: "자체작업", 업체명: null },
  위험요인: [
    { 위험요인: "사다리 추락", 상황결과: "사다리 위에서 균형을 잃고 떨어짐", 현재조치: "2인 1조 작업, 최상단 발판 사용 금지", 빈도: 2, 강도: 4, 감소대책: "안전대 착용 및 체결, 보조자가 사다리 하단 지지", 개선후빈도: 1, 개선후강도: 4, 근거: "둘다", 분류번호: 5 },
    { 위험요인: "공구·자재 낙하", 상황결과: "공구가 떨어져 하부 보조자 타격", 현재조치: "하부 보조자 안전모 착용", 빈도: 1, 강도: 3, 근거: "작업내용", 분류번호: 5 },
    { 위험요인: "옥상 바닥 미끄러짐", 상황결과: "젖은 바닥에서 넘어짐", 현재조치: "작업 전 바닥 상태 확인", 빈도: 2, 강도: 2, 근거: "사진", 분류번호: 6 },
  ],
  사진점검: [{ 번호: 1, 본것: "옥상 게양대 옆에 사다리가 세워져 있음", 상태: "맞음", 설명: "" }],
  허가서체크: { 공통: [true, true, true, true, true, true, true], 작업: [false, true, true, false, false, true, true, true] },
  승인요청서: { 혼재작업: "없음", 현장위험요인: "옥상 바람, 바닥 미끄럼 주의",
    작업순서: [{ 단계: "사전준비", 조치: "안전모·안전대 지급 및 착용\n사다리·로프 이상 유무 점검" },
      { 단계: "태극기 해체 및 신규 게양", 조치: "사다리 2인 1조 작업\n최상단 발판 사용 금지" },
      { 단계: "마무리", 조치: "공구·자재 회수 및 바닥 정리\n게양대 고정 여부 확인" }],
    검토의견: "하부 출입 통제 및 감시인 배치" },
  허가서기타: ["풍속 확인 후 작업"], 허가서교육: [false, false, false, true, false],
  TBM: { 위험요인: "1. 사다리 추락\n2. 공구 낙하", 안전대책: "1. 2인 1조, 안전대 체결\n2. 하부 출입통제", 교육내용: "고소작업 안전수칙, 보호구 착용" },
  안전중점: "1. 추락 예방(안전대 체결)\n2. 하부 출입통제",
};
const 한줄 = "12월 18일 시설팀 2명이 청사 옥상에서 사다리를 이용해 태극기 교체. 사용기구는 사다리 및 로프";

async function 그림만들기(브라우저, 경로) {
  // 가상 현장 사진 (그림으로 그린 것)
  const p = await 브라우저.newPage({ viewport: { width: 640, height: 480 } });
  await p.setContent(`<body style="margin:0;background:linear-gradient(#bcd4e6 0 55%,#9a9a92 55%)">
    <div style="position:absolute;left:380px;top:40px;width:10px;height:300px;background:#ddd"></div>
    <div style="position:absolute;left:390px;top:50px;width:90px;height:60px;background:#fff;border:1px solid #888"></div>
    <div style="position:absolute;left:250px;top:150px;width:8px;height:240px;background:#c8a24a;transform:rotate(-12deg)"></div>
    <div style="position:absolute;left:310px;top:150px;width:8px;height:240px;background:#c8a24a;transform:rotate(-12deg)"></div>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<div style="position:absolute;left:${252 + i * 9}px;top:${185 + i * 38}px;width:62px;height:6px;background:#c8a24a;transform:rotate(-12deg)"></div>`).join("")}
  </body>`);
  await p.screenshot({ path: 경로 });
  await p.close();
}

async function 사진찍기() {
  const 브라우저 = await chromium.launch();
  const ctx = await 브라우저.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1.5, acceptDownloads: true });
  const p = await ctx.newPage();
  let 답 = 가짜답;
  await p.route("https://generativelanguage.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "application/json",
    headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(답) }] } }] }) }));
  const 임시 = fs.mkdtempSync(path.join(require("os").tmpdir(), "manual-"));
  const 사진경로 = path.join(임시, "site.png");
  await 그림만들기(브라우저, 사진경로);
  const 찍은 = {};
  const 찍기 = async (이름, 대상) => {
    const 파일 = path.join(임시, 이름 + ".png");
    if (대상) await 대상.screenshot({ path: 파일 }); else await p.screenshot({ path: 파일 });
    찍은[이름] = "data:image/png;base64," + fs.readFileSync(파일).toString("base64");
  };

  await p.goto(도구주소); await p.waitForTimeout(500);
  await 찍기("첫화면");
  await p.click("#설정열기"); await p.waitForTimeout(200);
  await 찍기("설정", p.locator("#설정창"));
  await p.fill("#키입력", "AIza-practice-fake-key"); await p.click("#설정저장");
  await p.click('.작업카드[data-작업="고소"]'); await p.waitForTimeout(400);
  await p.fill("#한줄", 한줄);
  await p.setInputFiles("#사진입력", 사진경로); await p.waitForTimeout(600);
  await 찍기("입력");
  await p.click("#분석버튼"); await p.waitForTimeout(900);
  if (!(await p.isVisible("#입력_작업주관팀"))) throw new Error("2단계로 가지 못함: " + (await p.textContent("#분석상태")) + " / " + (await p.textContent("#칸2")).slice(0, 200));
  for (const [k, v] of [["작업주관팀", "시설팀"], ["작성자", "작성자A"], ["작성자연락처", "000-0000-0000"]]) await p.fill("#입력_" + k, v);
  await p.evaluate(() => window.scrollTo(0, 0));
  await 찍기("부족한정보", p.locator("#왼쪽"));
  await p.click("#다음2"); await p.waitForTimeout(700);
  await p.evaluate(() => window.scrollTo(0, 380));
  await 찍기("서류확인");
  for (const 이름 of ["승인요청서", "안전작업허가서", "위험성평가표", "TBM활동일지"]) {
    const el = p.locator(`.서류내용[data-서류="${이름}"]`);
    await el.evaluate((e) => { e.style.maxHeight = "none"; });
    await 찍기("서류_" + 이름, el);
  }
  await p.click("#다음3"); await p.waitForTimeout(300);
  await 찍기("저장", p.locator("#왼쪽"));
  // 다른 작업으로 보일 때
  await p.click("#처음으로");
  답 = { 해당작업여부: false, 범위밖사유: "분전반 차단기를 바꾸는 전기작업이에요.", 추천작업: "전기작업",
    정보: { 날짜: "12월 19일", 장소: "본관 2층", 인원: "시설팀 2명", 작업내용: "분전반 차단기 교체" } };
  await p.fill("#한줄", "12월 19일 시설팀 2명이 본관 2층 분전반에서 차단기 교체"); await p.click("#분석버튼"); await p.waitForTimeout(800);
  await 찍기("범위밖", p.locator("#되묻기칸"));
  // 이상한 사진
  답 = Object.assign({}, 가짜답, { 사진점검: [{ 번호: 1, 본것: "도로의 땅이 꺼진 구멍", 상태: "작업과다름", 설명: "태극기 교체 작업과 관계없는 도로 사진이에요." }] });
  await p.click("#이전2"); await p.fill("#한줄", 한줄);
  await p.setInputFiles("#사진입력", 사진경로); await p.waitForTimeout(500);
  await p.click("#분석버튼"); await p.waitForTimeout(900);
  await 찍기("사진점검", p.locator("#사진점검칸"));
  // 표시 목록
  await p.click("#설정열기");
  await p.locator("#표시목록 details").nth(2).locator("summary").click();
  await p.evaluate(() => document.querySelector("#표시목록").scrollIntoView());
  await 찍기("표시목록", p.locator("#표시목록 details").nth(2));
  await 브라우저.close();
  fs.rmSync(임시, { recursive: true, force: true });
  return 찍은;
}

function 글꼴css() {
  if (!글꼴폴더) return "";
  const 파일 = (무게, 부분) => path.join(글꼴폴더, `noto-sans-kr-${부분}-${무게}-normal.woff2`);
  const 면 = [];
  for (const 무게 of [400, 500, 700]) for (const 부분 of ["korean", "latin"]) {
    if (fs.existsSync(파일(무게, 부분))) 면.push(`@font-face{font-family:"설명서글꼴";font-weight:${무게};src:url("file://${파일(무게, 부분)}") format("woff2");}`);
  }
  return 면.join("\n");
}

function 설명서HTML(그림) {
  const 오늘 = new Date();
  const 날 = `${오늘.getFullYear()}. ${오늘.getMonth() + 1}. ${오늘.getDate()}.`;
  const 그 = (이름, 설명, 폭) => (그림[이름] ? `<figure><img src="${그림[이름]}" style="max-width:${폭 || 100}%"><figcaption>${설명}</figcaption></figure>` : "");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
${글꼴css()}
@page { size: A4; margin: 18mm 16mm 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: "설명서글꼴", "Noto Sans KR", "WenQuanYi Zen Hei", sans-serif; color: #37352f; font-size: 10.5pt; line-height: 1.65; margin: 0; }
h1 { font-size: 22pt; margin: 0 0 6pt; } h2 { font-size: 15pt; margin: 22pt 0 8pt; padding-bottom: 4pt; border-bottom: 1px solid #e3e2e0; page-break-after: avoid; }
h3 { font-size: 12pt; margin: 14pt 0 4pt; page-break-after: avoid; }
p { margin: 4pt 0 6pt; } ul, ol { margin: 4pt 0 8pt; padding-left: 18pt; } li { margin: 2pt 0; }
.표지 { height: 245mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
.표지 .아이콘 { font-size: 64pt; line-height: 1; } .표지 h1 { font-size: 28pt; margin-top: 10pt; }
.표지 .부제 { font-size: 13pt; color: #787774; } .표지 .정보 { margin-top: 36pt; font-size: 10pt; color: #787774; }
.꼬리표 { display: inline-block; padding: 0 6pt; border-radius: 3pt; font-size: 9.5pt; margin-right: 4pt; }
.주황{background:#fadec9}.파랑{background:#d3e5ef}.초록{background:#dbeddb}.노랑{background:#fdecc8}.빨강{background:#ffe2dd}.회색{background:#e3e2e0}.갈색{background:#eee0da}
.콜아웃 { display: flex; gap: 8pt; padding: 8pt 10pt; border-radius: 4pt; background: #f1f1ef; margin: 8pt 0; page-break-inside: avoid; }
.콜아웃.경고 { background: #fbf3db; } .콜아웃.위험 { background: #fdebec; } .콜아웃.좋음 { background: #edf3ec; }
.콜아웃 .아 { flex: none; }
figure { margin: 8pt 0 12pt; text-align: center; page-break-inside: avoid; }
figure img { border: 1px solid #e3e2e0; border-radius: 4pt; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
figcaption { font-size: 9pt; color: #787774; margin-top: 3pt; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0 10pt; font-size: 9.5pt; page-break-inside: avoid; }
th, td { border-bottom: 1px solid #e3e2e0; padding: 4pt 6pt; text-align: left; vertical-align: top; }
th { color: #787774; font-weight: 500; border-top: 1px solid #e3e2e0; background: #fafaf9; }
.단계 { display: inline-flex; align-items: center; justify-content: center; width: 16pt; height: 16pt; border-radius: 50%; background: #37352f; color: #fff; font-size: 9pt; margin-right: 4pt; }
.쪽나눔 { page-break-before: always; }
.목차 li { margin: 3pt 0; }
code { font-family: "D2Coding", Consolas, monospace; background: rgba(135,131,120,.15); color: #eb5757; padding: 0 4pt; border-radius: 3pt; font-size: 9pt; }
</style></head><body>

<section class="표지">
  <div class="아이콘">🦺</div>
  <h1>수시 위험성평가 서류 도우미<br>사용 설명서</h1>
  <div class="부제">작업 내용 한 줄(+현장 사진)로 안전 서류 4종 초안을 만드는 도구</div>
  <div style="margin-top:14pt">
    <span class="꼬리표 주황">🪜 고소작업</span><span class="꼬리표 갈색">🏗️ 중량물 취급작업</span><span class="꼬리표 노랑">⚡ 전기작업</span><span class="꼬리표 빨강">🔥 화기작업</span><span class="꼬리표 회색">🕳️ 밀폐공간작업</span>
  </div>
  <div class="정보">만든 날: ${날}<br>결과 서류: 작업시행 승인 요청서 · 안전작업 허가서 · TBM 활동일지 · 위험성평가표 (한글 .hwpx)</div>
</section>

<h2>목차</h2>
<ol class="목차">
  <li>이 도구는 무엇인가요</li><li>준비물</li><li>도구 받기와 열기</li><li>처음 한 번: AI 키 넣기</li>
  <li>작업 고르기</li><li>1단계 — 작업 내용 적기 (+현장 사진)</li><li>2단계 — 부족한 정보 채우기</li>
  <li>3단계 — 서류 확인하고 고치기</li><li>4단계 — 한글 파일로 저장하기</li><li>서류마다 채워지는 칸</li>
  <li>다른 양식을 쓰고 싶을 때</li><li>이럴 땐 이렇게 (문제 해결)</li><li>꼭 지켜 주세요</li>
</ol>

<h2>1. 이 도구는 무엇인가요</h2>
<p>수시 위험성평가를 할 때 작성하는 <b>서류 4종</b>을 작업 내용 한 줄로 한꺼번에 만들어 주는 도구입니다. AI(구글 Gemini)가 작업 내용과 현장 사진을 보고 위험요인, 위험성 점수, 안전대책, 허가서 체크를 판단하고, 결과를 <b>받은 실제 양식 모양 그대로</b> 한글 파일로 만들어 줍니다.</p>
<table><tr><th>만들어지는 서류</th><th>주로 채워지는 내용</th></tr>
<tr><td>작업시행 승인 요청서</td><td>작업구분 체크, 작업명·장소·일시·인원, 사전조사(혼재작업·현장 위험요인), 작업순서별 안전보건조치, 검토의견 초안</td></tr>
<tr><td>안전작업 허가서</td><td>작업 정보, 공통사항과 고른 작업의 점검 체크(▣/□), 기타 사항, 안전 중점 관리사항, 안전보건교육 확인</td></tr>
<tr><td>TBM 활동일지</td><td>현장명·일자, 작업개요, 위험요인과 안전대책, 안전교육 내용</td></tr>
<tr><td>위험성평가표 (빈도·강도법)</td><td>위험분류, 위험발생 상황, 현재 조치, 빈도×강도 위험성, 8점 이상 감소대책과 개선 후 위험성</td></tr></table>
<div class="콜아웃"><span class="아">💡</span><div>도구가 만드는 것은 <b>초안</b>입니다. 서명, 승인, 최종 판단은 반드시 담당자가 직접 합니다.</div></div>

<h2>2. 준비물</h2>
<ul><li><b>인터넷이 되는 컴퓨터</b>와 크롬 또는 엣지 브라우저 (프로그램 설치는 필요 없습니다)</li>
<li><b>AI 키</b> (구글 AI 스튜디오에서 무료로 만들 수 있습니다. 4장 참고)</li>
<li>만든 파일을 열어 볼 <b>한글 프로그램</b> (HWPX를 열 수 있는 버전)</li></ul>

<h2>3. 도구 받기와 열기</h2>
<ol><li>GitHub 저장소(KPETRO)에서 초록색 <b>Code → Download ZIP</b>을 눌러 받습니다.</li>
<li>받은 ZIP 파일에서 마우스 오른쪽 → <b>압축 풀기</b>를 합니다.</li>
<li>풀린 폴더 안의 <b><code>도구.html</code></b>을 더블클릭합니다.</li></ol>
<div class="콜아웃 위험"><span class="아">⛔</span><div><b>ZIP을 풀지 않고 안에서 바로 열면</b> 화면이 깨지고 버튼이 동작하지 않습니다. 반드시 압축을 푼 폴더에서 여세요. 폴더 안의 다른 파일(화면.css, AI.js, 양식 폴더 등)은 지우거나 옮기지 마세요.</div></div>

<h2>4. 처음 한 번: AI 키 넣기</h2>
<p>이 도구는 사람마다 <b>자기 AI 키</b>를 넣어 씁니다. 위쪽 오른쪽의 <b>⚙️ 설정</b>을 누르세요.</p>
${그("설정", "설정 창 — AI 키 칸 옆의 「🔑 API 키 만들러 가기」", 78)}
<ol><li><b>🔑 API 키 만들러 가기</b>를 누르면 구글 AI 스튜디오가 새 창으로 열립니다.</li>
<li>구글 계정으로 로그인하고 <b>API 키 만들기</b>를 누릅니다.</li>
<li>나온 키(AIza…로 시작)를 복사해서 AI 키 칸에 붙여 넣고 <b>저장</b>을 누릅니다.</li></ol>
<div class="콜아웃 경고"><span class="아">⚠️</span><div>AI 키는 비밀번호처럼 다루세요. 남에게 보내거나 공유 폴더에 두지 마세요. <b>여럿이 쓰는 PC라면 「이 컴퓨터에 AI 키 기억하기」를 끄세요.</b> 끄면 창을 닫을 때 키가 지워집니다. 회사 구글 계정에서 키 만들기가 막히면 개인 계정으로 해 보세요.</div></div>

<h2>5. 작업 고르기</h2>
${그("첫화면", "첫 화면 — 작업 종류 카드 5장")}
<p>만들 서류의 <b>작업 종류</b>를 고릅니다. 카드를 누르면 그 작업의 화면으로 들어가고, 위쪽 「← 다른 작업 고르기」로 언제든 돌아올 수 있습니다. 작업에 따라 AI가 살펴보는 위험과 허가서 체크리스트가 달라집니다.</p>

<h2>6. <span class="단계">1</span>작업 내용 적기 (+현장 사진)</h2>
${그("입력", "1단계 — 한 줄 입력, 현장 사진, 오른쪽 서류 미리보기")}
<p>날짜, 인원, 장소, 작업 내용, 사용 기구를 <b>한 줄</b>로 적습니다. 예시:</p>
<table><tr><th>작업</th><th>한 줄 예시</th></tr>
<tr><td>고소</td><td>12월 18일 시설팀 2명이 청사 옥상에서 사다리를 이용해 태극기 교체. 사용기구는 사다리 및 로프</td></tr>
<tr><td>중량물</td><td>11월 12일 시설팀 3명이 창고 앞에서 지게차로 기계 부품(약 500kg) 적재. 사용기구는 지게차, 슬링벨트</td></tr>
<tr><td>전기</td><td>11월 14일 시설팀 2명이 본관 2층 분전반에서 노후 차단기 교체. 사용기구는 절연 드라이버, 검전기</td></tr>
<tr><td>화기</td><td>11월 18일 시설팀 2명이 기계실에서 배관 지지대 용접 보수. 사용기구는 전기용접기, 그라인더</td></tr>
<tr><td>밀폐공간</td><td>11월 20일 시설팀 2명이 지하 정화조 맨홀 안에서 펌프 점검. 사용기구는 가스측정기, 송풍기</td></tr></table>
<ul><li><b>📷 현장 사진 넣기</b>로 사진을 최대 3장까지 함께 보낼 수 있습니다(선택). 사진 속 위험도 위험요인에 들어갑니다.</li>
<li>글은 500자 이하가 좋습니다. 길면 안내가 나오고, 1,000자를 넘으면 보내지 않습니다.</li>
<li><b>서류 초안 만들기 →</b>를 누르면 AI가 판단합니다(보통 5~20초). AI가 바쁘면 자동으로 다시 시도합니다.</li></ul>
<div class="콜아웃 경고"><span class="아">⚠️</span><div>사진에 <b>사람 얼굴, 기관 이름이 보이는 간판·문서, 차량 번호</b>가 찍혀 있으면 넣지 마세요.</div></div>

<h2>7. <span class="단계">2</span>부족한 정보 채우기</h2>
${그("부족한정보", "2단계 — 사진 점검, 한 줄에서 읽은 내용, 되묻는 칸", 62)}
<ul><li>맨 위 <b>📷 현장 사진 점검</b>에서 AI가 사진마다 무엇을 봤는지와 작업에 맞는 사진인지 알려 줍니다.</li>
<li>한 줄에 날짜·장소·인원이 없으면 <b>빨간 칸(꼭 필요)</b>으로 되묻습니다. 채워야 다음으로 넘어갑니다.</li>
<li>「내일」처럼 쓴 날짜는 맞는지 확인 체크를 해야 넘어갑니다.</li>
<li>작업주관팀, 작성자·확인자와 연락처, 감독자 연락처, 승강기 사용 여부 등은 비워 두어도 됩니다(서류에 빈칸으로 나옴).</li></ul>
<h3>사진이 작업과 맞지 않을 때</h3>
${그("사진점검", "이상한 사진 알림 — 빼고 다시 판단하거나, 확인 후 그대로 진행", 62)}
<p>작업과 관계없거나 알아보기 어려운 사진은 위험요인 판단에 쓰지 않습니다. <b>이상한 사진 빼고 다시 판단</b> 또는 <b>확인했어요, 그대로 진행</b> 중 하나를 골라야 다음으로 넘어갑니다.</p>
<h3>고른 작업과 다른 작업으로 보일 때</h3>
${그("범위밖", "다른 작업 추천 — 맞는 작업으로 옮겨 바로 다시 판단", 62)}
<p>예를 들어 고소작업 화면에 분전반 차단기 교체를 적으면 「이 작업은 고소작업이 아닌 것 같아요」와 함께 맞는 작업을 추천합니다.</p>
<ul><li><b>⚡ 전기작업으로 가서 다시 판단</b>: 적은 한 줄과 사진을 그대로 가지고 그 작업으로 옮겨 바로 다시 판단합니다.</li>
<li><b>다른 작업 적기</b>: 1단계로 돌아가 다시 적습니다.</li>
<li><b>그래도 ○○작업으로 진행</b>: 지금 고른 작업으로 계속 만듭니다.</li></ul>

<h2>8. <span class="단계">3</span>서류 확인하고 고치기</h2>
${그("서류확인", "3단계 — 왼쪽 위험요인 표와 점검 안내, 오른쪽 서류 4장")}
<ul><li><b>찾아낸 위험요인</b> 표: 점수 = 빈도 × 강도입니다. 8점 이상은 노란 줄로 표시되고 감소대책이 들어갑니다. <b>근거</b> 칸은 📝 작업 내용 / 📷 사진 중 어디서 나온 위험인지 알려 줍니다.</li>
<li>오른쪽 서류에서 <b>노란 칸</b>은 비어 있는 칸, <b>회색 칸</b>은 해당 없는 칸입니다.</li>
<li>⚠️ 안내가 나오면 꼭 읽어 보세요. (예: AI가 준 점수를 바꾼 경우, 개선 후 위험성이 비어 있는 경우, 양식 줄이 모자란 경우)</li>
<li><b>서류 내용 직접 고치기</b>를 펼치면 칸마다 내용을 바로 고칠 수 있고, 오른쪽 미리보기에 바로 반영됩니다.</li></ul>
<div class="콜아웃"><span class="아">💡</span><div>AI 판단은 틀릴 수 있습니다. 위험요인과 점수, 허가서 체크가 현장과 맞는지 <b>담당자가 꼭 확인</b>하세요.</div></div>

<h2>9. <span class="단계">4</span>한글 파일로 저장하기</h2>
${그("저장", "4단계 — 4개 한꺼번에(ZIP) 또는 하나씩 받기", 55)}
<ul><li><b>서류 4개 한꺼번에 받기 (ZIP)</b>: 받은 ZIP을 풀면 한글 파일 4개가 나옵니다.</li>
<li>하나씩 받으려면 아래 서류 이름 버튼을 누릅니다.</li>
<li>받은 파일을 한글에서 열어 확인하고, 서명란 등 남은 칸을 채워 마무리합니다.</li></ul>

<h2>10. 서류마다 채워지는 칸</h2>
${그("서류_승인요청서", "작업시행 승인 요청서 (가상 데이터로 채운 모습)", 70)}
<table><tr><th>서류</th><th>도구가 채우는 칸</th><th>사람이 쓰는 칸 (비워 둠)</th></tr>
<tr><td>승인 요청서</td><td>작업주관팀(입력 시), 작업구분 ▣, 작업명·장소·일시·인원, 승강기 사용·감독자(입력 시), 혼재작업·현장 위험요인, 작업순서 3단계별 안전보건조치, 검토의견 초안</td><td>기타사항, 신청일·신청자 서명, 승인자 서명</td></tr>
<tr><td>안전작업 허가서</td><td>작업명·일시·인원·장소·업체, 작성자·확인자와 연락처(입력 시), 공통사항·고른 작업 점검 칸(▣/□), 섹션 머리 ▣, 기타 사항(추가 안전조치), 안전 중점 관리사항, 안전보건교육 확인 ▣</td><td>허가서 승인번호, 확인(오른쪽) 칸, 서명, 비상연락처, 화재감시인·감시인 이름, 확인·승인란</td></tr>
<tr><td>TBM 활동일지</td><td>현장명·업체명·일자, 작업공종, 작업개요(위치·공종·작업명·장비·인원), 위험요인·안전대책, 교육 구분·내용</td><td>결재, 수량, 확인(담당), 교육실시자 서명, 참석자 기록</td></tr>
<tr><td>위험성평가표</td><td>공정명·평가일자, 공정명·세부작업명, 위험분류 번호, 위험발생 상황, 현재 조치, 빈도·강도·위험성, 감소대책(8 미만은 「-」), 개선 후 위험성</td><td>개선예정일, 완료일, 담당자</td></tr></table>
<p><b>위험분류 번호</b>: 1 기계적 · 2 전기적 · 3 화학적 · 4 생물학적 · 5 작업특성(추락·낙하·중량물 등) · 6 작업환경(산소결핍·미끄러운 바닥 등)</p>
${그("서류_안전작업허가서", "안전작업 허가서 — 공통사항과 고른 작업(고소작업)의 점검 칸이 채워진 모습", 52)}
${그("서류_위험성평가표", "위험성평가표 (빈도·강도법)", 95)}
${그("서류_TBM활동일지", "TBM 활동일지", 70)}

<h2>11. 다른 양식을 쓰고 싶을 때</h2>
<p>기본 양식은 받은 실제 양식 4종입니다. 양식이 바뀌면 다음처럼 바꿔 쓸 수 있습니다.</p>
<ol><li>한글에서 새 양식을 열고, 내용이 들어갈 칸마다 <code>{{작업명}}</code> 같은 <b>표시</b>를 넣습니다.</li>
<li><b>다른 이름으로 저장 → 파일 형식: HWPX(.hwpx)</b>로 저장합니다. (옛 .hwp는 쓸 수 없습니다)</li>
<li>⚙️ 설정 → <b>서류 양식</b>에서 그 파일을 고릅니다. 맞는 양식이면 「표시 ○개를 찾았어요」가 나옵니다.</li></ol>
${그("표시목록", "설정 창의 「양식에 넣을 표시 목록」 — 표시를 누르면 복사됩니다", 70)}

<h2>12. 이럴 땐 이렇게 (문제 해결)</h2>
<table><tr><th>이런 일이 생기면</th><th>이렇게 하세요</th></tr>
<tr><td>화면이 깨지고 버튼이 안 눌려요</td><td>ZIP을 풀지 않고 연 경우입니다. 압축을 푼 폴더에서 <code>도구.html</code>을 여세요.</td></tr>
<tr><td>「AI 키가 필요해요」</td><td>⚙️ 설정에서 AI 키를 넣으세요. 없으면 「API 키 만들러 가기」로 만드세요.</td></tr>
<tr><td>「AI 키를 쓸 수 없습니다」 / 「올바르지 않습니다」</td><td>키를 잘못 붙여 넣었거나 지워진 키입니다. 새로 만들어 다시 넣으세요.</td></tr>
<tr><td>「AI 서비스가 지금 너무 바빠서…」(503)</td><td>구글 서버가 잠시 바쁜 것입니다. 몇 분 뒤 다시 하거나, 설정의 모델 이름을 <code>gemini-flash-lite-latest</code>로 바꿔 보세요.</td></tr>
<tr><td>「무료 사용량을 넘었습니다」</td><td>1분쯤 기다렸다가 다시 하세요. 하루 사용량을 넘었으면 다음 날 다시 하세요.</td></tr>
<tr><td>「모델 이름을 찾을 수 없습니다」</td><td>설정의 모델 이름을 <code>gemini-flash-latest</code>로 되돌리세요.</td></tr>
<tr><td>위험요인을 하나도 못 찾았어요</td><td>3단계의 「다시 판단」을 누르거나, 작업 내용을 더 자세히 적으세요.</td></tr>
<tr><td>사진이 안 들어가요</td><td>아이폰 HEIC 사진은 안 열릴 수 있습니다. JPG로 바꿔 넣으세요. 25MB 넘는 파일, 사진이 아닌 파일은 넣을 수 없습니다.</td></tr>
<tr><td>내 양식을 고르니 「쓸 수 없어요」</td><td>.hwpx로 저장했는지, 칸에 <code>{{표시}}</code>를 넣었는지 확인하세요. 안내 문구에 이유가 나옵니다.</td></tr>
<tr><td>위험요인이 양식 줄보다 많아요</td><td>3단계 안내대로 양식에 줄을 늘리고 <code>{{행7_…}}</code>처럼 표시를 넣거나, 위험요인을 직접 정리하세요.</td></tr></table>

<h2>13. 꼭 지켜 주세요</h2>
<div class="콜아웃 경고"><span class="아">⚠️</span><div><b>입력한 한 줄과 현장 사진은 인터넷으로 AI 서비스(구글)에 전송됩니다.</b> 무료 AI는 보낸 내용이 서비스 개선에 쓰일 수 있으니, 실제 업무 내용은 기관 보안 규정을 확인한 뒤에 쓰세요. 화면에 넣은 내용과 사진은 창을 닫으면 사라지고, 만든 서류는 파일로 저장해야 남습니다.</div></div>
<ul><li>AI가 만든 내용은 <b>초안</b>입니다. 현장에 맞는지 담당자가 확인하고, 서명과 승인은 사람이 직접 합니다.</li>
<li>AI 키는 사람마다 따로 만들어 쓰고, 남과 나누지 마세요.</li>
<li>개인정보(이름, 연락처)는 꼭 필요한 칸에만 넣으세요.</li></ul>
</body></html>`;
}

(async () => {
  const 그림 = process.env.WITH_SCREENSHOTS ? await 사진찍기() : {};
  const html = 설명서HTML(그림);
  const 임시html = path.join(require("os").tmpdir(), "manual-" + Date.now() + ".html");
  fs.writeFileSync(임시html, html);
  const 브라우저 = await chromium.launch();
  const p = await 브라우저.newPage();
  await p.goto("file://" + 임시html, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: 출력, format: "A4", printBackground: true, displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: '<div style="width:100%;font-size:8px;color:#999;text-align:center;font-family:sans-serif">수시 위험성평가 서류 도우미 사용 설명서 · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: "16mm", bottom: "18mm", left: "16mm", right: "16mm" } });
  await 브라우저.close();
  fs.unlinkSync(임시html);
  console.log("만듦:", 출력);
})().catch((e) => { console.error("실패", e); process.exit(1); });
