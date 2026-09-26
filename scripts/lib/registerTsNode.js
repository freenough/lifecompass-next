/**
 * scripts/lib/registerTsNode.js
 * 検証スクリプト・数値算出スクリプト共通の ts-node 登録処理。docs/fixes の fix_verify_ts_node_register_once.md。
 *
 * ts-node は register() を呼ぶたびに前の .ts 読み込みフックを包むため、full-verify.js のように複数の
 * スクリプトを同じプロセスで require すると、後から読み込む .ts ファイルほど何重にもコンパイルされ、
 * その結果が各層のキャッシュに残り続ける（登録24回で約4.6GB。investigation_full_verify_memory.md）。
 * ここでは ts-node が登録時に残す process[Symbol.for('ts-node.register.instance')] を見て、
 * 未登録のときだけ登録する。各スクリプトを単独で実行した場合も、これまでどおり1回登録される。
 *
 * TypeScript を読み込むスクリプトは、ts-node を直接登録せず require('./lib/registerTsNode') を使うこと
 * （scripts/verify-ts-node-register.js がチェックする）。
 */

const path = require('path');

const REGISTER_INSTANCE = Symbol.for('ts-node.register.instance');

if (!process[REGISTER_INSTANCE]) {
  require('ts-node').register({
    project: path.join(__dirname, '..', '..', 'tsconfig.json'),
    transpileOnly: true,
  });
}
