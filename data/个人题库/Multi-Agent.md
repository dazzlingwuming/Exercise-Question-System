--- question ---

question_id: Q1
module: Agent 基础与架构
type: single_choice
difficulty: 2
knowledge_points:
  - 编排模式
  - 集中式协作

stem: |
  在集中式（Orchestrator）模式的多智能体系统中，下列哪项描述是正确的？

options:
  A: 单个主管智能体负责将任务分解并分发给其他工人智能体。
  B: 没有中央控制点，每个智能体自主选择子任务执行。
  C: 集中式模式天然支持大规模并行任务执行。
  D: 所有智能体都共享同一个对话状态且同时执行。

answer:
  - A

option_analysis:
  A: 正确。集中式模式中一个主管智能体（Orchestrator）负责总体控制，分解任务并分发给工作智能体。
  B: 错误。没有中央控制点的描述适用于去中心化模式，而非集中式模式。
  C: 错误。集中式模式下任务串行分配，扩展性有限，并非天然支持大规模并行。
  D: 错误。集中式模式通常由一个主管协调，不是所有智能体同时并行操作，也不共享相同状态。

interview_followups:
  - 在实际系统中，当主管智能体故障时，如何设计故障切换（Failover）机制？
  - 如果任务分配非常复杂且需要多级拆解，集中式模式如何改进以适应？

--- question ---

question_id: Q2
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:
  - 交接模式
  - 状态管理
  - 工作流

stem: |
  在多智能体的 Handoffs 模式中，下列哪项描述是正确的？

options:
  A: 智能体根据对话状态顺序切换，下一个活跃智能体由共享状态决定。
  B: 所有智能体同时工作，不涉及状态转换。
  C: Handoffs 模式保证并行调用多个子智能体。
  D: Handoffs 模式不需要维护对话状态。

answer:
  - A

option_analysis:
  A: 正确。在 Handoffs 模式中，智能体通过调用“交接”工具更新对话状态，根据状态动态切换下一个活跃智能体。
  B: 错误。选项描述对应并行路由模式，Handoffs 是序列模式，不是所有智能体同时执行。
  C: 错误。Handoffs 是序列执行，不支持同时并行调用多个智能体。
  D: 错误。Handoffs 模式需要维护对话状态以决定下一个活跃智能体。

interview_followups:
  - 在 Handoffs 模式中如果某个环节发生错误导致状态丢失，你会如何处理后续流程？
  - 如果需要让多个 Handoffs 智能体同时处理子任务，有哪些策略可行？

--- question ---

question_id: Q3
module: Agent 基础与架构
type: single_choice
difficulty: 2
knowledge_points:
  - 路由模式
  - 并行处理
  - 多智能体

stem: |
  路由器（Router）模式在多智能体系统中的核心特点是什么？

options:
  A: 并行调用多个子智能体并综合它们的结果。
  B: 由一个主智能体串行调用其他专用智能体。
  C: 智能体根据对话状态动态切换活跃角色。
  D: 智能体按需加载不同的技能包。

answer:
  - A

option_analysis:
  A: 正确。路由模式会将输入查询分解为多个并发子任务，调用多个专用智能体并行执行，然后汇总它们的结果。
  B: 错误。该描述对应集中式(Subagents)模式，而不是路由器模式。
  C: 错误。该描述对应 Handoffs 模式，路由器模式不依赖对话状态切换。
  D: 错误。该描述对应 Skills 模式，路由器模式是并行路由，并非按需加载技能。

interview_followups:
  - 在路由模式中，如果某个并行调用的智能体异常失败，你如何保证最终结果的健壮性？
  - 如何设计结果汇总逻辑以兼顾并行效率和准确性？

--- question ---

question_id: Q4
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:
  - 协议
  - 工具调用
  - 通信

stem: |
  在多智能体系统中，模型上下文协议（Model Context Protocol, MCP）的主要作用是什么？

options:
  A: 规范智能体与工具或外部数据源之间的上下文传递和访问方式。
  B: 用于智能体之间的点对点消息交换。
  C: 解决多智能体系统中的身份认证问题。
  D: 用于智能体与用户的自然语言对话。

answer:
  - A

option_analysis:
  A: 正确。MCP 协议由 Anthropic 提出，用于标准化智能体如何连接和传递上下文给工具或外部数据源。
  B: 错误。智能体间点对点通信通常使用 A2A 协议，而非 MCP。
  C: 错误。身份认证和发现由类似 Agent Network Protocol (ANP) 处理，不是 MCP。
  D: 错误。MCP 与用户对话无关，主要关注模型与工具的数据交互。

interview_followups:
  - 如果一个多智能体系统需要同时使用 MCP 和 A2A，这两者应如何协同工作？
  - 在 M​​CP 协议中，如何定义安全访问工具的权限或令牌？

--- question ---

question_id: Q5
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:
  - 协议
  - 去中心化
  - 发现机制

stem: |
  智能体网络协议（Agent Network Protocol, ANP）主要用于解决什么问题？

options:
  A: 在去中心化环境中实现智能体的发现和连接。
  B: 在多智能体系统中进行工具调用的标准化。
  C: 定义智能体间的对等通信格式。
  D: 管理智能体的访问信任和认证。

answer:
  - A

option_analysis:
  A: 正确。ANP 协议的目标是在开放互联网环境中，实现去中心化的智能体发现和安全通信。
  B: 错误。工具调用标准化通常由 MCP 协议完成，与 ANP 不符。
  C: 错误。智能体间对等通信格式通常由 A2A 协议定义，而不是 ANP。
  D: 错误。ANP 关注去中心化发现，安全信任更依赖于 DID 等机制。

interview_followups:
  - 如果在有中心化注册表的环境中使用 ANP，会有哪些冗余或冲突？
  - ANP 使用去中心化标识符 (DID) 作为身份机制，这与传统 OAuth 有何区别？

--- question ---

