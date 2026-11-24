// 본선 발표 자료 만들기 (pptxgenjs)
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa6");
const path = require("path");
const fs = require("fs");
const { applyTheme } = require("/root/.claude/skills/synced/d3159574-db30-44d1-a630-05cdc20a5340_2de86537-b831-4f1c-b1c9-1ba33cc55b83/pptx/scripts/apply_theme.js");

const 출력 = process.argv[2];
const 그림폴더 = process.argv[3];

const THEME = {
  name: "안전 주황",
  headFontFace: "맑은 고딕",
  bodyFontFace: "맑은 고딕",
  colors: {
    dk1: "1E2533", lt1: "FFFFFF", dk2: "16233A", lt2: "F3F5F8",
    accent1: "F28C28", accent2: "16233A", accent3: "2E7D5B", accent4: "C0392B", accent5: "5B6B82", accent6: "FCE3CC",
    hlink: "0B6BCB", folHlink: "6D3FA6",
  },
};
const 색 = THEME.colors;

async function 아이콘(이름, hex, 크기 = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(fa[이름], { color: "#" + hex, size: 크기 }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pres.title = "수시 위험성평가 서류 AI 도우미";
  pres.author = "발표자";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;
  const W = 13.333, H = 7.5;

  // ---- 레이아웃 ----
  pres.defineSlideMaster({
    title: "표지",
    background: { color: C.text2 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.35, w: 11.7, h: 1.6, fontSize: 44, bold: true, color: C.background1, valign: "top", align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.05, w: 11.7, h: 0.9, fontSize: 20, color: "FCE3CC", valign: "top", align: "left", margin: 0 }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "본문",
    background: { color: C.background1 },
    margin: [0.5, 0.6, 0.5, 0.6],
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.42, w: 9.6, h: 0.8, fontSize: 30, bold: true, color: C.text2, valign: "middle", align: "left", margin: 0 }, text: "" } },
      { text: { text: "수시 위험성평가 서류 AI 도우미", options: { x: 0.6, y: 7.05, w: 6, h: 0.3, fontSize: 10, color: "5B6B82", margin: 0 } } },
    ],
    slideNumber: { x: 12.3, y: 7.05, w: 0.5, h: 0.3, fontSize: 10, color: "5B6B82", align: "right" },
  });
  pres.defineSlideMaster({
    title: "마무리",
    background: { color: C.text2 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 1.0, w: 11.7, h: 1.4, fontSize: 40, bold: true, color: C.background1, valign: "top", align: "left", margin: 0 }, text: "" } },
    ],
  });

  // 심사 항목 꼬리표 (오른쪽 위)
  const 꼬리표 = (slide, 글들) => {
    let x = W - 0.6;
    [...글들].reverse().forEach((글) => {
      const w = 0.2 + 글.length * 0.22;
      x -= w;
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 0.62, w, h: 0.4, fill: { color: "FCE3CC" }, line: { color: "FCE3CC" }, rectRadius: 0.08, objectName: "심사항목 " + 글 });
      slide.addText(글, { x, y: 0.62, w, h: 0.4, fontSize: 12, bold: true, color: "B3541E", align: "center", valign: "middle", margin: 0, isTextBox: true });
      x -= 0.12;
    });
  };
  const 아이콘원 = async (slide, 이름, x, y, d, 배경 = 색.accent1, 앞 = "FFFFFF") => {
    slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: 배경 }, line: { color: 배경 }, objectName: "아이콘 원" });
    slide.addImage({ data: await 아이콘(이름, 앞), x: x + d * 0.24, y: y + d * 0.24, w: d * 0.52, h: d * 0.52 });
  };
  const 카드 = (slide, x, y, w, h, 배경 = "F3F5F8") =>
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: 배경 }, line: { color: 배경 }, rectRadius: 0.12, objectName: "카드" });

  // ===== 1. 표지 =====
  pres.addSection({ title: "시작" });
  let s = pres.addSlide({ masterName: "표지", sectionTitle: "시작" });
  s.addImage({ data: await 아이콘("FaHelmetSafety", "F28C28"), x: 0.8, y: 1.15, w: 1.0, h: 1.0 });
  s.addText("한 줄이면 끝나는 안전서류", { placeholder: "title" });
  s.addText("작업 내용 한 줄 + 현장 사진 → AI 판단 → 기관 양식 4종 자동 작성", { placeholder: "body" });
  s.addText("수시 위험성평가 서류 AI 도우미  |  발표자: ○○○ (소속을 적어 주세요)", { x: 0.8, y: 6.2, w: 11.7, h: 0.5, fontSize: 16, color: "C8D0DC", margin: 0, isTextBox: true });
  s.addNotes("[0:00~0:20] 안녕하십니까. ○○○입니다. 오늘 소개드릴 것은 작업 내용 한 줄만 적으면 수시 위험성평가 서류 네 가지를 기관 양식 그대로 만들어 주는 AI 도우미입니다.");

  // ===== 2. 문제 =====
  pres.addSection({ title: "문제" });
  s = pres.addSlide({ masterName: "본문", sectionTitle: "문제" });
  s.addText("작업 1건마다 서류 4종, 약 1시간", { placeholder: "title" });
  꼬리표(s, ["실효성"]);
  카드(s, 0.6, 1.55, 4.3, 5.1, "16233A");
  s.addText("약 1시간", { x: 0.9, y: 2.0, w: 3.7, h: 1.2, fontSize: 54, bold: true, color: "F28C28", margin: 0, isTextBox: true });
  s.addText("수시 위험성평가 1건을\n서류까지 마치는 시간", { x: 0.9, y: 3.2, w: 3.7, h: 0.9, fontSize: 16, color: "FFFFFF", margin: 0, isTextBox: true });
  s.addText([
    { text: "작업시행 승인 요청서", options: { bullet: true, breakLine: true } },
    { text: "안전작업 허가서", options: { bullet: true, breakLine: true } },
    { text: "TBM 활동일지", options: { bullet: true, breakLine: true } },
    { text: "위험성평가표 (빈도·강도법)", options: { bullet: true } },
  ], { x: 0.9, y: 4.3, w: 3.8, h: 1.9, fontSize: 15, color: "C8D0DC", paraSpaceAfter: 6, margin: 0, isTextBox: true });
  const 고충 = [
    ["FaCopy", "같은 내용을 서류마다 다시", "작업명·장소·인원을 4종 서류에 반복 입력하고, 작업마다 내용을 새로 씁니다."],
    ["FaUserShield", "비전문가에게 어려운 위험요인 찾기", "위험성평가는 전 근로자가 참여하지만 안전 담당이 아니면 절차와 판단이 어렵습니다."],
    ["FaScaleUnbalanced", "사람마다 다른 판단", "같은 현장도 사람마다 위험을 다르게 봐서 서류 품질이 들쭉날쭉합니다."],
  ];
  for (let i = 0; i < 고충.length; i++) {
    const y = 1.55 + i * 1.72;
    카드(s, 5.2, y, 7.53, 1.5);
    await 아이콘원(s, 고충[i][0], 5.45, y + 0.35, 0.8);
    s.addText(고충[i][1], { x: 6.5, y: y + 0.22, w: 6.0, h: 0.45, fontSize: 18, bold: true, color: "16233A", margin: 0, isTextBox: true });
    s.addText(고충[i][2], { x: 6.5, y: y + 0.7, w: 6.0, h: 0.65, fontSize: 14, color: "3D4A5C", margin: 0, isTextBox: true });
  }
  s.addNotes("[0:20~1:10] 현장에서 작업이 하나 잡히면 승인요청서, 허가서, TBM 일지, 위험성평가표 네 가지를 써야 합니다. 1건에 약 1시간이 걸립니다. 같은 내용을 서류마다 반복해 쓰고, 안전 담당이 아니면 위험요인을 찾기 어렵고, 같은 현장도 사람마다 판단이 달라 서류 품질이 일정하지 않습니다. 실제로 제가 겪은 불편입니다.");

  // ===== 3. 아이디어 =====
  pres.addSection({ title: "아이디어" });
  s = pres.addSlide({ masterName: "본문", sectionTitle: "아이디어" });
  s.addText("한 줄을 적으면 AI가 판단하고 양식을 채웁니다", { placeholder: "title" });
  꼬리표(s, ["아이디어"]);
  const 흐름 = [
    ["FaPenToSquare", "입력", "작업 내용 한 줄\n+ 현장 사진(선택)"],
    ["FaRobot", "AI 판단", "위험요인 · 빈도×강도\n허가서 체크 · 작업순서별 대책"],
    ["FaFileLines", "결과", "기관 실제 양식 4종\n한글(.hwpx) 바로 저장"],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.3;
    카드(s, x, 1.55, 3.6, 2.55, i === 1 ? "FCE3CC" : "F3F5F8");
    await 아이콘원(s, 흐름[i][0], x + 0.3, 1.8, 0.8, i === 1 ? "F28C28" : "16233A");
    s.addText(흐름[i][1], { x: x + 1.25, y: 1.85, w: 2.2, h: 0.7, fontSize: 20, bold: true, color: "16233A", valign: "middle", margin: 0, isTextBox: true });
    s.addText(흐름[i][2], { x: x + 0.3, y: 2.85, w: 3.1, h: 1.05, fontSize: 15, color: "3D4A5C", margin: 0, isTextBox: true });
    if (i < 2) s.addImage({ data: await 아이콘("FaArrowRight", "F28C28"), x: x + 3.78, y: 2.6, w: 0.4, h: 0.4 });
  }
  // 기존 vs 새 방식
  카드(s, 0.6, 4.45, 6.0, 2.25);
  s.addText("기존 방식", { x: 0.9, y: 4.65, w: 5.4, h: 0.45, fontSize: 18, bold: true, color: "5B6B82", margin: 0, isTextBox: true });
  s.addText([
    { text: "빈 양식에 사람이 하나하나 작성", options: { bullet: true, breakLine: true } },
    { text: "위험 판단은 개인 경험과 검색에 의존", options: { bullet: true, breakLine: true } },
    { text: "서류 4종을 따로따로", options: { bullet: true } },
  ], { x: 0.9, y: 5.15, w: 5.5, h: 1.4, fontSize: 15, color: "3D4A5C", paraSpaceAfter: 4, margin: 0, isTextBox: true });
  카드(s, 6.73, 4.45, 6.0, 2.25, "16233A");
  s.addText("이 도구", { x: 7.03, y: 4.65, w: 5.4, h: 0.45, fontSize: 18, bold: true, color: "F28C28", margin: 0, isTextBox: true });
  s.addText([
    { text: "AI가 빈도·강도법과 허가서 체크리스트에 맞춰 판단", options: { bullet: true, breakLine: true } },
    { text: "현장 사진의 위험까지 반영, 이상한 사진은 걸러냄", options: { bullet: true, breakLine: true } },
    { text: "한 번 입력으로 4종 동시 작성, 사람은 확인만", options: { bullet: true } },
  ], { x: 7.03, y: 5.15, w: 5.5, h: 1.4, fontSize: 15, color: "FFFFFF", paraSpaceAfter: 4, margin: 0, isTextBox: true });
  s.addNotes("[1:10~2:00] 아이디어는 단순합니다. 작업 내용을 한 줄 적고, 원하면 현장 사진을 넣습니다. AI가 우리 기관 방식인 빈도·강도법과 허가서 체크리스트에 맞춰 위험요인과 대책을 판단하고, 그 결과를 기관에서 쓰는 실제 한글 양식 네 가지에 그대로 채워 줍니다. 안전 도메인 지식(양식·체크리스트·평가 기준)과 AI를 묶은 것이 핵심입니다.");

  // ===== 4. 시연 =====
  pres.addSection({ title: "시연" });
  s = pres.addSlide({ masterName: "본문", sectionTitle: "시연" });
  s.addText("시연 — 고소작업: 에어컨 필터 교체", { placeholder: "title" });
  꼬리표(s, ["기술성", "실효성"]);
  // 도구 화면 (1640x757) 왼쪽 / 한글 결과 (965x678) 오른쪽
  const 도구폭 = 5.6, 도구높이 = 도구폭 * 757 / 1640;
  s.addImage({ path: path.join(그림폴더, "3.png"), x: 0.6, y: 1.55, w: 도구폭, h: 도구높이, altText: "도구 화면: 입력한 한 줄과 AI가 찾은 위험요인, 서류 미리보기" });
  s.addText("① 도구 화면 — 한 줄 입력 → 위험요인·점수·서류 4장 미리보기", { x: 0.6, y: 1.55 + 도구높이 + 0.1, w: 도구폭, h: 0.4, fontSize: 12, color: "5B6B82", margin: 0, isTextBox: true });
  const 결과폭 = 6.23, 결과높이 = 결과폭 * 678 / 965;
  s.addImage({ path: path.join(그림폴더, "2.png"), x: W - 0.6 - 결과폭, y: 1.55, w: 결과폭, h: 결과높이, altText: "한글로 연 작업시행 승인 요청서 결과" });
  s.addText("② 한글에서 연 결과 — 기관 양식 그대로", { x: W - 0.6 - 결과폭, y: 1.55 + 결과높이 + 0.1, w: 결과폭, h: 0.4, fontSize: 12, color: "5B6B82", margin: 0, isTextBox: true });
  카드(s, 0.6, 4.75, 도구폭, 1.6, "FCE3CC");
  s.addText([
    { text: "입력 예", options: { bold: true, breakLine: true } },
    { text: "\"11월 9일 부산울산경남본부 3층 사무실 에어컨 필터 교체 작업, 검사1팀 2명\"" },
  ], { x: 0.85, y: 4.85, w: 도구폭 - 0.5, h: 1.4, fontSize: 14, color: "16233A", valign: "middle", margin: 0, isTextBox: true });
  s.addNotes("[2:00~4:00 시연] (도구.html을 미리 열고 AI 키를 넣어 둡니다)\n1) 첫 화면에서 고소작업 카드를 누릅니다.\n2) '11월 9일 부산울산경남본부 3층 사무실 에어컨 필터 교체 작업, 검사1팀 2명'을 붙여 넣고 서류 초안 만들기를 누릅니다. (10~20초)\n3) 2단계: 한 줄에서 읽은 날짜·장소·인원을 보여 주고, 작업주관팀·감독자 연락처를 넣습니다.\n4) 3단계: 사다리 전도 및 추락 9점 → 8점 이상이라 감소대책이 자동으로 들어간 것, 오른쪽 서류 4장이 채워진 것을 보여 줍니다.\n5) 4단계: 한글 파일 받기 → 한글에서 승인요청서를 열어 작업구분 ▣고소, 작업순서별 안전보건조치가 들어간 것을 보여 줍니다.\n※ 인터넷이 불안하면 이 슬라이드의 화면으로 설명합니다.");

  // ===== 5. 기술 =====
  pres.addSection({ title: "기술" });
  s = pres.addSlide({ masterName: "본문", sectionTitle: "기술" });
  s.addText("현장에서 바로 쓰도록 만든 기술", { placeholder: "title" });
  꼬리표(s, ["기술성"]);
  const 기술 = [
    ["FaComputer", "설치 없음", "도구.html 더블클릭으로 실행. 서버·프로그램 설치 없이 브라우저만 있으면 됩니다."],
    ["FaFileWord", "기관 양식 그대로", "받은 실제 한글 양식에 칸 표시를 넣어 채웁니다. 표·글꼴·모양 유지, 양식 교체도 쉬움."],
    ["FaListCheck", "5개 작업 체크리스트", "고소·중량물·전기·화기·밀폐공간. 허가서 체크 항목은 실제 양식에서 읽습니다."],
    ["FaCamera", "사진 점검", "현장 사진 속 위험을 반영하고, 작업과 맞지 않는 사진은 알려 주고 제외합니다."],
    ["FaCircleQuestion", "빠진 정보 되묻기", "날짜·장소·인원이 없으면 지어내지 않고 되묻습니다. 다른 작업이면 맞는 작업을 추천합니다."],
    ["FaShieldHalved", "안정성 장치", "AI가 바쁘면 자동 재시도, 이상한 점수는 바로잡고 알림. 최종 확인은 사람이 합니다."],
  ];
  for (let i = 0; i < 6; i++) {
    const c = i % 3, r = Math.floor(i / 3);
    const x = 0.6 + c * 4.1, y = 1.55 + r * 2.6;
    카드(s, x, y, 3.85, 2.35);
    await 아이콘원(s, 기술[i][0], x + 0.3, y + 0.3, 0.7, r === 0 ? "16233A" : "F28C28");
    s.addText(기술[i][1], { x: x + 1.15, y: y + 0.3, w: 2.5, h: 0.7, fontSize: 18, bold: true, color: "16233A", valign: "middle", margin: 0, isTextBox: true });
    s.addText(기술[i][2], { x: x + 0.3, y: y + 1.15, w: 3.3, h: 1.05, fontSize: 14, color: "3D4A5C", margin: 0, isTextBox: true });
  }
  s.addNotes("[4:00~4:50] 기술적으로는 현장에서 바로 쓸 수 있는 데 집중했습니다. 설치가 필요 없고, 기관 양식을 그대로 쓰고, 다섯 가지 작업의 실제 허가서 체크리스트를 따릅니다. 사진이 작업과 맞지 않으면 알려 주고, 정보가 빠지면 지어내지 않고 되묻습니다. 시범 시험에서 다섯 작업 × 서류 네 종, 20개 파일을 모두 정상 생성했습니다.");

  // ===== 6. 효과 =====
  pres.addSection({ title: "효과" });
  s = pres.addSlide({ masterName: "본문", sectionTitle: "효과" });
  s.addText("1시간 걸리던 서류 초안이 15초", { placeholder: "title" });
  꼬리표(s, ["실효성"]);
  const 숫자 = [
    ["15초", "초안 4종 생성 시간", "한 줄 입력부터 결과 확인까지 (시범 측정)"],
    ["0곳", "고친 곳", "빈칸만 추가 입력, 내용 수정 없음 (시범 측정)"],
    ["4종", "한 번에 작성", "승인요청서·허가서·TBM·위험성평가표"],
    ["0원", "추가 비용", "설치·서버 없음, 무료 AI 사용량으로 시범 운영"],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 0.6 + i * 3.1;
    카드(s, x, 1.55, 2.9, 3.0, i === 0 ? "16233A" : "F3F5F8");
    s.addText(숫자[i][0], { x: x + 0.25, y: 1.8, w: 2.4, h: 1.1, fontSize: 48, bold: true, color: i === 0 ? "F28C28" : "16233A", margin: 0, isTextBox: true });
    s.addText(숫자[i][1], { x: x + 0.25, y: 2.95, w: 2.4, h: 0.45, fontSize: 16, bold: true, color: i === 0 ? "FFFFFF" : "16233A", margin: 0, isTextBox: true });
    s.addText(숫자[i][2], { x: x + 0.25, y: 3.45, w: 2.45, h: 0.95, fontSize: 13, color: i === 0 ? "C8D0DC" : "3D4A5C", margin: 0, isTextBox: true });
  }
  카드(s, 0.6, 4.85, 12.13, 1.85, "FCE3CC");
  await 아이콘원(s, "FaPeopleGroup", 0.9, 5.25, 1.0, "F28C28");
  s.addText([
    { text: "누구나 같은 품질의 위험성평가", options: { bold: true, fontSize: 18, breakLine: true } },
    { text: "안전 담당이 아닌 부서 담당자도 기관 기준(빈도·강도법, 체크리스트)에 맞는 초안을 받고, 담당자는 확인과 서명에 집중합니다.", options: { fontSize: 15 } },
  ], { x: 2.2, y: 5.05, w: 10.3, h: 1.45, color: "16233A", valign: "middle", margin: 0, isTextBox: true });
  s.addNotes("[4:50~5:40] 효과입니다. 시범 측정에서 한 줄 입력부터 결과 확인까지 15초, 기존 약 1시간이었습니다. 내용을 고친 곳은 없었고 빈칸 몇 개만 채웠습니다. 설치나 서버가 없어 추가 비용이 없습니다. 무엇보다 안전 담당이 아닌 분도 기관 기준에 맞는 초안을 받을 수 있어, 서류 품질이 고르게 됩니다. (측정은 시범 1건 기준임을 밝힙니다)");

  // ===== 7. 확장 =====
  pres.addSection({ title: "확장" });
  s = pres.addSlide({ masterName: "본문", sectionTitle: "확장" });
  s.addText("양식만 바꾸면 다른 서류로 넓힐 수 있습니다", { placeholder: "title" });
  꼬리표(s, ["확장성"]);
  const 단계 = [
    ["지금 · 시범", "수시 위험성평가", ["5개 작업(고소·중량물·전기·화기·밀폐)", "서류 4종 자동 작성", "현장 사진 반영"]],
    ["다음 · 확대", "안전업무 서류 전반", ["정기 위험성평가(연 1회, 약 40시간)", "도급업체 작업 서류", "안전보건활동 계획표·구매목록 연계"]],
    ["정식 사업화", "기관 전체로", ["기관이 허용한 AI·내부망 연계", "결재·ERP 시스템 연계", "타 부서 정형 서류로 전파"]],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.1;
    카드(s, x, 1.55, 3.85, 4.1, i === 2 ? "16233A" : "F3F5F8");
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: 1.8, w: 0.6, h: 0.6, fill: { color: "F28C28" }, line: { color: "F28C28" }, objectName: "단계 번호" });
    s.addText(String(i + 1), { x: x + 0.3, y: 1.8, w: 0.6, h: 0.6, fontSize: 18, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(단계[i][0], { x: x + 1.05, y: 1.8, w: 2.6, h: 0.6, fontSize: 15, bold: true, color: i === 2 ? "F28C28" : "B3541E", valign: "middle", margin: 0, isTextBox: true });
    s.addText(단계[i][1], { x: x + 0.3, y: 2.6, w: 3.3, h: 0.55, fontSize: 20, bold: true, color: i === 2 ? "FFFFFF" : "16233A", margin: 0, isTextBox: true });
    s.addText(단계[i][2].map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < 단계[i][2].length - 1 } })),
      { x: x + 0.3, y: 3.3, w: 3.35, h: 2.1, fontSize: 14, color: i === 2 ? "C8D0DC" : "3D4A5C", paraSpaceAfter: 6, margin: 0, isTextBox: true });
    if (i < 2) s.addImage({ data: await 아이콘("FaChevronRight", "F28C28"), x: x + 3.88, y: 3.4, w: 0.2, h: 0.4 });
  }
  카드(s, 0.6, 5.9, 12.13, 0.8, "FCE3CC");
  s.addText([
    { text: "확장의 핵심: ", options: { bold: true } },
    { text: "새 서류는 한글 양식에 칸 표시({{작업명}} 등)만 넣으면 같은 방식으로 자동 작성됩니다. 프로그램을 새로 만들 필요가 없습니다." },
  ], { x: 0.85, y: 5.9, w: 11.7, h: 0.8, fontSize: 14, color: "16233A", valign: "middle", margin: 0, isTextBox: true });
  s.addNotes("[5:40~6:30] 확장성입니다. 지금은 수시 위험성평가 다섯 작업입니다. 다음은 연 1회 약 40시간이 드는 정기 위험성평가, 도급업체 서류, 안전보건활동 계획표로 넓힐 수 있습니다. 새 서류는 한글 양식에 칸 표시만 넣으면 되기 때문에 다른 부서의 정형 서류로도 쉽게 전파됩니다. 정식 사업화 단계에서는 기관이 허용한 AI나 내부망 AI, 결재·ERP와 연계하면 됩니다.");

  // ===== 8. 마무리 =====
  pres.addSection({ title: "마무리" });
  s = pres.addSlide({ masterName: "마무리", sectionTitle: "마무리" });
  s.addText("작업 한 줄, 서류 네 장\n판단의 마지막은 사람이", { placeholder: "title" });
  const 요약 = [
    ["FaLightbulb", "아이디어", "한 줄 + 사진 → AI 판단 → 기관 양식"],
    ["FaGears", "기술성", "설치 없음, 실제 양식, 5개 작업"],
    ["FaChartLine", "실효성", "1시간 → 15초,\n추가 비용 없음"],
    ["FaSitemap", "확장성", "양식만 바꾸면 다른 서류·부서로"],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 0.8 + i * 3.0;
    await 아이콘원(s, 요약[i][0], x, 3.25, 0.8, "F28C28");
    s.addText(요약[i][1], { x, y: 4.2, w: 2.8, h: 0.45, fontSize: 18, bold: true, color: "FFFFFF", margin: 0, isTextBox: true });
    s.addText(요약[i][2], { x, y: 4.7, w: 2.75, h: 0.9, fontSize: 14, color: "C8D0DC", margin: 0, isTextBox: true });
  }
  s.addText("감사합니다 · 질의응답", { x: 0.8, y: 6.25, w: 11.7, h: 0.5, fontSize: 18, bold: true, color: "F28C28", margin: 0, isTextBox: true });
  s.addNotes("[6:30~7:00] 정리하면, 작업 한 줄로 서류 네 장을 만들고 판단의 마지막은 사람이 합니다. 현장의 1시간을 15초로 줄이고, 누구나 기관 기준에 맞는 위험성평가를 할 수 있게 하겠습니다. 감사합니다.\n\n[예상 질문]\n- 보안: 입력 내용이 외부 AI로 가는데? → 시범은 가상·일반 작업 내용만, 정식 사업화 시 기관 허용 AI·내부망 AI로 바꿀 수 있게 AI 연결을 한 곳에 모아 두었습니다.\n- AI가 틀리면? → 초안일 뿐이고 3단계에서 사람이 확인·수정, 점수 이상·빈칸은 자동으로 알려 줍니다.\n- 비용? → 설치·서버 없음, 무료 사용량으로 시범 운영. 정식 운영 시 유료 사용량도 건당 비용이 매우 적습니다(확인 후 답변).\n- 다른 부서 적용? → 한글 양식에 칸 표시만 넣으면 됩니다.");

  await pres.writeFile({ fileName: 출력 });
  await applyTheme(출력, THEME);
  console.log("만듦:", 출력);
})().catch((e) => { console.error(e); process.exit(1); });
