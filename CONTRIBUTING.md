# Contributing

感谢你愿意改进弗一把 Player Solver。

## 开始之前

- Issue 和 Pull Request 应聚焦本地人工筛选与反馈推演，不加入自动操作原游戏、账号系统或常驻爬虫。
- 规则变更必须给出 `csgofriberg` 对应源码或测试证据。
- 不要提交来源不明的选手数据；数据变更必须同步更新 `data/metadata.json` 并附带 diff。
- 不要根据常识补写 `team_history`。没有可验证来源时应保持为空。

## 本地检查

```bash
npm install
npm run lint
npm test
npm run build
npm run data:validate
npm run data:diff
```

Pull Request 请说明变更目的、用户影响、验证命令，以及数据或规则来源（如适用）。