question_id: Q6
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:
  - 去中心化
  - 故障容错

stem: |
  关于去中心化（Decentralized）多智能体系统，以下哪个描述是正确的？

options:
  A: 无需中央控制，每个智能体自治协作。
  B: 由单个中央智能体负责分配任务。
  C: 只能用于小规模任务，不适合并行处理。
  D: 在去中心化模式下，智能体不需要通信。

answer:
  - A

option_analysis:
  A: 正确。去中心化模式下没有中央控制节点，智能体通过点对点通信自主协作完成任务。
  B: 错误。该描述对应集中式模式，不符合去中心化模式。
  C: 错误。去中心化模式通常用于大规模任务和高并发场景，恰恰便于扩展。
  D: 错误。去中心化模式需要智能体之间通信来协调任务，只是没有中心节点。

interview_followups:
  - 在去中心化系统中，如果一个智能体出现故障，如何保证其它智能体继续工作？
  - 去中心化模式下的网络延迟和一致性挑战有哪些常用解决方法？

--- question ---

question_id: Q7
module: Agent 基础与架构
type: multiple_choice
difficulty: 2
knowledge_points:
  - 去中心化
  - 容错
  - 通信

stem: |
  以下关于去中心化（Decentralized）多智能体系统的优点，哪些是正确的？（可多选）

options:
  A: 去除单点故障，提高系统容错性。
  B: 允许智能体直接点对点通信。
  C: 简化了全局协调的复杂性。
  D: 适合处理高隐私、安全隔离任务。

answer:
  - A
  - B
  - D

option_analysis:
  A: 正确。去中心化系统没有单点控制，提高了容错能力。
  B: 正确。智能体可以直接通过 A2A 协议进行点对点通信。
  C: 错误。去中心化需要更多通信协议和协调机制，协调复杂性增加。
  D: 正确。在去中心化架构中，智能体可以在不同信任域内协作，更容易实现隐私隔离。

interview_followups:
  - 设计去中心化系统时，如何防止网络分区导致系统不可用？
  - 在这种系统中，如果需要全局视图来做决策，应如何设计通信机制？

--- question ---

question_id: Q8
module: Agent 基础与架构
type: multiple_choice
difficulty: 2
knowledge_points:
  - 任务协作
  - 冲突解决
  - 资源分配

stem: |
  多智能体协作通常包括以下哪些关键步骤？（可多选）

options:
  A: 任务分解（将复杂任务拆分为子任务）。
  B: 资源分配（将资源或任务分配给不同智能体）。
  C: 冲突解决（智能体之间解决资源或目标冲突）。
  D: 独立单个智能体重复执行单一任务。

answer:
  - A
  - B
  - C

option_analysis:
  A: 正确。多智能体协作首先需要将复杂任务分解为可管理的子任务。
  B: 正确。分配资源或子任务给相应的智能体是协作的重要环节。
  C: 正确。当多个智能体存在资源竞争或目标冲突时，需要协调机制进行解决。
  D: 错误。该描述不涉及协作，且与协作特点相悖。

interview_followups:
  - 任务分解中如何确保生成的子任务之间的依赖关系得到满足？
  - 当智能体产生冲突时，可以采用哪些常见的协商或仲裁方法？

--- question ---

question_id: Q9
module: Agent 基础与架构
type: multiple_choice
difficulty: 3
knowledge_points:
  - 容错
  - 状态持久化
  - 可靠性

stem: |
  为了提高多智能体系统的鲁棒性（可用性和可靠性），以下哪些做法是合适的？（可多选）

options:
  A: 在通信中实现重试机制，以防网络瞬断。
  B: 使用持久化存储记录关键中间状态。
  C: 完全忽略错误，假设智能体总能正确响应。
  D: 采用动态调整拓扑结构以适应变化。

answer:
  - A
  - B
  - D

option_analysis:
  A: 正确。添加消息重试可在网络故障时重新发送请求，提高可靠性。
  B: 正确。持久化关键状态允许在故障恢复后继续执行，提升可用性。
  C: 错误。忽略错误会导致系统不稳定，显然不可取。
  D: 正确。动态调整智能体拓扑（如主备切换、负载均衡）有助于处理变化场景。

interview_followups:
  - 如果持久化存储遇到瓶颈，该如何保证状态写入既可靠又高效？
  - 网络重试机制如何设计超时时间以防止无效的重试循环？

--- question ---

question_id: Q10
module: Agent 基础与架构
type: multiple_choice
difficulty: 3
knowledge_points:
  - 协议
  - A2A
  - MCP

stem: |
  在多智能体系统中，以下关于 A2A 协议和 MCP 协议的区别，哪些说法正确？（可多选）

options:
  A: A2A 用于智能体之间的通信，支持点对点模型。
  B: MCP 用于智能体与工具或服务间的上下文传递，基于客户端-服务器模型。
  C: A2A 只用于中心化模式，不适合去中心化发现。
  D: MCP 由 Anthropic 发布，用于标准化外部工具访问。

answer:
  - A
  - B
  - D

option_analysis:
  A: 正确。A2A 协议用于智能体对智能体的通信，采用点对点模型。
  B: 正确。MCP 用于智能体调用工具或访问数据，通常作为客户端-服务器模式实现。
  C: 错误。A2A 适用于多种拓扑，包括去中心化对等通信。
  D: 正确。MCP 由 Anthropic 发布，旨在标准化模型与外部工具的接口。

interview_followups:
  - 如果需要在一个工作流中同时使用 A2A 和 MCP，应如何在框架层面协调这两种协议？
  - 未来如果将这三种协议合并，应优先关注哪些一致性或兼容性问题？

--- question ---

question_id: Q11
module: Agent 基础与架构
type: multiple_choice
difficulty: 4
knowledge_points:
  - LangGraph
  - CrewAI
  - 框架对比

stem: |
  关于 LangGraph 框架和 CrewAI 框架，以下哪些描述是正确的？（可多选）

