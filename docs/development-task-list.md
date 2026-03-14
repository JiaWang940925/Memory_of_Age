# 岁语开发任务清单

## 0. 基础前提

本清单基于以下已确认方向：

- 第一阶段主要付费人群：40-60 岁子女
- 第一阶段主要陪伴对象：老人本人
- 产品形态：普通家用产品
- 主要设备：手机
- 支持“老人 + 子女”共同使用同一个账号
- 对外不使用“阿尔茨海默预防”表述

当前开发目标统一为：

**把岁语做成一个面向家庭使用的“回忆录整理 + 脑健康陪伴”产品。**

---

## 1. 开发原则

- 移动端优先，桌面端兼容
- 先做路径清晰，再做功能丰富
- 先做家庭协同，再做长期数据沉淀
- 日常回想不做“答题感”，不做诊断感
- 每个版本优先增强老人使用时的陪伴感和低压力体验

---

## 2. P0 任务

P0 目标：

- 让用户一进入产品就理解产品是给“家庭共同使用”的
- 让老人路径和子女路径区分开
- 让“日常回想”从答题逻辑改成陪伴逻辑
- 完成手机优先的关键页面重排

### P0-1 首页信息架构重构

目标：

- 首页明确三条主路径
- 让子女一眼知道这能用来陪伴父母
- 让老人一眼知道这不是复杂工具

任务内容：

- 将首页入口改为三个主按钮：
  - 我来记录自己的人生
  - 我来帮父母整理回忆
  - 今天做一次轻松回想
- 首页首屏文案改为家庭协同导向
- 隐私承诺文案同步改为“家庭回忆与脑健康陪伴”口径
- 首页卡片说明减少“AI 能力描述”，增加“家庭场景价值”

涉及文件：

- [WelcomePage.tsx](/Users/jiawang/Desktop/岁语/src/components/WelcomePage.tsx)
- [App.tsx](/Users/jiawang/Desktop/岁语/src/App.tsx)

验收标准：

- 用户进入首页后，能明确分辨老人自用、子女代访、日常回想三个场景
- 手机端首屏不需要横向滚动
- 首页 CTA 不再默认把所有人导向同一路径

### P0-2 增加“使用角色”与“家庭协同”状态

目标：

- 支持同一账号下由老人和子女共同使用
- 后续问题、文案、页面按钮可根据角色切换

任务内容：

- 在全局状态中新增：
  - 当前操作者身份
  - 与老人关系
  - 是否本人在场
  - 是否允许家属补充
- 为会话和本地存储增加协同字段
- 预留后续“家属补充备注”和“共同编辑”能力

建议新增类型：

- `OperatorRole`
- `RelationshipToElder`
- `CollaborationSettings`

涉及文件：

- [App.tsx](/Users/jiawang/Desktop/岁语/src/App.tsx)
- [userProfile.ts](/Users/jiawang/Desktop/岁语/src/lib/userProfile.ts)
- [session.ts](/Users/jiawang/Desktop/岁语/src/lib/session.ts)

验收标准：

- 家属进入后可明确标记自己不是老人本人
- 老人资料和操作者资料不再混淆
- 刷新页面后协同状态仍能保留

### P0-3 资料页改版为“老人资料 + 家庭使用关系”

目标：

- 让资料页既服务个性化提问，也服务家庭协同
- 降低后续人物、地点、关系识别误差

任务内容：

- 在资料页中新增：
  - 当前操作者
  - 与老人关系
  - 家庭常用称呼
  - 是否允许家属继续补充
- 在“记忆触发信息”区新增轻量字段：
  - 曾长期生活地
  - 重要职业
  - 重要家庭成员称呼
  - 常提到的旧物或兴趣
- 将表单改成更适合手机分段录入的布局

涉及文件：

- [ProfileSetupPage.tsx](/Users/jiawang/Desktop/岁语/src/components/ProfileSetupPage.tsx)
- [userProfile.ts](/Users/jiawang/Desktop/岁语/src/lib/userProfile.ts)
- [historicalEvents.ts](/Users/jiawang/Desktop/岁语/src/lib/historicalEvents.ts)

验收标准：

- 用户能在手机端顺畅填写完整资料
- 资料页明确区分“老人是谁”和“谁在操作”
- 提交后摘要区域可反映新增的家庭协同信息

### P0-4 访谈模式拆分

目标：

- 让当前访谈引擎适配不同使用场景
- 避免所有问题都以“老人单独作答”假设来生成

任务内容：

- 将访谈模式拆为三种：
  - 自述模式
  - 家属陪访模式
  - 轻量回想模式
- `conversation` 问题生成逻辑增加模式参数
- 家属陪访模式下，同一问题输出：
  - 给老人看的提问
  - 给家属看的追问建议
- 轻量回想模式下，优先生成人物、地点、日常类问题

涉及文件：

