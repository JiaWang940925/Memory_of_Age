"""
岁语 - 老年人回忆录助手
魔塔部署版本（修复版 v6 - 单页面版）
Slogan: 把时光酿成诗，让回忆有处可栖
"""

import gradio as gr
import os
from datetime import datetime

# ============ 自定义CSS样式 ============
CUSTOM_CSS = """
:root {
    --primary-color: #8B6F47;
    --secondary-color: #D4A574;
    --bg-color: #FDF8F0;
    --card-bg: #FFF9F0;
    --text-color: #4A3C2A;
}

body, .gradio-container {
    background-color: var(--bg-color) !important;
    color: var(--text-color) !important;
    font-family: Georgia, SimSun, serif !important;
}

h1, h2, h3 { color: var(--primary-color) !important; }

button.primary {
    background-color: var(--primary-color) !important;
    border-color: var(--primary-color) !important;
    color: white !important;
    border-radius: 25px !important;
}

.gr-box, .gr-column, .gr-form {
    background-color: var(--card-bg) !important;
    border-radius: 10px !important;
}

input, textarea {
    background-color: white !important;
    border: 2px solid var(--secondary-color) !important;
    border-radius: 8px !important;
}

.welcome-title {
    text-align: center;
    font-size: 48px;
    color: #8B6F47;
    font-weight: bold;
    letter-spacing: 8px;
    margin: 20px 0 10px;
}

.welcome-slogan {
    text-align: center;
    font-size: 20px;
    color: #C4956A;
    font-style: italic;
    margin-bottom: 30px;
}

.center-form {
    max-width: 600px !important;
    margin: 0 auto !important;
}

.section-title {
    text-align: center;
    color: #8B6F47;
    font-size: 18px;
    margin-bottom: 20px;
}
"""

# ============ 历史事件数据库 ============
HISTORICAL_EVENTS = {
    1949: [{"year": 1949, "title": "新中国成立"}],
    1950: [{"year": 1950, "title": "抗美援朝"}],
    1958: [{"year": 1958, "title": "大跃进运动"}],
    1966: [{"year": 1966, "title": "文革开始"}],
    1976: [{"year": 1976, "title": "文革结束"}],
    1978: [{"year": 1978, "title": "改革开放"}],
    1997: [{"year": 1997, "title": "香港回归"}],
    2008: [{"year": 2008, "title": "北京奥运会"}],
}