options:
  A: LangGraph 使用有状态的图结构来管理复杂工作流。
  B: CrewAI 采用角色扮演(team)的团队协作结构。
  C: LangGraph 更强调极低的运行时开销，而忽略复杂协调。
  D: CrewAI 内置统一的内存接口，支持多种记忆管理。

answer:
  - A
  - B
  - D

option_analysis:
  A: 正确。LangGraph 通过有状态的图（stateful graph）来定义和管理多智能体工作流。
  B: 正确。CrewAI 采用角色扮演团队（role-based crew）的设计理念，将智能体按角色分工合作。
  C: 错误。极低运行时开销是 OpenAI Agents SDK 的特性，与 LangGraph 不符。
  D: 正确。CrewAI 提供统一的记忆接口，集成短期、长期等记忆管理机制。

interview_followups:
  - 在 LangGraph 中如何对节点状态进行检查点管理（checkpoint）和恢复？
  - 如果需要多智能体共享用户信息，LangGraph 和 CrewAI 各有哪些设计可以支持？

--- question ---

question_id: Q12
module: Agent 基础与架构
type: multiple_choice
difficulty: 4
knowledge_points:
  - 上下文管理
  - 并行执行
  - 对话状态

stem: |
  在多智能体对话系统中，以下哪些策略有助于减少上下文长度带来的负担？（可多选）

options:
  A: 使用分层角色或管道结构，分步管理上下文。
  B: 采用并行路由模式而非完全串行的 Handoffs。
  C: 在适当时机对对话历史进行摘要或压缩。
  D: 让所有智能体共享完整的上下文历史。

answer:
  - A
  - B
  - C

option_analysis:
  A: 正确。分层角色和分阶段处理可以使每个智能体只关注部分上下文。
  B: 正确。并行路由模式可以同时执行子任务，避免单一线程累积所有对话上下文。
  C: 正确。对过长的上下文进行摘要、压缩或丢弃不必要的信息可以显著减小长度。
  D: 错误。共享所有上下文容易造成信息冗余和上下文窗口溢出。

interview_followups:
  - 上述策略在实际场景下如何平衡上下文完整性与效率？
  - 如果采用分层结构，怎样设计角色层次才能最大化上下文重用？

--- question ---

question_id: Q13
module: Agent 基础与架构
type: true_false
difficulty: 2
knowledge_points:
  - 去中心化
  - 通信协议

stem: |
  去中心化模式无需中央节点控制，每个智能体可以自主协作。

options:
  A: 正确
  B: 错误

answer:
  - A

option_analysis:
  A: 正确。去中心化模式没有中央控制器，智能体通过点对点通信自主协作。
  B: 错误。此描述符合去中心化模式，故判断为正确。

interview_followups:
  - 在这种模式下，如果需要实现全局一致性，应如何设计共识机制？
  - 去中心化系统中增加哪些冗余可以保证更高的可靠性？

--- question ---

question_id: Q14
module: Agent 基础与架构
type: true_false
difficulty: 2
knowledge_points:
  - 交接模式
  - 状态管理

stem: |
  在 Handoffs 模式中，智能体会基于对话状态顺序切换，系统必须维护并传递对话状态信息。

options:
  A: 正确
  B: 错误

answer:
  - A

option_analysis:
  A: 正确。Handoffs 模式需要维护对话状态来决定下一个激活的智能体。
  B: 错误。正确的描述应是系统需要维护状态，所以选择正确。

interview_followups:
  - 如果状态同步出现延迟，可能导致什么后果，该如何解决？
  - Handoffs 模式下，状态存储可以使用哪些技术来保证一致性？

--- question ---

question_id: Q15
module: Agent 基础与架构
type: true_false
difficulty: 3
knowledge_points:
  - 集中式
  - 动态模式

stem: |
  集中式模式适用于任务结构未知或需要动态调整的情况。

options:
  A: 正确
  B: 错误

answer:
  - B

option_analysis:
  A: 错误。集中式模式要求任务结构已知且固定；若结构未知，应考虑动态或去中心化模式。
  B: 正确。对于任务结构未知或需要在运行时调整时，集中式模式不合适，应选择动态或层次模式。

interview_followups:
  - 如果在集中式架构中期望动态调整任务流，应增加哪些机制？
  - 任务结构未知时，多智能体框架如何自适应选择合适的协作模式？

--- question ---

question_id: Q16
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - 编排模式
  - 交接与指挥
  - 状态转移

stem: |
  比较多智能体系统中的 Handoffs 模式和 Orchestrator（指挥）模式的异同。

reference_answer: |
  **相同点：** 两种模式都是多智能体协作形式，用于将复杂任务分解为多个子任务并由不同智能体完成。二者均需要智能体之间的交互和协调。
  **不同点：** 
  - **Orchestrator（集中式）模式：** 由一个主管智能体（指挥者）负责整个工作流。主管智能体接收任务，将其拆分后并行或串行分配给各个专门的子智能体，并最终收集结果。该模式的特点是集中控制、易于审计和管理，但存在单点瓶颈和扩展性限制。
  - **Handoffs 模式：** 智能体根据对话或状态顺序相继激活，每个智能体完成一阶段任务后调用“交接”机制，将控制权和当前状态传递给下一个智能体。此模式特点是工作流以链式接力形式运行，能够进行多轮多阶段交互，但需要维护和传递状态信息，对状态管理要求较高。此模式下不需要单一指挥者，而是通过状态驱动过程进行串行协调。
  **应用场景：** Orchestrator 适用于任务结构预先已知、需要集中监控和审计的场景；Handoffs 适用于多轮交互式问答、逐步获取信息等需要串行预条件的场景。

answer_keywords:
  - Orchestrator
  - Handoffs
  - 有状态图
  - 传递状态

