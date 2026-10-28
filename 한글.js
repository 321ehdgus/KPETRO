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

  // 값으로 이 글자를 주면 "해당 없음(일부러 비운 칸)"이다. 파일에는 빈칸으로 들어가고, 미리보기에서는 회색으로 보인다.
  var 해당없음 = "\uE001";

  // 본문 XML 글에서 {{표시}}를 값으로 바꾼다. 값이 없는 표시는 빈칸이 된다.
  // 빈값글을 주면(미리보기용) 빈칸 자리에 그 글을 넣는다.
  function 표시바꾸기(xml, 값들, 빈값글) {
    return xml.replace(/\{\{([^{}]+)\}\}/g, function (_, 키) {
      키 = 키.trim();
      if (Object.prototype.hasOwnProperty.call(값들, 키) && 값들[키] === 해당없음) return 빈값글 === undefined ? "" : 해당없음;
      var 있음 = Object.prototype.hasOwnProperty.call(값들, 키) && String(값들[키] == null ? "" : 값들[키]).trim() !== "";
      if (!있음) return 빈값글 === undefined ? "" : 빈값글;
      return 값을XML로(값들[키]);
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


  // ---- 미리보기: 채운 양식의 표를 화면용 HTML로 바꾼다 (브라우저에서만 사용) ----
  var 빈칸표시 = "\uE000";

  function HTML안전(글) {
    return String(글).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function 이름(노드) { return 노드.localName || (노드.nodeName || "").replace(/^.*:/, ""); }
  function 자식들(노드, 이름들) {
    return Array.prototype.filter.call(노드.childNodes, function (n) { return n.nodeType === 1 && 이름들.indexOf(이름(n)) >= 0; });
  }
  function 아래찾기(노드, 찾는이름) {
    var 결과 = [];
    (function 걷기(n) {
      Array.prototype.forEach.call(n.childNodes, function (c) {
        if (c.nodeType !== 1) return;
        if (이름(c) === 찾는이름) 결과.push(c);
        걷기(c);
      });
    })(노드);
    return 결과;
  }
  // 문단 하나의 글 (줄바꿈 표시는 \n)
  function 문단글(문단) {
    var 글 = "";
    아래찾기(문단, "t").forEach(function (t) {
      Array.prototype.forEach.call(t.childNodes, function (c) {
        if (c.nodeType === 3) 글 += c.nodeValue;
        else if (c.nodeType === 1 && 이름(c) === "lineBreak") 글 += "\n";
      });
    });
    return 글;
  }
  function 칸글(칸) {
    var 문단들 = 아래찾기(칸, "p");
    return 문단들.map(문단글).join("\n");
  }
  function 글을HTML로(글) {
    if (글 === 해당없음) return ""; // 해당 없음(회색 칸)
    if (글.replace(빈칸표시, "").trim() === "" && 글.indexOf(빈칸표시) >= 0) return null; // 빈칸
    return HTML안전(글.split(빈칸표시).join("")).replace(/\n/g, "<br>");
  }
  function 표HTML(표) {
    var 줄들 = 자식들(표, ["tr"]);
    var 안 = 줄들.map(function (줄) {
      var 칸들 = 자식들(줄, ["tc"]).map(function (칸) {
        var 합침 = 아래찾기(칸, "cellSpan")[0];
        var 가로 = 합침 ? parseInt(합침.getAttribute("colSpan") || "1", 10) : 1;
        var 세로 = 합침 ? parseInt(합침.getAttribute("rowSpan") || "1", 10) : 1;
        var 안글 = 글을HTML로(칸글(칸));
        var 속성 = (가로 > 1 ? ' colspan="' + 가로 + '"' : "") + (세로 > 1 ? ' rowspan="' + 세로 + '"' : "");
        if (안글 === "") return '<td class="해당없음"' + 속성 + ">&nbsp;</td>";
        return 안글 === null ? '<td class="빈칸"' + 속성 + ">&nbsp;</td>" : "<td" + 속성 + ">" + 안글 + "</td>";
      });
      return "<tr>" + 칸들.join("") + "</tr>";
    });
    return "<table>" + 안.join("") + "</table>";
  }
  function 미리보기HTML만들기(xml글) {
    var 문서 = new DOMParser().parseFromString(xml글, "application/xml");
    if (문서.getElementsByTagName("parsererror").length) throw new Error("양식 내용을 읽을 수 없습니다.");
    var 줄기 = 문서.documentElement;
    var 조각 = [];
    자식들(줄기, ["p"]).forEach(function (p) {
      var 표들 = 아래찾기(p, "tbl");
      if (표들.length) 조각.push(표HTML(표들[0]));
      else {
        var 글 = 문단글(p).replace(빈칸표시, "").trim();
        if (글) 조각.push('<p class="서류제목">' + HTML안전(글) + "</p>");
      }
    });
    return 조각.join("");
  }

  // 양식과 값으로 화면용 HTML을 만든다. 비어 있는 칸은 노란색 빈칸으로 보인다.
  async function 미리보기(양식, 값들) {
    var JSZip = JSZip가져오기();
    var 압축 = await JSZip.loadAsync(양식, typeof 양식 === "string" ? { base64: true } : undefined);
    var 이름들 = Object.keys(압축.files).filter(function (n) { return /^Contents\/section\d+\.xml$/.test(n); }).sort();
    var 조각 = [];
    for (var i = 0; i < 이름들.length; i++) {
      var 글 = await 압축.files[이름들[i]].async("string");
      조각.push(미리보기HTML만들기(표시바꾸기(글, 값들, 빈칸표시)));
    }
    return 조각.join("");
  }

  var 한글 = { 채우기: 채우기, 양식표시읽기: 양식표시읽기, 표시바꾸기: 표시바꾸기, 미리보기: 미리보기, 해당없음: 해당없음 };
  if (typeof module !== "undefined" && module.exports) module.exports = 한글;
  else 전역.한글 = 한글;
})(typeof window !== "undefined" ? window : globalThis);
