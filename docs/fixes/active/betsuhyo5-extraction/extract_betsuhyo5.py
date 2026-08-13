"""
調査用スクリプト(docs/fixes/active/investigation_betsuhyo5_xml_extraction.md)
e-Gov法令API v2から取得した所得税法XML(shotokuzei_raw.xml)から別表第五を抽出し、
構造・行数・境界値の一致を確認する。src/配下には一切触れない。

実行: python extract_betsuhyo5.py
(生XML・中間データは raw-data/ 配下に置く。.gitignore対象なので、実行前に
raw-data/shotokuzei_raw.xml が無い場合は e-Gov法令API v2から再取得すること:
https://laws.e-gov.go.jp/api/2/law_data/340AC0000000033?response_format=xml)
"""
import re
import xml.etree.ElementTree as ET
import json

SRC = "raw-data/shotokuzei_raw.xml"

with open(SRC, encoding="utf-8") as f:
    data = f.read()

# 別表第五の開始位置(<AppdxTableTitle>別表第五</AppdxTableTitle>を含む<AppdxTable>の開始)を特定する。
# 直前に出現する<AppdxTable>のタグ開始位置を探す。
title_idx = data.index("<AppdxTableTitle>別表第五</AppdxTableTitle>")
appdx_start = data.rindex("<AppdxTable>", 0, title_idx)
appdx_end = data.index("</AppdxTable>", title_idx) + len("</AppdxTable>")
fragment = data[appdx_start:appdx_end]

print(f"fragment length: {len(fragment)} chars")

root = ET.fromstring(fragment)

related = root.findtext("RelatedArticleNum")
print("RelatedArticleNum:", related)

table_structs = root.findall("TableStruct")
print("TableStruct(sub-table) count:", len(table_structs))
for ts in table_structs:
    title = ts.findtext("TableStructTitle")
    print("  -", title)

# 各TableStructの<Table>内、<TableRow>を走査する。
# ヘッダー行(「給与等の金額」「以上」「未満」等)を除き、
# 1行に「以上/未満/控除後金額」の3組が横並びで入っている構造を分解する。
rows = []
for ts in table_structs:
    sub_title = ts.findtext("TableStructTitle")
    table = ts.find("Table")
    if table is None:
        continue
    table_rows = table.findall("TableRow")
    for tr in table_rows:
        cols = tr.findall("TableColumn")
        texts = []
        for c in cols:
            # <Sentence>内のテキストを結合(通常1つ)
            sentence_texts = []
            for s in c.findall("Sentence"):
                t = "".join(s.itertext())
                sentence_texts.append(t)
            texts.append("".join(sentence_texts).strip())
        # ヘッダー行の判定:「給与等の金額」「給与所得控除後の給与等の金額」「以上」「未満」等の
        # 見出し語が含まれる行はスキップする。
        joined = "".join(texts)
        if "給与等の金額" in joined or joined in ("", ) or (len(texts) >= 2 and texts[0] in ("以上", "未満")):
            continue
        # 3組(6列 or 端数で3列/4列)のデータ行を想定。3列ずつ切り出す。
        for i in range(0, len(texts) - 2, 3):
            triple = texts[i:i+3]
            if len(triple) < 3:
                continue
            lo, hi, ded = triple
            if lo == "" and hi == "" and ded == "":
                continue
            rows.append({"sub_table": sub_title, "income_from": lo, "income_to": hi, "deduction_result": ded})

print("extracted data row count:", len(rows))
print("\n--- head 5 ---")
for r in rows[:5]:
    print(r)
print("\n--- tail 5 ---")
for r in rows[-5:]:
    print(r)

with open("raw-data/betsuhyo5_extracted.json", "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)

print("\nsaved to raw-data/betsuhyo5_extracted.json")