scoring_points:
  - 明确描述 Orchestrator 模式：单个主管智能体控制流程，分配子任务并收集结果，集中控制。
  - 明确描述 Handoffs 模式：智能体链式接力，逐步转换，维护对话状态传递给下一个智能体。
  - 对比两种模式的工作流特点：并行 vs 串行、状态管理需求、单点 vs 分散控制等。
  - 举例合适的应用场景或使用场合来说明区别。

interview_followups:
  - 如果要在 Orchestrator 模式中实现部分并行，设计上要考虑哪些问题？
  - 对于需要保留整个历史状态以供审计的需求，这两种模式各有什么优势或难点？

--- question ---

question_id: Q17
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - 协调拓扑
  - 中央集中
  - 分布式

stem: |
  比较集中式（Centralized）和去中心式（Decentralized）多智能体协调拓扑的异同。

reference_answer: |
  **集中式模式：** 有一个中央控制者或主管智能体（Supervisior）负责分解任务并分配给其他子智能体。此模式的特点是控制流程集中、易于追踪和审计。当任务结构已知且较稳定时，集中式模式能够简化设计，但它存在单点瓶颈，扩展性有限，且主管节点故障时系统可能中断。  
  **去中心式模式：** 没有中央控制节点，智能体相互对等通信、自主决策。优点是更高的容错性和可扩展性，因为不存在单点故障；适用于任务结构不确定或需要开放探索的场景。但是由于缺少全局视角，实现全局协同和一致性更困难，需要复杂的协议来协调和避免冲突。  
  **对比：** 集中式强调控制和可管理性，适合审计敏感、流程清晰的应用；去中心式强调冗余和灵活性，适合大规模、动态环境。选择时需要权衡任务结构、智能体数量和容错需求等因素。

answer_keywords:
  - 中央控制
  - 自主协作
  - 扩展性
  - 故障冗余

scoring_points:
  - 描述集中式模式特点：中央主管控制、任务分发、易审计、单点瓶颈。
  - 描述去中心式模式特点：无中央控制、点对点协作、冗余容错、高扩展。
  - 比较场景：集中式适合已知流程，去中心式适合不确定或大规模场景。
  - 提及各自缺点：集中式难扩展、去中心式协调难。

interview_followups:
  - 在大规模系统中，是否可以混合使用集中式与去中心式拓扑？请举例说明。
  - 去中心式系统中，如何处理数据一致性和冲突解决问题？

--- question ---

question_id: Q18
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - A2A协议
  - MCP协议
  - 通信层

stem: |
  比较 A2A（Agent-to-Agent）协议和 MCP（Model Context Protocol）协议在多智能体系统中的作用和特点。

reference_answer: |
  **A2A 协议：** 主要用于智能体与智能体之间的通信。它定义了代理间的对等交互方式，包括消息格式、握手流程和任务生命周期管理。A2A 支持点对点(P2P)通信模型，允许智能体直接互发请求、响应或中介信息。常见用途是在分布式团队中实现智能体发现和任务委托。  
  **MCP 协议：** 主要用于智能体与工具或外部系统之间的上下文传递和工具调用。由 Anthropic 发布，它规范了模型如何连接数据库、知识库或工具，并且通常采用客户端-服务器模型。MCP 关注将问题上下文传递给工具，以及工具结果返回给智能体。  
  **对比：** A2A 专注于智能体内部协作，适合内部状态和工作流的传递；MCP 专注于与外部资源交互，适合检索知识或执行工具操作。A2A 更加注重任务协调和发现机制，MCP 更侧重于连接外部计算和数据源。

answer_keywords:
  - 智能体间通信
  - 工具调用
  - 客户端服务器

scoring_points:
  - 解释 A2A 协议：用途、通信模型、适用场景。
  - 解释 MCP 协议：用途、上下文传递、适用场景。
  - 对比二者：一个是 Agent 间对等通信，另一个是 Agent 与工具/服务通信。
  - 举例说明何时用哪个协议，如查询数据库、与其他 Agent 协作等。

interview_followups:
  - 如果需要在一个流程中同时使用多种协议，框架应该如何支持它们的集成？
  - 未来协议融合时，A2A 和 MCP 的功能如何互补？

--- question ---

question_id: Q19
module: Agent 基础与架构
type: concept_compare
difficulty: 5
knowledge_points:
  - LangGraph
  - CrewAI
  - 状态管理

stem: |
  对比 LangGraph 框架和 CrewAI 框架在多智能体协作中的设计理念和应用场景。

reference_answer: |
  **LangGraph：** LangGraph 由 LangChain 开发，是一个面向可靠性的多智能体编排框架。它使用**有状态图（stateful graph）**作为核心抽象，将智能体和工具调用表示为节点和边，支持复杂工作流的可视化与调试。LangGraph 强调严格的状态管理，可进行检查点式的状态恢复，适合需要精细控制和调试的场景。典型应用场景是复杂业务流程自动化，需要透明的流程监控和高稳定性的系统。  
  **CrewAI：** CrewAI 是一个角色驱动（role-based）的多智能体平台。它使用**角色扮演的团队（role-playing crew）**概念，将任务委派给不同角色的智能体组成的“团队”。CrewAI 提供统一的记忆和对话管理接口，强调简化开发人员操作，用更自然的方式让智能体协作。它适用于需要快速迭代且对过程灵活度要求较高的场景，例如创意生成、市场分析等。CrewAI 偏向于轻量级的多轮交互，不像 LangGraph 那样强调工作流精确控制。  
  **对比：** LangGraph 更关注工作流结构和状态可追溯性，便于复杂任务的调试和优化；CrewAI 更关注易用性和灵活性，通过角色分工降低上手难度。LangGraph 更适合高可靠性、可监控的生产环境；CrewAI 更适合需要快速原型和角色分工的协作场景。

answer_keywords:
  - 有状态图
  - 角色扮演团队
  - 状态恢复
  - 统一记忆

