# 받은양식/ 폴더의 실제 한글 양식(.hwp) 4개를 도구의 기본 양식(.hwpx)으로 만드는 보조 프로그램입니다.
# (도구를 쓰는 사람은 실행할 필요 없음)  실행: python3 실제양식만들기.py   (python-hwpx 가 설치된 환경에서)
#
# 하는 일
#   1. 옛 한글(.hwp)을 새 한글(.hwpx)로 바꾼다 (모양·글꼴·표는 그대로).
#   2. 내용이 들어갈 칸에 {{작업명}} 같은 표시를 넣는다. 칸의 글꼴·정렬은 그대로 둔다.
#   3. 허가서 안의 작업별 체크리스트를 읽어서 연습자료/허가서체크항목.csv 를 다시 쓴다 (양식이 기준).
#   4. 양식/*.hwpx 와 양식/양식데이터.js 를 만든다.
#   ※ 칸 위치(몇 번째 표의 몇 행 몇 열)는 받은 양식에 맞춰 적었다. 양식이 바뀌면 아래 '칸 지도'를 고친다.
import base64
import copy
import csv
import os
import re
import sys
import tempfile
import warnings
import zipfile

from lxml import etree

warnings.filterwarnings("ignore")
from hwpx import HwpxDocument  # noqa: E402

여기 = os.path.dirname(os.path.abspath(__file__))
루트 = os.path.dirname(여기)
받은폴더 = os.path.join(루트, "받은양식")
출력폴더 = os.path.join(루트, "양식")
위험성평가_행수 = 6  # 위험성평가표 위험요인 줄 수 (받은 양식은 3줄 → 6줄로 늘림)

받은파일 = {
    "승인요청서": "작업시행 승인 요청서.hwp",
    "TBM활동일지": "tbm 활동일지.hwp",
    "안전작업허가서": "안전작업 허가서.hwp",
    "위험성평가표": "위험성평가표.hwp",
}


# ---------- XML 다루는 도구 ----------
def L(e):
    return etree.QName(e).localname if isinstance(e.tag, str) else ""


def 자식(e, 이름):
    return [x for x in e if L(x) == 이름]


def 큰표들(root):
    """본문에 바로 있는 표(칸 안에 들어 있는 작은 표는 뺀다)를 나오는 순서대로"""
    return [t for t in root.iter() if L(t) == "tbl" and not any(L(a) == "tc" for a in t.iterancestors())]


def 표찾기(root, 행수, 열수, 몇번째=0):
    """행·열 수로 표를 찾는다 (양식 안의 작은 상자 표와 헷갈리지 않게)"""
    맞음 = [t for t in 큰표들(root) if t.get("rowCnt") == str(행수) and t.get("colCnt") == str(열수)]
    if len(맞음) <= 몇번째:
        raise KeyError("표 없음: %d행 %d열" % (행수, 열수))
    return 맞음[몇번째]


def 칸(표, 행, 열):
    for tr in 자식(표, "tr"):
        for tc in 자식(tr, "tc"):
            a = 자식(tc, "cellAddr")[0]
            if int(a.get("rowAddr")) == 행 and int(a.get("colAddr")) == 열:
                return tc
    raise KeyError("칸 없음: 행%d 열%d" % (행, 열))


def 문단들(tc):
    sub = 자식(tc, "subList")[0]
    return 자식(sub, "p")


def 문단글(p):
    out = []
    for t in p.iter():
        if L(t) == "t":
            out.append("".join(t.itertext()))
    return "".join(out)


def 문단바꾸기(p, 글):
    """문단의 글을 바꾼다. 첫 글자 묶음(run)의 글꼴을 그대로 쓴다."""
    runs = 자식(p, "run")
    대상 = None
    for r in runs:
        if 자식(r, "t"):
            대상 = r
            break
    if 대상 is None:
        if not runs:
            ns = etree.QName(p).namespace
            대상 = etree.SubElement(p, "{%s}run" % ns, charPrIDRef="0")
            p.remove(대상)
            p.insert(0, 대상)
        else:
            대상 = runs[0]
    ns = etree.QName(p).namespace
    for r in runs:
        for t in 자식(r, "t"):
            r.remove(t)
    t = etree.SubElement(대상, "{%s}t" % ns)
    t.text = 글
    for la in 자식(p, "linesegarray"):  # 줄 나눔 정보는 한글이 다시 계산하도록 지운다
        p.remove(la)