# ============ 应用类 ============
class SuiyuApp:
    def __init__(self):
        self.user_info = {}
        self.memories = []
        self.started = False

    def start(self, name, birth_year, gender, birth_loc, current_loc):
        """开始旅程"""
        try:
            birth_year_val = int(birth_year) if birth_year else 1950
        except:
            birth_year_val = 1950

        self.user_info = {
            "name": name or "用户",
            "birth_year": birth_year_val,
            "gender": gender or "男",
            "birth_location": birth_loc or "",
            "current_location": current_loc or birth_loc or "",
        }
        self.memories = []
        self.started = True
        age = datetime.now().year - birth_year_val

        # 欢迎消息
        welcome = f"您好，{name or '朋友'}！欢迎来到岁语。{birth_year_val}年，那是一个充满故事的年代。让我们一起把散落在时光里的珍珠串成项链。我们从哪里开始呢？"

        # 历史背景
        history_text = "### 🏛️ 时代印记\n\n"
        events = []
        for year in range(birth_year_val, min(birth_year_val + 80, 2025)):
            if year in HISTORICAL_EVENTS:
                for e in HISTORICAL_EVENTS[year]:
                    events.append(f"**{e['year']}年 - {e['title']}**（您当时{year-birth_year_val}岁）")
        if events:
            history_text += "\n".join([f"• {e}" for e in events[:5]])
        else:
            history_text += "暂无历史事件数据"

        user_text = f"**{name or '用户'}** | {gender or '未知'} | {age}岁\n\n{birth_loc or '未知'} → {current_loc or birth_loc or '未知'}"

        # 返回更新：隐藏输入区，显示对话区，更新内容
        return (
            gr.update(visible=False),  # 隐藏输入区
            gr.update(visible=True),   # 显示对话区
            [[None, welcome]],         # chatbot格式：[[用户消息, AI回复]]
            history_text,
            user_text,
        )

    def chat_text(self, message, history):
        """文字对话"""
        if not message or not message.strip():
            return "", history or [], ""

        response = "谢谢您分享这段回忆。能再多说一些细节吗？比如当时是什么时间、在哪里发生的？"
        self.memories.append({"content": message, "type": "text"})

        if history is None:
            history = []
        history.append([message, response])
        return "", history, "情绪: 平静"

    def chat_photo(self, photo, desc, history):
        """照片对话"""
        if not desc or not desc.strip():
            desc = "分享了一张照片"

        full_msg = f"[照片] {desc}"
        response = "这张照片一定承载着珍贵的记忆。能再多说一些当时的细节吗？"
        self.memories.append({"content": desc, "type": "photo"})

        if history is None:
            history = []
        history.append([full_msg, response])
        return history, "", "情绪: 平静"

    def chat_audio(self, audio, history):
        """语音对话"""
        msg = "[语音消息]"
        response = "收到您的语音分享。能否用文字简单描述一下您刚才说的内容？这样我能更好地帮您记录。"
        self.memories.append({"content": "语音分享", "type": "audio"})

        if history is None:
            history = []
        history.append([msg, response])
        return history, "收到语音，请补充文字描述"

    def gen_memoir(self):
        """生成回忆录"""
        if not self.memories:
            return "请先分享一些回忆故事。", ""

        name = self.user_info.get("name", "用户")
        birth_year = self.user_info.get("birth_year", "")
        content = "\n\n".join([m.get("content", "") for m in self.memories])

        text = f"""# {name}的岁月长歌

*{birth_year}年生*

---

{content}

---

*把时光酿成诗，让回忆有处可栖*
"""
        return text, f"✅ 已生成{len(self.memories)}段回忆"

    def gen_video(self, api_key):
        """生成视频"""
        if not self.memories:
            return None, "请先分享回忆"

        key = api_key or os.getenv("DASHSCOPE_API_KEY", "")
        if not key:
            return None, "⚠️ 缺少API Key"

        try:
            import dashscope
            from dashscope import VideoSynthesis
            dashscope.api_key = key

            name = self.user_info.get("name", "")
            birth_year = self.user_info.get("birth_year", "")
            highlights = "; ".join([m.get("content", "")[:30] for m in self.memories[:3]])

            prompt = f"温暖怀旧风格，老人回忆录视频。主角{name}，{birth_year}年生。人生历程：童年、青春、家庭。记忆：{highlights}"

            rsp = VideoSynthesis.call(model="wanx2.1-t2v-turbo", prompt=prompt, duration=10)
            if rsp.status_code == 200:
                return rsp.output.video_url, "✅ 视频生成成功"
            else:
                return None, f"❌ {rsp.message}"
        except Exception as e:
            return None, f"❌ {str(e)}"

# ============ 创建界面 ============
app = SuiyuApp()