scoring_points:
  - 描述 LangGraph 的状态图概念、工作流控制、检查点恢复能力。
  - 描述 CrewAI 的角色扮演理念、统一记忆接口、多轮交互特点。
  - 对比设计哲学：LangGraph 强调可控与调试，CrewAI 强调易用和灵活。
  - 提及典型应用场景差异：复杂流程 vs 快速开发、市场/创意任务等。

interview_followups:
  - 如果团队需要多智能体系统的端到端审计能力，你会推荐使用哪种框架？为什么？
  - 在这两种框架中，如何处理智能体之间的失败恢复和异常管理？

--- question ---

question_id: Q20
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - 路由模式
  - 交接模式
  - 并行 vs 串行

stem: |
  比较路由（Router）模式和 Handoffs 模式在多智能体系统中的特点和适用场景。

reference_answer: |
  **Router（路由）模式：** 路由器将输入查询拆分为多个并行子任务，分类并并行调用多个专门的智能体，然后将它们的结果合并为最终输出。该模式特点是**无状态**、**并行执行**、低延迟，可同时访问多领域知识。适用于需要并行检索或综合多源信息的场景，如同时查询多个知识库并合并答案。  
  **Handoffs 模式：** 该模式以**有状态、序列化**的方式处理对话，每个智能体基于当前状态激活并执行任务后，将状态传递给下一个智能体。其特点是能够进行**分阶段交互**、处理多轮对话，并在每一步解锁新的能力。适用于需要依赖之前结果逐步推进的流程，如客户支持机器人收集信息各环节的需求。  
  **对比：** 路由模式强调并行与无状态，适合多个领域同时查询；Handoffs 模式强调有序和连续状态传递，适合多阶段任务和依赖流程。路由模式可以提高单次查询效率，但缺乏长期上下文；Handoffs 模式需要维护对话上下文，但便于用户逐步交互和条件分支。

answer_keywords:
  - 并行调用
  - 序列执行
  - 无状态
  - 有状态

scoring_points:
  - 描述路由模式：并行调用、多智能体组合结果、无状态处理。
  - 描述 Handoffs 模式：状态驱动、串行多轮、顺序传递控制。
  - 对比适用场景：路由适合并行多源任务，Handoffs 适合多阶段依赖任务。
  - 讨论优缺点：并行 vs 顺序、上下文管理、系统复杂度等。

interview_followups:
  - 在并行路由过程中，如果子智能体返回冲突的结果，如何处理冲突合并？
  - 如果需要在路由模式中保留对话上下文，有哪些折衷方案？

--- question ---

question_id: Q21
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:
  - 状态管理
  - 故障排查
  - 交接问题

stem: |
  在一个使用 Handoffs 模式的客户支持聊天机器人中，每个智能体负责对话的一个阶段。当用户完成第一阶段信息收集后，应由第二个智能体继续处理，但第二个智能体并未接收到控制权，任务被挂起。请分析可能的原因，并提出定位问题的步骤及解决方案。

reference_answer: |
  首先诊断问题：检查第一个智能体的输出是否正确触发了 Handoffs 工具或状态更新；验证共享状态或对话上下文是否被正确传递给下一个智能体。排查时可以查看日志，确认状态变量中下一个激活智能体的标识是否正确、网络通信是否成功，以及第二个智能体是否已注册并在线。  
  可能原因包括：第一个智能体未调用或错误地调用了交接工具，导致状态未更新；通信协议配置错误，第二个智能体未收到消息；或状态数据在传递过程中丢失/被覆盖。  
  优化方案：确保每个 Handoffs 操作后对话状态正确更新并持久化，可加入状态检查点；增加对工具调用返回值的校验，必要时重试；提高通信可靠性，如添加消息确认或使用可靠队列；以及在状态管理中引入超时保护，比如长时间无响应时重启流程或切换路径。

answer_keywords:
  - 状态未更新
  - 日志分析
  - 通信故障
  - 重试机制

scoring_points:
  - 明确诊断步骤：检查第一个智能体的交接调用和输出状态、查看日志、确认状态是否正确传递。
  - 可能原因：智能体未调用交接接口、状态丢失、通信故障、注册问题等。
  - 优化方案：增加状态持久化、重试机制、超时处理、消息确认机制等。
  - 强调问题定位过程，体现逐步排查和验证的思路。

interview_followups:
  - 如果后续还需要增加第三个智能体接入，Handoffs 方案如何扩展？
  - 如何在生产环境中监控和告警此类 Handoffs 流程的中断？

diagnosis_steps:
  - 检查第一个智能体调用交接工具的日志或输出，确认是否执行到调用命令。
  - 验证对话状态中下一个激活智能体的标识是否正确写入并传递。
  - 确认第二个智能体是否正常启动、已注册并可以接收任务。
  - 检查网络通信或消息队列，确保状态消息未丢失。

optimization_points:
  - 在 Handoffs 操作后保存状态检查点，并在需要时恢复或重试。
  - 增加调用成功返回校验和异常处理逻辑，出现错误时记录并重试或回退。
  - 考虑使用可靠消息队列或确认机制，确保状态消息被传递。
  - 对长时间没有接收到状态的情况增加超时保护和告警机制。

--- question ---

question_id: Q22
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:
  - 集中式模式
  - 任务超时
  - 日志分析

stem: |
  某多智能体系统采用集中式 Supervisor 模式，由一个主管智能体调度其他工人智能体执行任务。最近发现执行流程总是在某一节点超时失败，导致后续任务无法完成。请提出排查故障的思路和可能的优化方案。

reference_answer: |
  排查思路：首先查看主管和各工人智能体的日志，确定超时发生在哪个环节，是主管分配任务超时还是工人处理任务耗时过久。检查该节点所负责的子任务是否特别复杂或依赖资源。其次验证网络通信和负载均衡是否存在问题，例如任务集中到某一个工人导致阻塞。  
  可能优化：如果是单个工人瓶颈，可水平扩展更多同类型工人，并在主管层使用轮询或负载均衡策略；如果是子任务本身耗时过长，可尝试将任务进一步拆分或并行。引入异步处理机制，让主管不阻塞等待，或设置更合理的超时时间。同时增加监控，及时发现并自动调整流程。