def 칸바꾸기(tc, 글):
    ps = 문단들(tc)
    문단바꾸기(ps[0], 글)
    sub = 자식(tc, "subList")[0]
    for p in ps[1:]:
        sub.remove(p)


def 글자바꾸기(요소, 옛, 새):
    """요소 안의 글자 묶음(t) 하나에 들어 있는 '옛'을 '새'로 바꾼다 (처음 한 번)"""
    for t in 요소.iter():
        if L(t) != "t":
            continue
        if t.text and 옛 in t.text:
            t.text = t.text.replace(옛, 새, 1)
            return True
        for c in t:
            if c.tail and 옛 in c.tail:
                c.tail = c.tail.replace(옛, 새, 1)
                return True
    # 글자가 여러 묶음으로 나뉘어 있으면, 그 문단 전체를 한 묶음으로 다시 쓴다 (첫 묶음 글꼴)
    for p in 요소.iter():
        if L(p) == "p" and 옛 in 문단글(p) and not any(L(x) == "p" for x in p.iter() if x is not p):
            문단바꾸기(p, 문단글(p).replace(옛, 새, 1))
            return True
    raise ValueError("글자를 찾지 못함: " + 옛)


def 줄나눔지우기(요소):
    for p in 요소.iter():
        if L(p) == "p":
            for la in 자식(p, "linesegarray"):
                p.remove(la)


def 표(키):
    return "{{" + 키 + "}}"


# ---------- 바꾸기: hwp → hwpx ----------
def hwpx로(파일):
    문서 = HwpxDocument.open(파일)
    임시 = tempfile.mktemp(suffix=".hwpx")
    문서.save_to_path(임시)
    with open(임시, "rb") as f:
        바이트 = f.read()
    os.remove(임시)
    return 바이트


def 본문고치기(바이트, 고치기):
    """hwpx 바이트의 본문(section0.xml)을 고치기(root) 함수로 고친 뒤 새 바이트를 돌려준다"""
    zin = zipfile.ZipFile(__import__("io").BytesIO(바이트))
    out = __import__("io").BytesIO()
    zout = zipfile.ZipFile(out, "w")
    for info in zin.infolist():
        data = zin.read(info.filename)
        if re.match(r"Contents/section\d+\.xml$", info.filename):
            root = etree.fromstring(data)
            고치기(root)
            data = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
        if info.filename == "Preview/PrvText.txt":
            data = "연습용 양식".encode("utf-16-le") if False else data
        zi = zipfile.ZipInfo(info.filename, date_time=info.date_time)
        zi.compress_type = zipfile.ZIP_STORED if info.filename == "mimetype" else zipfile.ZIP_DEFLATED
        zout.writestr(zi, data)
    zout.close()
    return out.getvalue()