- [conversation.ts](/Users/jiawang/Desktop/岁语/src/lib/conversation.ts)
- [ChatPage.tsx](/Users/jiawang/Desktop/岁语/src/components/ChatPage.tsx)

验收标准：

- 至少支持两套不同的问题文案风格
- 家属陪访模式下能看到追问建议
- 不同模式切换后不会破坏现有记忆存储

### P0-5 重做“日常回想”逻辑，去掉答题感

目标：

- 把日常回想从“答案核对”改成“陪伴式回想”
- 降低老人心理压力

任务内容：

- 移除 `expectedAnswer + similarity` 主逻辑
- 新的记录状态改为：
  - 自己说出
  - 提示后说出
  - 家属补充后想起
  - 今天先不说
- 页面只保留一个问题、一个提示、一个作答入口、一个跳过入口
- 输出结果改为“今天回想记录”，不做对错反馈

涉及文件：

- [DailyRecallPage.tsx](/Users/jiawang/Desktop/岁语/src/components/DailyRecallPage.tsx)
- [dailyRecall.ts](/Users/jiawang/Desktop/岁语/src/lib/dailyRecall.ts)

验收标准：

- 页面中不再出现答题、评分、相似度等强校验感
- 老人可以在不回答完整内容的情况下继续使用
- 回想记录可以被家属查看，但不形成“答错”提示

### P0-6 手机优先改版

目标：

- 让首页、资料页、聊天页、日常回想页在手机上是主体验

任务内容：

- 重排首页首屏层级
- 资料页改成单列优先
- 聊天页输入区改成单手更容易触达
- 日常回想页减少块级信息密度
- 按钮大小、间距、字号再做一次老年友好校准

涉及文件：

- [WelcomePage.tsx](/Users/jiawang/Desktop/岁语/src/components/WelcomePage.tsx)
- [ProfileSetupPage.tsx](/Users/jiawang/Desktop/岁语/src/components/ProfileSetupPage.tsx)
- [ChatPage.tsx](/Users/jiawang/Desktop/岁语/src/components/ChatPage.tsx)
- [DailyRecallPage.tsx](/Users/jiawang/Desktop/岁语/src/components/DailyRecallPage.tsx)
- [index.css](/Users/jiawang/Desktop/岁语/src/index.css)

验收标准：

- 核心页面在手机端单手可操作
- 关键按钮位置稳定、文本可读
- 不出现移动端信息挤压或操作区过深的问题

---

## 3. P1 任务

P1 目标：

- 让“家庭共同整理回忆”真正可用
- 把地图从展示页升级为协同整理页
- 提升照片、人物、地点这些核心资产的可维护性

### P1-1 人物关系手动校正

目标：

- 降低自动识别错误的影响
- 让家属可参与修正关键人物

任务内容：

- 为重要人物增加编辑入口
- 可修改：
  - 人物称呼
  - 人物关系
  - 是否为核心家庭成员
  - 相关照片
- 允许合并重复人物节点

涉及文件：

- [JourneyPage.tsx](/Users/jiawang/Desktop/岁语/src/components/JourneyPage.tsx)
- [peopleMentions.ts](/Users/jiawang/Desktop/岁语/src/lib/peopleMentions.ts)

验收标准：

- 家属能手动修正识别结果
- 修正后地图、回忆录、日常回想能读到新数据

### P1-2 地点与照片补录

目标：

- 让家属帮助老人把回忆素材补完整
- 提高地图和回忆录的可读性

任务内容：

- 为回忆节点增加地点补录
- 为人物节点增加照片补录
- 为回忆节点增加“这是谁讲的 / 是否已确认”
- 允许家属对已有照片添加说明

涉及文件：

- [JourneyPage.tsx](/Users/jiawang/Desktop/岁语/src/components/JourneyPage.tsx)
- [MemoryPage.tsx](/Users/jiawang/Desktop/岁语/src/components/MemoryPage.tsx)
- [App.tsx](/Users/jiawang/Desktop/岁语/src/App.tsx)

验收标准：

- 家属能补地点、补照片、补备注
- 地图与回忆录能显示补录内容

### P1-3 家庭共编与备注

目标：

- 支持子女边陪访边补充内容
- 沉淀家庭共同编辑痕迹

任务内容：

- 为每段回忆增加家属备注区
- 增加“待确认 / 已确认”状态
- 增加“家属补充内容”展示区
- 导出时可选择是否附带家属备注

涉及文件：

- [ChatPage.tsx](/Users/jiawang/Desktop/岁语/src/components/ChatPage.tsx)
- [MemoryPage.tsx](/Users/jiawang/Desktop/岁语/src/components/MemoryPage.tsx)
- [memoryBook.ts](/Users/jiawang/Desktop/岁语/src/lib/memoryBook.ts)

验收标准：

- 家属能补充但不会覆盖原始口述
- 导出时能区分“老人原话”和“家属备注”