answer_keywords:
  - 日志审查
  - 负载均衡
  - 异步执行
  - 任务分割

scoring_points:
  - 提及检查日志定位超时环节：是哪个智能体或任务耗时过久。
  - 考虑瓶颈原因：任务分配不均、某工人负载过大或任务本身复杂。
  - 优化方案：增加工人数目、负载均衡、异步执行、任务分拆、调整超时设置。
  - 突出实际排查步骤，如网络检查、资源监控。

interview_followups:
  - 如果任务是异构的，如何动态决定应该由哪个工人执行？
  - 当系统扩展到跨地域部署时，超时问题如何考虑网络延迟因素？

diagnosis_steps:
  - 查看主管智能体的调度日志，确认发送任务的频率和等待情况。
  - 查看超时发生时对应的工人智能体日志，确认它是否接收任务并尝试处理。
  - 分析该子任务的复杂度或数据量，确认是否因超载而耗时异常。
  - 检查网络或消息队列是否阻塞，导致任务延迟分发。
  
optimization_points:
  - 在主管层面引入轮询或负载均衡策略，避免所有任务集中到同一个工人。
  - 增加更多工人实例，水平扩展来分担任务。
  - 对大型任务进行拆分，或改用并行方式执行加速处理。
  - 采用异步非阻塞调用，主管不必同步等待任务完成，可先分发其他工作。

--- question ---

question_id: Q23
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:
  - 通信故障
  - A2A协议
  - 故障恢复

stem: |
  在一个去中心化的多智能体系统中，智能体之间通过 A2A 协议通信。最近出现部分智能体无法发现其他智能体并接收任务的情况，请你分析可能导致该问题的原因，以及如何定位和解决问题。

reference_answer: |
  可能原因：网络连通性问题（如防火墙、端口未开放）、智能体注册信息错误（Agent Card配置不当）、或 A2A 服务故障等。  
  定位步骤：首先检查网络层面的连通性，确认智能体间的网络地址和端口可达。然后查看智能体注册信息（如 Agent Card或发现机制配置）是否正确匹配。接着检查 A2A 协议的运行状态和日志，例如是否有握手失败或消息阻塞。通过在每个智能体上执行心跳或简单 ping 测试确定是否可达。  
  优化方案：确保部署有可靠的发现服务（如使用分布式注册或 DNS），并在通信中增加重试和备选路径。必要时引入消息队列缓冲并支持离线交互。对通信接口增加超时和错误监控，及时自动重连。保证 A2A 协议实现符合标准，防止因版本不兼容造成发现失败。

answer_keywords:
  - 网络连通
  - 注册信息
  - 发现服务
  - 重试机制

scoring_points:
  - 说明检查网络连接、端口、节点可达性的重要性。
  - 验证智能体注册和发现机制配置正确性，如 Agent Card、目录服务。
  - 检查 A2A 协议服务和日志，看握手、订阅等步骤是否成功。
  - 优化：使用稳定的注册/发现服务、消息重试、超时处理、断线重连等。

interview_followups:
  - 如何设计跨信任域的去中心化发现协议来保证智能体互联？
  - 如果发现一个智能体长时间离线，系统应如何容忍或替代它？

diagnosis_steps:
  - 检查网络设置，例如IP、端口、防火墙规则，确保智能体间可通信。
  - 查看每个智能体的发现注册信息（Agent Card或配置），确认名称和地址是否正确。
  - 检查 A2A 日志，看是否有订阅失败或握手超时的错误。
  - 在遇到问题的智能体上发送测试请求或Ping其他智能体，验证连接是否稳定。

optimization_points:
  - 部署可靠的服务注册或发现机制，保证智能体可以自动发现彼此。
  - 实现消息重试和缓冲队列，缓解临时网络故障影响。
  - 增加超时和心跳检测，及时重连断开的智能体。
  - 确保 A2A 协议实现与标准兼容，并更新到最新版本防止兼容性问题。

--- question ---

question_id: Q24
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:
  - 状态持久化
  - 容错设计

stem: |
  某多智能体系统运行中，一个负责存储部分全局状态的节点崩溃重启，导致系统丢失了某些中间状态。请说明如何定位问题，以及如何改进设计以避免此类问题。

reference_answer: |
  问题定位：首先确认节点崩溃时系统日志和监控记录，确定丢失的是哪些状态数据。检查是否使用了持久化存储（如数据库）或仅在内存中保存状态。通过审计日志对比崩溃前后的状态差异。  
  解决方案：改进状态管理，将关键中间状态持久化到可靠存储（数据库或持久性存储），并为关键步骤设置检查点。使用分布式事务或快照保证一致性。部署主备架构，故障时自动接管。引入幂等设计，使重试操作结果一致。结合消息队列或持久日志记录操作，以便在恢复时重放操作还原状态。

answer_keywords:
  - 持久化
  - 检查点
  - 主备架构
  - 幂等性

scoring_points:
  - 查阅日志/监控确定状态丢失范围和原因。
  - 识别使用内存存储导致丢失问题。
  - 提出持久化存储方案，如数据库或文件系统记录关键状态。
  - 引入检查点、主备冗余和幂等性保证失败恢复可靠。
  - 可提及分布式事务或快照技术防止一致性丢失。

interview_followups:
  - 在这种系统中，如何平衡持久化频率与性能开销？
  - 如果需要在线迁移或升级该节点，设计上有哪些考虑？

diagnosis_steps:
  - 查阅系统日志，确认崩溃前最后一次写入的状态和崩溃时刻。
  - 验证是否使用外部持久存储，如果没有，确定哪些数据仅存在内存。
  - 检查故障恢复日志或快照，判断是否有可用的恢复点。
  - 使用审计日志或事件日志对丢失的数据进行回放校对。