# ---------- 칸 지도: 양식마다 어느 칸에 무엇을 넣는지 ----------
def 승인요청서(root):
    t = 표찾기(root, 16, 9)
    칸바꾸기(칸(t, 1, 1), 표("작업주관팀"))
    for 열, 키, 이름 in [(1, "화기", "화기"), (3, "고소", "고소"), (5, "전기", "전기"), (7, "밀폐", "밀폐"), (8, "중량", "중량물취급")]:
        칸바꾸기(칸(t, 2, 열), 표("작업구분_" + 키) + " " + 이름)
    칸바꾸기(칸(t, 3, 1), 표("작업명"))
    칸바꾸기(칸(t, 3, 6), 표("작업장소"))
    칸바꾸기(칸(t, 4, 1), 표("작업일시"))
    칸바꾸기(칸(t, 4, 6), 표("작업인원"))
    칸바꾸기(칸(t, 5, 1), 표("승강기사용"))
    칸바꾸기(칸(t, 5, 6), 표("감독자연락처"))
    ps = 문단들(칸(t, 6, 1))
    문단바꾸기(ps[0], "- 혼재작업 여부 : " + 표("혼재작업"))
    문단바꾸기(ps[1], "- 현장 위험요인(기상상황, 미끄럼, 전기, 밀폐공간 여부) : " + 표("현장위험요인"))
    for i, 행 in enumerate([8, 9, 10], 1):
        칸바꾸기(칸(t, 행, 1), 표("순서%d" % i))
        칸바꾸기(칸(t, 행, 2), 표("조치%d" % i))
    칸바꾸기(칸(t, 11, 1), 표("기타사항"))
    문단바꾸기(문단들(칸(t, 14, 1))[0], 표("검토의견"))
    줄나눔지우기(t)


def TBM활동일지(root):
    t1, t2, t3, t4 = 표찾기(root, 2, 8), 표찾기(root, 3, 6), 표찾기(root, 3, 3), 표찾기(root, 4, 3)
    표들 = [t1, t2, t3, t4]
    칸바꾸기(칸(t1, 1, 1), 표("현장명"))
    칸바꾸기(칸(t1, 1, 3), 표("업체명"))
    칸바꾸기(칸(t1, 1, 6), 표("일자"))
    # 본문 문단 "1. 작업개요 [작업공종 :      ]"
    for p in root.iter():
        if L(p) == "p" and "작업공종" in 문단글(p) and not any(L(a) == "tc" for a in p.iterancestors()):
            글 = 문단글(p)
            문단바꾸기(p, re.sub(r"작업공종\s*:\s*[^\]]*\]", "작업공종 : " + 표("공종") + " ]", 글))
            break
    for 열, 키 in enumerate(["작업위치", "공종", "작업명", "투입장비", "수량", "투입인원"]):
        칸바꾸기(칸(t2, 1, 열), 표(키))
        칸바꾸기(칸(t2, 2, 열), "")
    칸바꾸기(칸(t3, 1, 0), 표("위험요인"))
    칸바꾸기(칸(t3, 1, 1), 표("안전대책"))
    칸바꾸기(칸(t3, 1, 2), 표("확인서명"))
    for 열 in range(3):
        칸바꾸기(칸(t3, 2, 열), "")
    칸바꾸기(칸(t4, 1, 0), 표("교육구분"))
    칸바꾸기(칸(t4, 1, 1), 표("교육내용"))
    칸바꾸기(칸(t4, 1, 2), 표("교육비고"))
    for 행 in (2, 3):
        for 열 in range(3):
            칸바꾸기(칸(t4, 행, 열), "")
    for t in 표들:
        줄나눔지우기(t)


구분이름 = {"공통사항": "공통", "고소작업": "고소", "중량물 취급작업": "중량", "화기 작업": "화기", "전기차단 작업": "전기", "밀폐공간 작업": "밀폐", "기타 사항": "기타"}


def 허가서_체크리스트읽기(t):
    """허가서 큰 표에서 [(구분키, 번호, 항목, 점검칸(행,열), 머리칸(행,열))]를 읽는다. 왼쪽(0~11열)·오른쪽(12~21열) 두 줄."""
    결과 = []
    for 시작열, 글열, 점검열 in [(0, 1, 10), (12, 13, 20)]:
        지금 = None
        for 행 in range(6, 30):
            try:
                tc = 칸(t, 행, 시작열)
            except KeyError:
                continue
            글 = "".join(문단글(p) for p in 문단들(tc)).strip()
            m = re.match(r"^□\s*(.+)$", 글)
            if m and m.group(1).strip() in 구분이름:
                지금 = 구분이름[m.group(1).strip()]
                결과.append((지금, 0, "", None, (행, 시작열)))
                continue
            if 지금 and re.match(r"^\d+$", 글):
                항목 = "".join(문단글(p) for p in 문단들(칸(t, 행, 글열)))
                결과.append((지금, int(글), 항목.strip(), (행, 점검열), None))
    return 결과