def create_interface():
    with gr.Blocks(title="岁语 - 把时光酿成诗", css=CUSTOM_CSS) as demo:

        gr.HTML('<div class="welcome-title">岁语</div>')
        gr.HTML('<div class="welcome-slogan">"把时光酿成诗，让回忆有处可栖"</div>')

        # ========== 信息输入区（初始可见）==========
        with gr.Column(visible=True) as input_section:
            gr.Markdown('<div class="section-title">👤 请填写您的基本信息</div>')

            with gr.Row():
                with gr.Column(scale=1):
                    pass
                with gr.Column(scale=2, elem_classes="center-form"):
                    name_input = gr.Textbox(label="姓名", placeholder="您的名字", value="")
                    birth_year_input = gr.Number(label="出生年份", value=1950, minimum=1920, maximum=2020)
                    gender_input = gr.Dropdown(choices=["男", "女"], value="男", label="性别")
                    birth_loc_input = gr.Textbox(label="出生地", placeholder="如：北京", value="")
                    current_loc_input = gr.Textbox(label="现居地", placeholder="如：上海（选填）", value="")

                    start_btn = gr.Button("✨ 开启回忆之旅", variant="primary", size="lg")
                with gr.Column(scale=1):
                    pass

        # ========== 主内容区（初始隐藏）==========
        with gr.Column(visible=False) as main_section:
            with gr.Row():
                # 左侧信息
                with gr.Column(scale=1, min_width=200):
                    gr.Markdown("### 👤 我的信息")
                    user_info_box = gr.Markdown("等待填写...")

                    gr.Markdown("### 📅 时代背景")
                    history_box = gr.Markdown("等待填写...")

                # 中间对话
                with gr.Column(scale=2, min_width=400):
                    gr.Markdown("### 💬 回忆对话")
                    chatbot = gr.Chatbot(label="", height=400)

                    # 多模态输入
                    with gr.Tabs():
                        with gr.TabItem("📝 文字"):
                            text_input = gr.Textbox(
                                label="写下您的回忆",
                                placeholder="在这里输入您的故事...",
                                lines=2
                            )
                            text_send = gr.Button("发送", variant="primary")

                        with gr.TabItem("📸 照片"):
                            photo_input = gr.Image(label="上传老照片", type="filepath")
                            photo_desc = gr.Textbox(
                                label="照片背后的故事",
                                placeholder="这张照片是什么时候拍的？",
                                lines=2
                            )
                            photo_send = gr.Button("发送照片故事", variant="primary")

                        with gr.TabItem("🎤 语音"):
                            audio_input = gr.Audio(label="录制语音", source="microphone", type="filepath")
                            audio_send = gr.Button("发送语音", variant="primary")

                    emotion_box = gr.Textbox(label="情绪感知", interactive=False, value="等待输入...")

                # 右侧生成
                with gr.Column(scale=1, min_width=200):
                    gr.Markdown("### 📖 回忆录")
                    gen_memoir_btn = gr.Button("生成回忆录", variant="primary")
                    memoir_status = gr.Textbox(label="状态", interactive=False, value="")

                    gr.Markdown("### 🎬 视频")
                    api_key_input = gr.Textbox(label="API Key", placeholder="选填", type="password")
                    gen_video_btn = gr.Button("生成视频", variant="primary")
                    video_status = gr.Textbox(label="状态", interactive=False, value="")

            # 回忆录编辑区
            gr.Markdown("### ✏️ 回忆录预览与编辑")
            memoir_editor = gr.Textbox(
                label="生成的回忆录将显示在这里",
                lines=15,
                interactive=True,
                value=""
            )

            # 视频播放器
            gr.Markdown("### 🎥 视频预览")
            video_player = gr.Video(label="", interactive=False)

        # ========== 事件绑定 ==========

        # 开启回忆之旅
        start_btn.click(
            fn=app.start,
            inputs=[name_input, birth_year_input, gender_input, birth_loc_input, current_loc_input],
            outputs=[input_section, main_section, chatbot, history_box, user_info_box]
        )

        # 文字对话
        text_send.click(
            fn=app.chat_text,
            inputs=[text_input, chatbot],
            outputs=[text_input, chatbot, emotion_box]
        )
        text_input.submit(
            fn=app.chat_text,
            inputs=[text_input, chatbot],
            outputs=[text_input, chatbot, emotion_box]
        )

        # 照片对话
        photo_send.click(
            fn=app.chat_photo,
            inputs=[photo_input, photo_desc, chatbot],
            outputs=[chatbot, photo_desc, emotion_box]
        )

        # 语音对话
        audio_send.click(
            fn=app.chat_audio,
            inputs=[audio_input, chatbot],
            outputs=[chatbot, emotion_box]
        )

        # 生成回忆录
        gen_memoir_btn.click(
            fn=app.gen_memoir,
            inputs=[],
            outputs=[memoir_editor, memoir_status]
        )

        # 生成视频
        gen_video_btn.click(
            fn=app.gen_video,
            inputs=[api_key_input],
            outputs=[video_player, video_status]
        )

    return demo

# 启动
demo = create_interface()

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