optimization_points:
  - 将关键状态写入持久存储，如关系型数据库或持久消息队列。
  - 定期创建检查点或快照，快速恢复时可从最近一致点加载。
  - 设计主备或集群模式，实现节点故障自动接管。
  - 保证操作的幂等性，使故障恢复后能够安全重试操作不引入错误。

--- question ---

question_id: Q25
module: Agent 基础与架构
type: system_design
difficulty: 5
knowledge_points:
  - 系统设计
  - 智能体编排
  - 故障恢复
  - 数据流

stem: |
  设计一个多智能体编排系统，用于自动处理复杂的业务工作流（例如文档检索、分析和报告生成）。请描述系统的核心组件、架构设计、数据流流程，并给出评估指标和潜在风险。

architecture_points:
  - Orchestrator主管模块：负责任务分解、调度、监控。
  - 专门子智能体：如检索智能体、分析智能体、撰写智能体等。
  - 任务队列和消息总线：用于智能体间通信与异步任务分发。
  - 内存/存储层：存储任务状态、结果和对话历史。
  - 日志与监控模块：实时监控工作流状态，记录操作日志。

data_flow:
  - 用户提交业务请求后，由 Orchestrator 接收并分解为子任务。
  - Orchestrator 将子任务发送到对应的专用智能体（如先触发检索智能体）。
  - 检索智能体执行后将结果返回到 Orchestrator 或下一个智能体。
  - 若有分析阶段，由分析智能体接收检索结果并生成中间报告。
  - 最终由撰写智能体或聚合智能体生成完整报告并回传给 Orchestrator。
  - Orchestrator 汇总最终结果并返回给用户，同时持久化结果和状态。

evaluation_metrics:
  - 吞吐量：单位时间内完成工作流的次数。
  - 延迟：从请求提交到完成报告所需时间。
  - 准确率：生成报告的质量评估（如人工评审、用户反馈）。
  - 资源利用率：计算资源、内存和网络使用情况。
  - 可用性：系统在故障时的可恢复性指标（MTTR）。

risk_points:
  - 单点故障：Orchestrator 可能成为瓶颈或故障点。应设置冗余或备份。
  - 状态不一致：分布式任务中状态同步困难，需使用事务或检查点机制。
  - 异常处理：某个智能体失败时需要错误恢复逻辑，否则可能导致工作流停滞。
  - 安全隐私：文档中可能包含敏感信息，需加密存储和传输。
  - 依赖外部服务：如知识库、API 不可用时需降级方案或缓存机制。

interview_followups:
  - 如果某一阶段的任务处理速度远低于其他阶段，该如何重新设计以平衡负载？
  - 在评估系统性能时，如何设计负载测试来覆盖关键路径？
  - 多智能体协作中，如何处理不同智能体之间可能的信任问题？

--- question ---

question_id: Q26
module: Agent 基础与架构
type: system_design
difficulty: 5
knowledge_points:
  - 系统设计
  - 交接流程
  - 多轮对话

stem: |
  设计一个支持多轮对话和任务移交的客户服务智能体系统。系统应包含能够收集用户信息、回答常见问题、以及必要时转交给人工客服的能力。请描述核心架构组件、数据流、评估指标和潜在风险。

architecture_points:
  - 会话管理模块：负责对话状态和上下文维护。
  - 多个子智能体：如信息收集智能体、FAQ 问答智能体、转人工智能体等。
  - Handoffs 控制器：管理智能体间的任务移交和状态传递。
  - 人工客服接口：在需要时将用户转接给人工坐席。
  - 监控与日志：跟踪对话进度、记录异常与用户反馈。
  - 存储层：持久化用户对话历史和上下文。

data_flow:
  - 用户发起对话，系统登录会话管理模块并调度第一个智能体（如问候/信息收集）。
  - 信息收集智能体根据用户输入提问并更新对话状态，完成后调用 Handoffs 传递控制给下一阶段智能体。
  - FAQ 智能体接手，基于收集的信息回答用户提问。如有未解答问题，则调用 Handoffs 触发“人工转接”流程。
  - 转人工智能体或接口将当前对话和收集信息通知人工客服，完成转接。
  - 反馈环：人工客服与用户互动时，系统继续记录对话状态及结果。

evaluation_metrics:
  - 成功转接率：自动处理问题的比例与需人工介入的比例。
  - 用户满意度：对话后用户调查或反馈评分。
  - 任务完成时间：每个对话轮次和整个对话完成的平均时长。
  - 转人工延迟：从用户请求转人工到人工响应的时间。
  - 对话正确率：智能体回答的准确率或有用性。

risk_points:
  - 状态丢失：长对话时对话状态复杂，可能出现上下文丢失或错乱。
  - 误判风险：智能体错误转人工或错误回答可能影响用户体验。
  - 数据隐私：对话中收集的敏感信息需要加密存储与传输，保证隐私合规。
  - 系统过载：大量并发用户对话可能造成延迟，需考虑负载均衡和扩展。
  - 人机交接：转人工时如何无缝平滑需要考虑设计细节，如对话切换和信息同步。

interview_followups:
  - 如果需要在不同智能体间传递用户情感或优先级信息，如何设计对话状态？
  - 怎么设计智能体的退避策略以防止无限次错判转人工或循环回应？

--- question ---

question_id: Q27
module: Agent 基础与架构
type: system_design
difficulty: 5
knowledge_points:
  - 系统设计
  - 分布式
  - 容错

stem: |
  设计一个分布式多智能体系统，用于实时处理和分析大规模监控数据，如交通监控或物联网传感器数据。重点说明如何保证系统的可扩展性、容错性以及低延迟。

