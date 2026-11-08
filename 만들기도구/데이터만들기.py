# 연습자료/허가서체크항목.csv, 되묻는칸.csv 를 도구(도구.html)가 읽을 수 있는 데이터.js 로 바꾸는 보조 프로그램입니다.
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


# CSV의 구분 이름 → 양식의 {{표시}} 앞글자 (공통1, 고소1, 중량1 …). 작업종류.js의 허가서구분과 같아야 한다.
구분키 = {"공통사항": "공통", "고소작업": "고소", "중량물취급작업": "중량", "화기작업": "화기", "전기차단작업": "전기", "밀폐공간작업": "밀폐"}
허가서 = {키: [] for 키 in 구분키.values()}
구분이름 = {키: 이름 for 이름, 키 in 구분키.items()}
for 줄 in 읽기("허가서체크항목.csv"):
    if 줄["구분"] not in 구분키:
        raise SystemExit("허가서체크항목.csv에 모르는 구분이 있습니다: " + 줄["구분"])
    허가서[구분키[줄["구분"]]].append({"항목": 줄["항목"], "체크하는경우": 줄["체크하는 경우 (모범 답안)"], "출처": 줄.get("출처") or ""})

되묻기 = [{"칸": 줄["칸 이름"], "질문": 줄["되묻는 질문"], "예시": 줄["가상 예시 답"]} for 줄 in 읽기("되묻는칸.csv")]

내용 = {"허가서항목": 허가서, "허가서구분이름": 구분이름, "되묻는칸": 되묻기}
with open(os.path.join(루트, "데이터.js"), "w", encoding="utf-8") as f:
    f.write("// 만들기도구/데이터만들기.py 가 연습자료/*.csv 로 만든 파일입니다. 직접 고치지 말고 CSV를 고친 뒤 다시 만드세요.\n")
    f.write("(typeof window !== \"undefined\" ? window : globalThis).데이터 = " + json.dumps(내용, ensure_ascii=False, indent=1) + ";\n")
    f.write('if (typeof module !== "undefined" && module.exports) module.exports = globalThis.데이터;\n')
print("만듦: 데이터.js  (허가서 " + ", ".join("%s %d" % (k, len(v)) for k, v in 허가서.items()) + ", 되묻는 칸 %d)" % len(되묻기))
