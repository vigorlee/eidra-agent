# 开源调研与复用记录

核对日期：2026-09-09。方法：GitHub repository search、官方仓库 README、GitHub REST 仓库元数据和默认分支 commit。未以 star 数作为选型结论，没有复制上游源码。

## 检索路径

检索主题包括 `role playing llm`、LangGraph agent、CAMEL role playing、TRL DPO、vLLM serving 和 PettingZoo。GitHub 的角色扮演检索还返回了 [ToMATO](https://github.com/nttmdlab-nlp/ToMATO) 等专门研究项目；当前不引入这些评测集，其数据许可和适用性需另行审核。

## 核验快照

| 仓库 | 许可证元数据 | 默认分支 commit（调研时） |
|---|---|---|
| [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | MIT | `3299a1f563fd90351230822682650401db78c566` |
| [camel-ai/camel](https://github.com/camel-ai/camel) | Apache-2.0 | `8c791b7b9cf7deab56cb5a92818c34499af9097f` |
| [huggingface/trl](https://github.com/huggingface/trl) | Apache-2.0 | `de8fdf157b3682699b590bbab9a10c0bbdfa2a88` |
| [vllm-project/vllm](https://github.com/vllm-project/vllm) | Apache-2.0 | `385dce36bcee42309924a5ece951a96db3dce7f2` |
| [Farama-Foundation/PettingZoo](https://github.com/Farama-Foundation/PettingZoo) | MIT | `a865c24671b269e4091ee16069901cfa6e88efc5` |

commit 记录用于回溯调研，不代表当前代码依赖这些版本。以该 commit 对应的 LICENSE 文件为正式许可依据；迁入源码或分发依赖前需检查完整许可与 NOTICE。

## 组合决策

1. 先固定角色、记忆、证据与评测报告的数据形状，再引入复杂运行框架。
2. LangGraph 用于后续运行编排；CAMEL 用于攻击场景生成，避免两个框架同时承担完整主循环。
3. TRL 在独立 Python 训练环境运行。当前仅导出文本偏好三元组，不能声称已兼容所有 TRL 版本及训练模板。
4. vLLM 是可替换的服务端选择；客户端已有通用接口适配，服务端尚未部署联调。
5. PettingZoo 只在需要正式多智能体博弈环境时引入。静态提示攻击不等同于博弈学习。

## 可复核的一手资料

- [LangGraph README](https://github.com/langchain-ai/langgraph#readme)：框架能力及入门。
- [CAMEL README](https://github.com/camel-ai/camel#readme)：角色代理、工具和多代理场景。
- [TRL DPO 文档源码](https://github.com/huggingface/trl/blob/main/docs/source/dpo_trainer.md)：偏好学习接口与训练说明。
- [vLLM README](https://github.com/vllm-project/vllm#readme)：推理服务能力。
- [PettingZoo README](https://github.com/Farama-Foundation/PettingZoo#readme)：多智能体环境 API；官方不承诺 Windows 支持，后续训练/环境服务优先在 Linux 验证。