architecture_points:
  - 分布式集群架构：部署在多节点的 Ray 或 Kubernetes 集群。
  - 数据摄取层：使用消息队列（如 Kafka）收集原始传感器数据并分发给智能体。
  - 智能体节点：多个并行工作节点，每个节点运行一个或多个专用智能体实例来处理部分数据。
  - 协调/分片模块：分配工作负载并重新分配在节点之间（可使用分布式负载均衡器）。
  - 存储层：时序数据库或分布式存储用于历史数据和模型更新。
  - 监控与故障恢复：实时监控指标，节点故障时自动重启或迁移任务。

data_flow:
  - 传感器数据推送到消息队列，被路由到各智能体节点处理。
  - 每个智能体负责处理其分配的数据片段，执行分析算法并输出结果。
  - 分析结果可以实时写入实时数据库或触发告警模块。
  - 协调组件监控节点负载，动态增加或减少智能体副本以适应流量变化。
  - 故障时，未完成的数据分配给其他节点重处理，结果回写至存储。

evaluation_metrics:
  - 吞吐率：每秒钟处理的数据量。
  - 延迟：从数据到达系统到生成分析结果的时间。
  - 可扩展性：添加新节点后系统吞吐的提升比例。
  - 容错率：节点故障时任务恢复成功率和平均故障恢复时间。
  - 处理准确性：分析结果的精度或召回率（视具体算法而定）。

risk_points:
  - 节点故障：单个节点崩溃需有自动重新分发机制，避免数据丢失或任务丢失。
  - 数据倾斜：数据分片不均可能导致部分节点过载，需智能分配策略。
  - 网络瓶颈：大量数据流量可能造成网络拥堵，需要优化网络拓扑。
  - 延迟要求：实时场景对延迟敏感，需要减少批处理周期或采用流式处理。
  - 安全风险：传感器数据可能敏感，需加密传输并做访问控制。

interview_followups:
  - 如何验证系统在节点故障时的负载均衡和恢复机制有效性？
  - 在此设计中，存储层的选型如何考虑数据一致性和查询性能？

--- question ---

question_id: Q28
module: Agent 基础与架构
type: coding_or_pseudocode
difficulty: 3
knowledge_points:
  - 任务调度
  - 轮询算法
  - 负载均衡

stem: |
  请用 Python 风格的伪代码实现一个简单的轮询（Round-Robin）任务调度器，将给定的任务列表按顺序分配给 N 个智能体（agents），循环进行分配。

reference_answer: |
  核心思路是遍历任务列表，对于第 i 个任务，将其分配给 `agents[i % N]`。这样第一个任务分配给第一个智能体，第二个任务给第二个，以此类推，到第 N+1 个任务时再次分配给第一个智能体，实现循环分配。
  示例伪代码：
  ```
  function round_robin_schedule(tasks, agents):
      assignments = {}
      N = len(agents)
      for i, task in enumerate(tasks):
          agent = agents[i % N]
          assignments[task] = agent
      return assignments
  ```

answer_keywords:
  - 轮询
  - 任务分配

scoring_points:
  - 使用任务索引对智能体数量取模的方法实现轮流分配。
  - 代码结构清晰，涵盖所有任务和智能体。
  - 考虑 N=0 或空列表等边界情况（若有时间可提及）。

pseudocode: |
  def round_robin_schedule(tasks, agents):
      assignments = {}
      if len(agents) == 0:
          return assignments
      N = len(agents)
      for i, task in enumerate(tasks):
          agent = agents[i % N]
          assignments[task] = agent
      return assignments

complexity:
  time: O(M)   # M = number of tasks
  space: O(M)  # 存储任务分配结果

test_cases:
  - input:
      tasks: ["T1", "T2", "T3", "T4"]
      agents: ["A", "B"]
    expected: {"T1": "A", "T2": "B", "T3": "A", "T4": "B"}
  - input:
      tasks: [1, 2, 3]
      agents: ["X"]
    expected: {1: "X", 2: "X", 3: "X"}

interview_followups:
  - 如果某些智能体当前负载过高，如何修改调度算法以动态平衡负载？
  - 如何处理任务数量远大于智能体数量时的内存或性能问题？

--- question ---

question_id: Q29
module: Agent 基础与架构
type: coding_or_pseudocode
difficulty: 3
knowledge_points:
  - 路由模式
  - 并行调用
  - 结果聚合

stem: |
  请用 Python 风格伪代码实现一个多智能体路由器函数，该函数并行调用多个智能体对同一个输入进行处理，并将它们的输出合并为列表返回。

reference_answer: |
  核心思路是对输入调用每个智能体（agents）并收集它们的输出。可以简单地并行调用所有智能体（或依次调用然后聚合），然后返回所有结果的集合。例如：
  ```
  function parallel_router(input, agents):
      results = []
      for agent in agents:
          result = agent.process(input)
          results.append(result)
      return results
  ```
  对并行执行的实现可以在实际代码中使用异步或多线程。下面以顺序调用的方式描述逻辑。

answer_keywords:
  - 并行调用
  - 结果汇总

scoring_points:
  - 对每个智能体应用相同输入并收集结果。
  - 解释并行调用可提高效率。
  - 代码结构清晰，最终返回聚合列表。

pseudocode: |
  def parallel_router(input_data, agents):
      results = []
      for agent in agents:
          output = agent.process(input_data)
          results.append(output)
      return results

complexity:
  time: O(N)   # N = number of agents (并行时，可视为 O(1) 但顺序调用为 O(N))
  space: O(N)  # 存储所有代理的输出结果

test_cases:
  - input:
      input_data: "query"
      agents: [lambda x: x+"1", lambda x: x+"2"]
    expected: ["query1", "query2"]
  - input:
      input_data: 5
      agents: [lambda x: x*2, lambda x: x+10, lambda x: -x]
    expected: [10, 15, -5]

interview_followups:
  - 如果需要对每个智能体调用有超时限制，伪代码如何改进？
  - 在实际部署中，你会采用哪种方式并行执行上述调用以优化性能？
