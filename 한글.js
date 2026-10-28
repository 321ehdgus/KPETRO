// 한글.js - 양식(.hwpx) 안의 {{표시}}를 값으로 바꿔서 새 .hwpx 파일을 만든다.
// .hwpx 는 압축 파일이다. 압축을 열고, 본문(section*.xml)의 {{표시}}를 바꾸고, 다시 압축한다.
// 필요한 부품: 라이브러리/jszip.min.js (인터넷 없이 쓰도록 폴더에 함께 있음)
(function (전역) {
  "use strict";

  // 글자를 XML 안에 넣어도 되도록 바꾼다.
  function 안전하게(글) {
    return String(글)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // 여러 줄 글은 줄바꿈 표시로 바꾼다.
  function 값을XML로(값) {
    var 줄들 = String(값 == null ? "" : 값).replace(/\r\n?/g, "\n").split("\n");
    return 줄들.map(안전하게).join("<hp:lineBreak/>");
  }

  // 본문 XML 글에서 {{표시}}를 값으로 바꾼다. 값이 없는 표시는 빈칸이 된다.
  function 표시바꾸기(xml, 값들) {
    return xml.replace(/\{\{([^{}]+)\}\}/g, function (_, 키) {
      키 = 키.trim();
      return Object.prototype.hasOwnProperty.call(값들, 키) ? 값을XML로(값들[키]) : "";
    });
  }

  // 양식에 들어 있는 {{표시}} 이름 목록 (시험·점검용)
  function 표시목록(xml) {
    var 찾음 = {};
    xml.replace(/\{\{([^{}]+)\}\}/g, function (_, 키) { 찾음[키.trim()] = true; return ""; });
    return Object.keys(찾음);
  }

  function JSZip가져오기() {
    var Z = 전역.JSZip || (typeof require === "function" ? require("jszip") : null);
    if (!Z) throw new Error("압축 부품(JSZip)을 찾을 수 없습니다. 라이브러리/jszip.min.js 가 있는지 확인하세요.");
    return Z;
  }

  // 양식 바이트(ArrayBuffer/Uint8Array/base64 글)와 값 모음으로 새 .hwpx 바이트를 만든다.
  async function 채우기(양식, 값들, 결과종류) {
    var JSZip = JSZip가져오기();
    var 압축 = await JSZip.loadAsync(양식, typeof 양식 === "string" ? { base64: true } : undefined);
    var 이름들 = Object.keys(압축.files);
    var 새압축 = new JSZip();
    var 바꾼곳 = 0;
    for (var i = 0; i < 이름들.length; i++) {
      var 이름 = 이름들[i];
      var 항목 = 압축.files[이름];
      if (항목.dir) continue;
      if (/^Contents\/section\d+\.xml$/.test(이름)) {
        var 글 = await 항목.async("string");
        var 새글 = 표시바꾸기(글, 값들);
        if (새글 !== 글) 바꾼곳++;
        새압축.file(이름, 새글, { compression: "DEFLATE" });
      } else {
        // 한글은 mimetype 파일이 맨 앞에 압축 없이 들어 있어야 열린다.
        var 바이트 = await 항목.async("uint8array");
        새압축.file(이름, 바이트, { compression: 이름 === "mimetype" ? "STORE" : "DEFLATE" });
      }
    }
    if (!바꾼곳) throw new Error("양식에서 {{표시}}를 찾지 못했습니다. 양식 파일이 맞는지 확인하세요.");
    return 새압축.generateAsync({
      type: 결과종류 || "uint8array",
      mimeType: "application/hwp+zip",
      compression: "DEFLATE",
    });
  }

  // 양식에서 {{표시}} 이름 목록을 읽는다.
  async function 양식표시읽기(양식) {
    var JSZip = JSZip가져오기();
    var 압축 = await JSZip.loadAsync(양식, typeof 양식 === "string" ? { base64: true } : undefined);
    var 모음 = {};
    var 이름들 = Object.keys(압축.files);
    for (var i = 0; i < 이름들.length; i++) {
      if (/^Contents\/section\d+\.xml$/.test(이름들[i])) {
        표시목록(await 압축.files[이름들[i]].async("string")).forEach(function (k) { 모음[k] = true; });
      }
    }
    return Object.keys(모음);
  }

  var 한글 = { 채우기: 채우기, 양식표시읽기: 양식표시읽기, 표시바꾸기: 표시바꾸기 };
  if (typeof module !== "undefined" && module.exports) module.exports = 한글;
  else 전역.한글 = 한글;
})(typeof window !== "undefined" ? window : globalThis);
