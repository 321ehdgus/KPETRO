# 연습자료/*.csv 를 도구(도구.html)가 읽을 수 있는 데이터.js 로 바꾸는 보조 프로그램입니다.
# (도구를 쓰는 사람은 실행할 필요 없음)  실행: python3 데이터만들기.py
import csv
import json
import os

여기 = os.path.dirname(os.path.abspath(__file__))
루트 = os.path.dirname(여기)
자료 = os.path.join(루트, "연습자료")


def 읽기(이름):
    with open(os.path.join(자료, 이름), encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def 시험유형(시험점):
    """입력문장.csv 의 '시험하려는 점'을 시험 종류로 바꾼다."""
    if 시험점.startswith("정보 빠짐"):
        칸 = 시험점.split("없음")[0].split(":")[-1].strip()
        return {"종류": "정보빠짐", "빠진칸": 칸}
    if 시험점.startswith("위험이 큼"):
        return {"종류": "위험큼"}
    if 시험점.startswith("고소작업이 아님"):
        return {"종류": "범위밖"}
    if 시험점.startswith("형식이 다름"):
        return {"종류": "형식다름"}
    return {"종류": "정상"}


예시 = []
for 줄 in 읽기("입력문장.csv"):
    항목 = {"번호": int(줄["번호"]), "문장": 줄["작업 한 줄 (가상)"], "시험점": 줄["시험하려는 점"], "행동": 줄["도구가 해야 할 행동"]}
    항목.update(시험유형(줄["시험하려는 점"]))
    예시.append(항목)

허가서 = {"공통": [], "고소": []}
for 줄 in 읽기("허가서체크항목.csv"):
    허가서["공통" if 줄["구분"] == "공통사항" else "고소"].append({"항목": 줄["항목"], "체크하는경우": 줄["체크하는 경우 (모범 답안)"]})

기대 = []
for 줄 in 읽기("기대결과.csv"):
    기대.append({
        "작업유형": 줄["작업 유형"], "위험요인": 줄["위험요인"], "상황": 줄["위험발생 상황 및 결과"],
        "조치": 줄["현재 안전보건조치"], "빈도": int(줄["빈도"]), "강도": int(줄["강도"]),
        "점수": int(줄["위험성 점수(빈도×강도)"]), "대책": 줄["감소대책 (8 이상일 때)"],
    })

되묻기 = [{"칸": 줄["칸 이름"], "질문": 줄["되묻는 질문"], "예시": 줄["가상 예시 답"]} for 줄 in 읽기("되묻는칸.csv")]

내용 = {"예시문장": 예시, "허가서항목": 허가서, "기대결과": 기대, "되묻는칸": 되묻기}
with open(os.path.join(루트, "데이터.js"), "w", encoding="utf-8") as f:
    f.write("// 만들기도구/데이터만들기.py 가 연습자료/*.csv 로 만든 파일입니다. 직접 고치지 말고 CSV를 고친 뒤 다시 만드세요.\n")
    f.write("(typeof window !== \"undefined\" ? window : globalThis).데이터 = " + json.dumps(내용, ensure_ascii=False, indent=1) + ";\n")
    f.write('if (typeof module !== "undefined" && module.exports) module.exports = globalThis.데이터;\n')
print("만듦: 데이터.js  (예시 %d건, 허가서 공통 %d + 고소 %d, 기대결과 %d, 되묻는 칸 %d)" % (len(예시), len(허가서["공통"]), len(허가서["고소"]), len(기대), len(되묻기)))