### P1-4 首页到回忆录的家庭场景化文案统一

目标：

- 统一整体语气
- 强化“家用陪伴产品”心智

任务内容：

- 全局清理仍偏工具化、偏功能堆叠的文案
- 将核心文案统一为：
  - 家人一起整理回忆
  - 温和陪伴
  - 脑健康陪伴
  - 家庭记忆资产

涉及文件：

- [WelcomePage.tsx](/Users/jiawang/Desktop/岁语/src/components/WelcomePage.tsx)
- [ProfileSetupPage.tsx](/Users/jiawang/Desktop/岁语/src/components/ProfileSetupPage.tsx)
- [ChatPage.tsx](/Users/jiawang/Desktop/岁语/src/components/ChatPage.tsx)
- [MemoryPage.tsx](/Users/jiawang/Desktop/岁语/src/components/MemoryPage.tsx)
- [JourneyPage.tsx](/Users/jiawang/Desktop/岁语/src/components/JourneyPage.tsx)
- [DailyRecallPage.tsx](/Users/jiawang/Desktop/岁语/src/components/DailyRecallPage.tsx)

验收标准：

- 不再出现与当前定位冲突的表述
- 页面之间的产品语言风格一致

---

## 4. P2 任务

P2 目标：

- 提升长期留存
- 强化日常陪伴节奏
- 让家庭更容易分享和持续使用

### P2-1 日常回想趋势记录

目标：

- 形成轻量的长期陪伴视图
- 帮助家属看到“更容易想起什么”“更容易卡住什么”

任务内容：

- 记录每日回想主题
- 记录回想状态
- 记录是否需要家属提示
- 汇总最近 7 天 / 30 天趋势

涉及文件：

- [DailyRecallPage.tsx](/Users/jiawang/Desktop/岁语/src/components/DailyRecallPage.tsx)
- [dailyRecall.ts](/Users/jiawang/Desktop/岁语/src/lib/dailyRecall.ts)
- [App.tsx](/Users/jiawang/Desktop/岁语/src/App.tsx)

验收标准：

- 家属可以看到趋势概览
- 不出现风险评分、疾病判断等表述

### P2-2 生活触发器库扩充

目标：

- 让日常回想更贴近日常生活
- 提高老人回想成功率

任务内容：

- 在现有人物、地点、时代线索基础上新增：
  - 旧物件
  - 饭菜
  - 节日
  - 家庭习惯
  - 工作工具
  - 老歌 / 老广播

涉及文件：

- [historicalEvents.ts](/Users/jiawang/Desktop/岁语/src/lib/historicalEvents.ts)
- [dailyRecall.ts](/Users/jiawang/Desktop/岁语/src/lib/dailyRecall.ts)
- [conversation.ts](/Users/jiawang/Desktop/岁语/src/lib/conversation.ts)

验收标准：

- 轻量回想问题不再过度依赖宏大时代事件
- 新触发器能在聊天、地图、日常回想中复用

### P2-3 家庭分享与传播

目标：

- 让子女更容易分享成果
- 增强家用产品的自然传播

任务内容：

- 输出适合手机分享的长图摘要
- 输出适合家庭群分享的回忆卡片
- 输出人物 / 地点摘要页
- 预留“邀请家人一起补充”的入口

涉及文件：

- [MemoryPage.tsx](/Users/jiawang/Desktop/岁语/src/components/MemoryPage.tsx)
- [memoryBook.ts](/Users/jiawang/Desktop/岁语/src/lib/memoryBook.ts)
- [JourneyPage.tsx](/Users/jiawang/Desktop/岁语/src/components/JourneyPage.tsx)

验收标准：

- 能生成适合移动端传播的内容
- 分享内容不暴露不必要的隐私信息

---

## 5. 暂不进入当前版本的事项

以下内容不建议进入当前阶段路线图：

- 医疗诊断相关功能
- 风险分级或疾病判断
- 面向机构的批量管理后台
- 面向医院合作的专业评估流程
- 重型账号体系和复杂权限系统

原因：

- 当前产品目标已明确为家用产品
- 当前首要矛盾是产品路径和家庭协同，而不是机构扩展

---

## 6. 推荐开发顺序

建议按以下顺序推进：

1. P0-1 首页信息架构重构
2. P0-2 使用角色与家庭协同状态
3. P0-3 资料页改版
4. P0-4 访谈模式拆分
5. P0-5 日常回想去答题感
6. P0-6 手机优先改版
7. P1-1 人物关系手动校正
8. P1-2 地点与照片补录
9. P1-3 家庭共编与备注
10. P2-1 趋势记录
11. P2-2 触发器扩充
12. P2-3 家庭分享

---

## 7. 交付形式建议

如果继续往下拆，下一步建议直接继续输出三份内容：

- 页面改版任务单
- 技术实现拆分单
- 文案改版清单