def 안전작업허가서(root):
    t = 표찾기(root, 43, 22)
    칸바꾸기(칸(t, 0, 3), 표("작업명"))
    칸바꾸기(칸(t, 0, 10), 표("작업일시") + " (8시간 초과 금지)")
    ps = 문단들(칸(t, 0, 15))
    문단바꾸기(ps[-1], "(" + 표("총인원") + " 명)")
    칸바꾸기(칸(t, 0, 17), 표("작업인원"))
    칸바꾸기(칸(t, 1, 3), 표("작업장소"))
    칸바꾸기(칸(t, 1, 10), 표("업체명"))
    칸바꾸기(칸(t, 2, 17), 표("승인번호"))
    칸바꾸기(칸(t, 3, 3), 표("작성자"))
    칸바꾸기(칸(t, 3, 10), "☎ " + 표("작성자연락처"))
    칸바꾸기(칸(t, 4, 3), 표("확인자"))
    칸바꾸기(칸(t, 4, 10), "☎ " + 표("확인자연락처"))
    for 구분, 번호, 항목, 점검, 머리 in 허가서_체크리스트읽기(t):
        if 머리:
            글자바꾸기(칸(t, *머리), "□", 표("섹션_" + 구분))
        elif 구분 == "기타":
            칸바꾸기(칸(t, 점검[0], 13), 표("기타%d" % 번호))
            칸바꾸기(칸(t, *점검), 표("기타점검%d" % 번호))
        else:
            칸바꾸기(칸(t, *점검), 표("%s%d" % (구분, 번호)))
    ps = 문단들(칸(t, 30, 12))
    문단바꾸기(ps[-1], 표("안전중점"))
    교육 = 칸(t, 32, 0)
    for i, 이름 in enumerate(["작업계획서", "특별안전보건교육", "물질안전보건자료 교육", "보호구사용", "기타"], 1):
        글자바꾸기(교육, "□ " + 이름, 표("교육%d" % i) + " " + 이름)
    줄나눔지우기(t)


def 위험성평가표(root):
    t = 표찾기(root, 6, 15)
    글자바꾸기(칸(t, 0, 0), "공정명:", "공정명: " + 표("공정명"))
    글자바꾸기(칸(t, 0, 12), "평가일자:", "평가일자: " + 표("평가일자"))
    # 위험요인 줄을 3줄 → 위험성평가_행수 줄로 늘린다 (마지막 줄을 복사)
    줄들 = 자식(t, "tr")
    마지막 = 줄들[-1]
    더할수 = 위험성평가_행수 - 3
    줄높이 = max(int(자식(tc, "cellSz")[0].get("height")) for tc in 자식(마지막, "tc"))
    for k in range(더할수):
        새줄 = copy.deepcopy(마지막)
        for tc in 자식(새줄, "tc"):
            자식(tc, "cellAddr")[0].set("rowAddr", str(6 + k))
        마지막.addnext(새줄)
        마지막 = 새줄
    t.set("rowCnt", str(int(t.get("rowCnt")) + 더할수))
    for sz in 자식(t, "sz"):
        sz.set("height", str(int(sz.get("height")) + 줄높이 * 더할수))
    for 열 in (0, 1):  # 공정명·세부작업명 칸은 위험요인 줄 전체를 세로로 합친 칸
        자식(칸(t, 3, 열), "cellSpan")[0].set("rowSpan", str(위험성평가_행수))
    칸바꾸기(칸(t, 3, 0), 표("행1_공정"))
    칸바꾸기(칸(t, 3, 1), 표("행1_세부작업"))
    열키 = {2: "분류", 3: "상황", 4: "조치", 5: "빈도", 6: "강도", 7: "점수", 8: "대책", 9: "후빈도", 10: "후강도", 11: "후점수", 12: "예정일", 13: "완료일", 14: "담당자"}
    for n in range(1, 위험성평가_행수 + 1):
        for 열, 키 in 열키.items():
            칸바꾸기(칸(t, 2 + n, 열), 표("행%d_%s" % (n, 키)))
    줄나눔지우기(t)


