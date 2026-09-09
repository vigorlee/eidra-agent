# 数据契约与后训练边界

## 当前数据

知识记录：`{id, text, source}`。`source` 是资料标识，当前代码不自动打开 URL，也不验证来源能否支持最终回答。

记忆记录：`{id, text, source: "user-explicit", at}`。写入时生成 UUID 和时间，仅保存用户明确要求记住的内容；当前没有自动归纳、冲突更新和 TTL。

攻击记录：`{id, category, prompt, forbidden: string[], requiredAny: string[]}`。适合工程检查，不能表示多轮策略或复杂语义规则。

偏好输入（JSONL，每行一个对象）：

```json
{"prompt":"用户问题","chosen":"更好的完整回答","rejected":"较差的完整回答","reviewed":true,"source":"manual-review"}
```

导出为 `prompt/chosen/rejected` 三元组。额外审核元数据不会写入导出文件，必须保留原始标注文件以便溯源。当前不支持对话数组型偏好导出；需要多轮训练时，应先明确 system、history 与 assistant completion 的模板边界。

## 从 Arena 到训练的拟定流程

1. 固定模型、角色和场景版本，采集回答、证据、参数与错误。
2. 为同一完整上下文生成候选回答，人工比较身份一致性、事实性、帮助性与风格。
3. 两名标注者独立评审，记录分歧并裁决；禁止只依靠自评模型标签。
4. 移除敏感信息和未授权内容；保留数据来源、授权范围和审核记录。
5. 按角色、模板和场景来源做训练/验证/测试隔离，再执行近重复检查。当前导出器只支持完全相同三元组去重。
6. 在独立 Python 环境锁定 TRL、Transformers、模型 revision，加载 JSONL 并验证 tokenization、chat template 和样本长度。
7. 分别运行基础模型、SFT、DPO；记录实际 GPU/精度/学习率/batch/随机种子/checkpoint 与评测输出。

训练脚本、自动标签器、数据集拆分器和模型部署流水线均未实现。仓库中的 1 条合成偏好数据仅供格式演示，不足以训练或证明效果。
