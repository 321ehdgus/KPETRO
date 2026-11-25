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

  // ===== 배경: 왜 이 주제인가 (1장과 2장 사이에 넣을 슬라이드) =====
  pres.addSection({ title: "배경" });
  let s = pres.addSlide({ masterName: "본문", sectionTitle: "배경" });
  s.addText("왜 이 주제인가 — 안전업무 초심자를 위해", { placeholder: "title" });
  꼬리표(s, ["아이디어", "실효성"]);

  // 왼쪽: 안전 강화 흐름 (세로 타임라인)
  카드(s, 0.6, 1.55, 6.2, 5.15);
  s.addText("안전은 계속 강화되고 있습니다", { x: 0.9, y: 1.75, w: 5.6, h: 0.5, fontSize: 18, bold: true, color: "16233A", margin: 0, isTextBox: true });
  const 흐름 = [
    ["FaScaleBalanced", "2022~", "중대재해처벌법 시행", "전국적으로 사업장 안전 책임과 관리 기준이 크게 강화"],
    ["FaBuildingShield", "우리 기관", "안전보건 강화에 발맞춤", "위험성평가·허가서 등 안전 서류와 절차가 더 촘촘해짐"],
    ["FaUserTie", "2025", "이사장 직속 안전보건팀 신설", "기관 차원의 안전 관리 체계가 한층 강화"],
  ];
  s.addShape(pres.shapes.LINE, { x: 1.3, y: 2.75, w: 0, h: 3.0, line: { color: "F28C28", width: 2 }, objectName: "흐름 선" });
  for (let i = 0; i < 3; i++) {
    const y = 2.45 + i * 1.4;
    await 아이콘원(s, 흐름[i][0], 0.95, y, 0.7, i === 2 ? "F28C28" : "16233A");
    s.addText(흐름[i][1], { x: 1.85, y: y - 0.02, w: 1.4, h: 0.35, fontSize: 13, bold: true, color: "B3541E", margin: 0, isTextBox: true });
    s.addText(흐름[i][2], { x: 1.85, y: y + 0.3, w: 4.75, h: 0.4, fontSize: 16, bold: true, color: "16233A", margin: 0, isTextBox: true });
    s.addText(흐름[i][3], { x: 1.85, y: y + 0.7, w: 4.75, h: 0.4, fontSize: 13, color: "3D4A5C", margin: 0, isTextBox: true });
  }

  // 오른쪽 위: 현장의 현실
  카드(s, 7.05, 1.55, 5.68, 2.85, "16233A");
  await 아이콘원(s, "FaArrowsRotate", 7.35, 1.85, 0.75, "F28C28");
  s.addText("그런데 현장은", { x: 8.3, y: 1.85, w: 4.2, h: 0.75, fontSize: 20, bold: true, color: "F28C28", valign: "middle", margin: 0, isTextBox: true });
  s.addText([
    { text: "사업장마다 안전 전담 직원이 따로 없고", options: { bullet: true, breakLine: true } },
    { text: "순환 근무로 안전업무를 처음 맡는 사람이 많음", options: { bullet: true, breakLine: true } },
    { text: "기준은 높아졌는데, 경험은 매번 처음부터", options: { bullet: true } },
  ], { x: 7.35, y: 2.8, w: 5.1, h: 1.45, fontSize: 15, color: "FFFFFF", paraSpaceAfter: 6, margin: 0, isTextBox: true });

  // 오른쪽 아래: 그래서
  카드(s, 7.05, 4.65, 5.68, 2.05, "FCE3CC");
  await 아이콘원(s, "FaSeedling", 7.35, 4.95, 0.75, "F28C28");
  s.addText("그래서, 초심자도 기관 기준대로", { x: 8.3, y: 4.95, w: 4.25, h: 0.75, fontSize: 19, bold: true, color: "16233A", valign: "middle", margin: 0, isTextBox: true });
  s.addText("안전업무가 처음인 담당자도 작업 한 줄만 적으면 기관 양식과 기준에 맞는 서류 초안을 받을 수 있게 만들었습니다.", { x: 7.35, y: 5.8, w: 5.1, h: 0.8, fontSize: 14, color: "16233A", margin: 0, isTextBox: true });

  s.addNotes("[0:20~0:50 배경] 이 주제를 고른 이유입니다. 2022년 중대재해처벌법 시행 이후 전국적으로 안전이 강화됐고, 우리 기관도 이에 발맞춰 안전보건을 강화해 왔습니다. 작년에는 이사장님 직속 안전보건팀도 생겼습니다. 그런데 현장에는 사업장마다 안전 전담 직원이 따로 없고, 순환 근무를 하다 보면 안전업무를 처음 맡는 분이 많습니다. 기준은 높아졌는데 경험은 매번 처음부터입니다. 그래서 안전업무가 처음인 분도 작업 한 줄만 적으면 기관 기준에 맞는 서류 초안을 받을 수 있도록 이 도구를 만들었습니다.\n※ 이 장이 들어가면 약 30초가 늘어납니다. 2장(문제)과 5장(기술)의 설명을 조금씩 줄여 7분을 맞춰 주세요.");

  await pres.writeFile({ fileName: 출력 });
  await applyTheme(출력, THEME);
  console.log("만듦:", 출력);
})().catch((e) => { console.error(e); process.exit(1); });