고치기목록 = {"승인요청서": 승인요청서, "TBM활동일지": TBM활동일지, "안전작업허가서": 안전작업허가서, "위험성평가표": 위험성평가표}


def 체크항목CSV쓰기(허가서바이트):
    """허가서 양식에서 읽은 체크리스트로 연습자료/허가서체크항목.csv 를 다시 쓴다 (예전 '체크하는 경우'는 같은 항목이면 이어 쓴다)"""
    root = etree.fromstring(zipfile.ZipFile(__import__("io").BytesIO(허가서바이트)).read("Contents/section0.xml"))
    목록 = 허가서_체크리스트읽기(표찾기(root, 43, 22))
    경로 = os.path.join(루트, "연습자료", "허가서체크항목.csv")
    예전 = {}
    if os.path.exists(경로):
        with open(경로, encoding="utf-8-sig") as f:
            for 줄 in csv.DictReader(f):
                예전[re.sub(r"\s", "", 줄["항목"])] = 줄["체크하는 경우 (모범 답안)"]
    csv이름 = {"공통": "공통사항", "고소": "고소작업", "중량": "중량물취급작업", "화기": "화기작업", "전기": "전기차단작업", "밀폐": "밀폐공간작업"}
    순서 = ["공통", "고소", "중량", "화기", "전기", "밀폐"]
    줄들 = [x for x in 목록 if x[1] and x[0] in csv이름]
    줄들.sort(key=lambda x: (순서.index(x[0]), x[1]))
    with open(경로, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["구분", "번호", "항목", "체크하는 경우 (모범 답안)", "출처"])
        for 구분, 번호, 항목, _, _ in 줄들:
            w.writerow([csv이름[구분], 번호, 항목, 예전.get(re.sub(r"\s", "", 항목), ""), "실제 양식"])
    print("만듦: 연습자료/허가서체크항목.csv  (" + ", ".join("%s %d" % (k, sum(1 for x in 줄들 if x[0] == k)) for k in 순서) + ")")


def main():
    os.makedirs(출력폴더, exist_ok=True)
    결과 = {}
    for 이름, 파일 in 받은파일.items():
        원본 = os.path.join(받은폴더, 파일)
        if not os.path.exists(원본):
            sys.exit("받은 양식이 없습니다: " + 원본)
        바이트 = hwpx로(원본)
        if 이름 == "안전작업허가서":
            체크항목CSV쓰기(바이트)
        새 = 본문고치기(바이트, 고치기목록[이름])
        with open(os.path.join(출력폴더, 이름 + ".hwpx"), "wb") as f:
            f.write(새)
        결과[이름] = 새
        표시 = sorted(set(re.findall(r"\{\{([^{}]+)\}\}", zipfile.ZipFile(__import__("io").BytesIO(새)).read("Contents/section0.xml").decode("utf-8"))))
        print("만듦: 양식/%s.hwpx  (표시 %d개)" % (이름, len(표시)))
    줄 = ["// 만들기도구/실제양식만들기.py 가 받은양식/*.hwp 로 만든 파일입니다. 직접 고치지 마세요.", "window.양식데이터 = {"]
    for 이름 in ["승인요청서", "TBM활동일지", "안전작업허가서", "위험성평가표"]:
        줄.append('  "%s": "%s",' % (이름, base64.b64encode(결과[이름]).decode("ascii")))
    줄.append("};")
    with open(os.path.join(출력폴더, "양식데이터.js"), "w", encoding="utf-8") as f:
        f.write("\n".join(줄) + "\n")
    print("만듦: 양식/양식데이터.js")


if __name__ == "__main__":
    main()
