// cccc（moznion/cccc）で関数ごとの複雑度を測り，cccc.toml の上限を超えたら失敗させる．
// cccc は構文解析に失敗しても終了コード 0 を返すため，件数をここで検査する．
// 検査が空振りしていないことをログで確かめられるよう，対象の一覧を先に出す．
import { spawnSync } from "node:child_process";

const CCCC_BIN = process.env.CCCC_BIN || "cccc";
const TARGET_DIRS = ["src", "scripts"];
const EXIT_USAGE_ERROR = 2;

function runCccc(extraArgs) {
  const result = spawnSync(CCCC_BIN, [...TARGET_DIRS, ...extraArgs], {
    encoding: "utf8",
  });
  if (result.error) {
    throw new Error(`cccc を起動できません（${CCCC_BIN}）: ${result.error.message}`);
  }
  if (result.status === EXIT_USAGE_ERROR) {
    throw new Error(`cccc が設定か引数の誤りで止まりました:\n${result.stderr}`);
  }
  return result;
}

function printTargets(report) {
  const { file_count, function_count } = report.summary;
  console.log(`targets (cccc): ${file_count} files, ${function_count} functions`);
  for (const file of report.files) {
    console.log(`  ${file.path}`);
  }
}

function main() {
  const inventory = runCccc(["--format", "json", "--no-cache"]);
  const report = JSON.parse(inventory.stdout);
  printTargets(report);

  const parseErrors = report.summary.parse_error_count;
  if (parseErrors > 0) {
    console.error(`構文解析に失敗したファイルが ${parseErrors} 件あります．`);
    return 1;
  }

  const gate = runCccc(["--format", "simple", "--violations", "--no-cache"]);
  process.stdout.write(gate.stdout);
  process.stderr.write(gate.stderr);
  // シグナルで止まると status は null になる．成功と取り違えないよう失敗として扱う．
  const status = gate.status ?? 1;
  console.log(status === 0 ? "complexity: 上限内" : "complexity: 上限超過");
  return status;
}

process.exitCode = main();
