"""
境界値照合用スクリプト。別表第五フラグメント内で対象の収入額(全角)を検索し、
その値が入っている<TableColumn>の直後2つの<TableColumn>(通常は to, result)を取得して
理論値(速算表formula)と突き合わせる。
(生XML・出力は raw-data/ 配下。.gitignore対象。)
"""
import re

with open("raw-data/shotokuzei_raw.xml", encoding="utf-8") as f:
    data = f.read()

title_idx = data.index("<AppdxTableTitle>別表第五</AppdxTableTitle>")
appdx_start = data.rindex("<AppdxTable>", 0, title_idx)
appdx_end = data.index("</AppdxTable>", title_idx) + len("</AppdxTable>")
fragment = data[appdx_start:appdx_end]

def zenkaku(n):
    s = f"{n:,}"
    table = str.maketrans("0123456789,", "０１２３４５６７８９，")
    return s.translate(table)

def han_to_num(s):
    table = str.maketrans("０１２３４５６７８９，", "0123456789,")
    s = s.translate(table).replace(",", "")
    return int(s) if s.isdigit() else None

def next_sentences(pos, count=3):
    """posより後ろで最初に出現するcount個の<Sentence>...</Sentence>のテキストを返す"""
    out = []
    i = pos
    for _ in range(count):
        m = re.search(r"<Sentence[^>]*>([^<]*)</Sentence>", fragment[i:i+2000])
        if not m:
            break
        out.append(m.group(1))
        i = i + m.end()
    return out

# calcSalaryIncomeDeduction() と同じ式(src/lib/tax/residentTaxTiming.tsから転記、検証専用)
def calc_deduction(income):
    if income <= 1_900_000:
        return 650_000
    if income <= 3_600_000:
        return int(income * 0.3 + 80_000)
    if income <= 6_600_000:
        return int(income * 0.2 + 440_000)
    if income <= 8_500_000:
        return int(income * 0.1 + 1_100_000)
    return 1_950_000

targets = [1_900_000, 1_904_000, 3_000_000, 3_600_000, 4_000_000, 5_000_000, 6_000_000, 6_600_000]

out = []
for t in targets:
    zt = zenkaku(t)
    idx = fragment.find(zt)
    if idx == -1:
        out.append(f"income={t}: NOT FOUND in fragment")
        continue
    # このセルが「以上(from)」列だと仮定し、直後のSentenceを2つ読む(to, result)
    following = next_sentences(idx, 3)
    parsed = [han_to_num(x) for x in following]
    out.append(f"income={t} (zenkaku={zt}) found at {idx}")
    out.append(f"  following cells (raw): {following}")
    out.append(f"  following cells (parsed): {parsed}")
    net_official_guess = None
    if len(parsed) >= 2 and parsed[1] is not None:
        net_official_guess = parsed[1]
    expected_net = t - calc_deduction(t)
    out.append(f"  our formula: deduction={calc_deduction(t)} net={expected_net}")
    out.append("")

with open("raw-data/boundaries_output.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))

