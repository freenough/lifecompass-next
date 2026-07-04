/**
 * 数値入力欄の生文字列から不要な先頭の0を除去する。
 * type="number"はselectionStart/selectionEnd/.select()の挙動がブラウザ間で不安定なため、
 * フォーカス時の全選択に頼らず、onChange側でも「050」→「50」のような値を正規化する。
 * 小数（"0.5"等）はそのまま残す。
 */
export function stripLeadingZero(raw: string): string {
  if (raw === '') return raw;
  const stripped = raw.replace(/^0+(?=\d)/, '');
  return stripped === '' ? '0' : stripped;
}

/**
 * type="number"はselectionStart/selectionEnd/.select()がブラウザ間で信頼できないため
 * （2回目以降のクリックで選択が外れ、カーソル位置次第で既存の"0"の前後に新しい桁が
 * 挿入されて残ってしまう＝先頭0バグの根本原因）、値が"0"のときはfocus/click時に
 * 空文字へクリアする。これによりカーソル位置に関係なく次の入力がそのまま反映される。
 * 0以外の値のときは従来通りselect()で全選択を試みる。
 */
export function clearZeroOrSelect(el: HTMLInputElement): void {
  if (el.value === '0') {
    el.value = '';
  } else {
    el.select();
  }
}
