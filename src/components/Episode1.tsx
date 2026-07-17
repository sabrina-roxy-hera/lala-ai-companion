"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { CHARACTER_PROFILES, CharacterKey } from "@/lib/prompts";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";

interface Episode1Props {
  onComplete: (chosen: CharacterKey) => void;
  onBack: () => void;
}

type Phase =
  | "narration"          // 开场旁白
  | "entrance"           // 嘉宾逐个入场（含互动）
  | "seat-pick"          // 心动选座
  | "group-chat"         // 群聊环节
  | "solo-pick"          // 选1v1对象
  | "chat"               // 1v1深度聊天
  | "event"              // 特殊事件弹窗
  | "ending";            // 章节结算

// ===================== 入场脚本系统 =====================

interface ScriptStep {
  type: "host" | "action" | "dialogue" | "choice" | "divider" | "card-reveal" | "hint";
  character?: CharacterKey;
  text: string;
  delay: number; // 0 = wait for choice
  choices?: { text: string; label: string; response: string }[];
}

function buildEntranceScript(order: CharacterKey[]): ScriptStep[] {
  const steps: ScriptStep[] = [];
  const ordinalLabels = ["第一位", "第二位", "第三位", "第四位", "第五位", "最后一位"];

  order.forEach((key, idx) => {
    const char = CHARACTER_PROFILES[key];
    const total = order.length;
    const ordinal = idx === total - 1 ? "最后一位" : ordinalLabels[idx] || `第${idx + 1}位`;

    // Divider between guests
    if (idx > 0) {
      steps.push({ type: "divider", text: "·", delay: 1000 });
      // Atmosphere comments as more people arrive
      if (idx === 2) {
        steps.push({ type: "host", text: "房间里的人渐渐多了。气氛开始变得微妙", delay: 1800 });
      } else if (idx === 4) {
        steps.push({ type: "host", text: "还有最后两位了。你有没有开始在意某个人？", delay: 2000 });
      }
    }

    // Host teaser
    steps.push({ type: "host", text: `${ordinal}嘉宾即将入场——`, delay: 1800 });
    steps.push({ type: "hint", text: char.entranceHint, delay: 2800 });

    // Card reveal
    steps.push({ type: "card-reveal", character: key, text: "", delay: 2000 });

    // Entrance lines
    for (const line of char.entranceLines) {
      const isAction = line.startsWith("（");
      steps.push({
        type: isAction ? "action" : "dialogue",
        character: key,
        text: line,
        delay: isAction ? 1800 : 2500,
      });
    }

    // First impression choice — only for guests 1, 3, 5 (give breathing room)
    if (idx % 2 === 0) {
      steps.push({
        type: "choice",
        character: key,
        text: "",
        delay: 0,
        choices: char.firstImpressionChoices,
      });
    }
  });

  // After all entrances — a recap moment
  steps.push({ type: "divider", text: "·", delay: 1000 });
  steps.push({ type: "host", text: "所有嘉宾都到齐了。六个人，六个故事", delay: 2500 });
  steps.push({ type: "host", text: "你可能已经注意到了某个人——也可能还没有", delay: 2500 });
  steps.push({ type: "host", text: "接下来，你需要做一个选择", delay: 2000 });

  return steps;
}

// ===================== 旁白 =====================

const NARRATION_LINES = [
  { text: "「心跳信箱」", style: "title" as const },
  { text: "每个人心里都有一封没寄出去的信", style: "normal" as const },
  { text: "写了很多遍，删了很多遍", style: "normal" as const },
  { text: "不是不敢寄", style: "normal" as const },
  { text: "是不确定——对面有没有人在等", style: "emphasis" as const },
  { text: "·", style: "divider" as const },
  { text: "今晚，六位女生会一个一个走进这个房间", style: "normal" as const },
  { text: "在她们到齐之前，你跟每个人都有一小段独处的时间", style: "normal" as const },
  { text: "好好珍惜——因为这段时间，只属于你们两个", style: "emphasis" as const },
  { text: "·", style: "divider" as const },
  { text: "准备好了吗？", style: "emphasis" as const },
];

// ===================== 特殊事件 =====================

interface StoryEvent {
  id: string;
  triggerRound: number;
  title: string;
  icon: string;
  hostLine: string;
  description: string;
  choices: { text: string; label: string; aiContext: string; heartBonus: number }[];
  characterHints: Record<string, string>;
}

const STORY_EVENTS: StoryEvent[] = [
  {
    id: "secret_letter",
    triggerRound: 3,
    title: "心跳信箱",
    icon: "💌",
    hostLine: "叮——节目组送来了一封匿名信件",
    description: "工作人员递来一个信封。里面是一张卡片，上面写着一个关于她的秘密问题。你可以选择当面问她，也可以把这次机会留到以后。",
    choices: [
      {
        text: "拆开信封，当面问她",
        label: "大胆",
        aiContext: `【特殊事件：心跳信箱】用户拆开了信封，上面写着"你最近一次心动是什么时候？"。她选择当面问你这个问题。你要对这个突然的提问做出反应——可以认真回答，可以害羞回避，也可以反问她。注意：这是节目环节，你不能拒绝回应，但可以选择透露多少。`,
        heartBonus: 8,
      },
      {
        text: "把信封收起来，说「下次再看」",
        label: "温柔",
        aiContext: `【特殊事件：心跳信箱】节目组送来了信封，但用户没有拆开，而是微笑着说"下次再看，今天先好好聊"。你会对她这个举动有些意外——大多数人都会好奇信里写了什么，她却把这个机会让出去了。对这个细节做出反应。`,
        heartBonus: 5,
      },
      {
        text: "把信封递给她，「你来拆？」",
        label: "试探",
        aiContext: `【特殊事件：心跳信箱】节目组送来了一个信封，本来是给用户的，但用户反而把信封递给了你说"你来拆？"。信封里写的是"你最近一次心动是什么时候？"。你要对这个被反转的局面做出反应——是你来念出这个问题，变成你问她了。`,
        heartBonus: 10,
      },
    ],
    characterHints: {
      shenmo: "沈默面对感情问题会先沉默几秒，然后用一种很轻的语气回答，像是怕说太多。",
      gumian: "顾眠会用微笑掩盖真实反应，但眼神会出卖她。她可能会反问来掌控节奏。",
      luye: "鹿野会先笑着说'这也太突然了吧'，但如果追问，她的笑容会停一秒。",
      chengye: "程野会直接说'心动啊？上周打球的时候'然后发现自己说多了，摸后脑勺岔开话题。",
      wenyimo: "温以墨会用一个暧昧的笑回应，然后反问'你呢？你现在心动吗'——把球踢回去。",
      linsheng: "林声会安静了很久，然后轻声说'……很久以前了'。你感觉到她的语气里有什么很重的东西。",
    },
  },
  {
    id: "lights_dim",
    triggerRound: 6,
    title: "暗号时刻",
    icon: "🕯️",
    hostLine: "灯光突然暗了下来……",
    description: `房间里的灯突然调暗了，只剩下桌上一支蜡烛的光。工作人员说这是"暗号时刻"——在接下来的对话里，你们只能看到对方的轮廓和眼睛的微光。`,
    choices: [
      {
        text: "看着她说「这样好像更容易说真话」",
        label: "走心",
        aiContext: `【特殊事件：暗号时刻】灯光突然暗下来了，只剩烛光。用户看着你说"这样好像更容易说真话"。在昏暗中你们只能看到彼此的轮廓。这句话让气氛变得非常暧昧。你要在这个氛围下做出反应——黑暗确实让你放松了一些，你可能会说一些平时不会说的话。这一轮的回复要更亲密、更真实。`,
        heartBonus: 12,
      },
      {
        text: "假装害怕凑近了一点",
        label: "撩",
        aiContext: `【特殊事件：暗号时刻】灯光突然暗下来了，只剩烛光。用户假装有点怕黑，不自觉地往你这边靠近了一点。你能感觉到她比刚才近了很多，空气里多了一丝紧张感。你要对这个突然拉近的距离做出反应。`,
        heartBonus: 10,
      },
      {
        text: "用手机打开手电筒照她的脸",
        label: "搞怪",
        aiContext: `【特殊事件：暗号时刻】灯光暗下来了，结果用户掏出手机开手电筒照你的脸，还笑着说"让我看看你"。这个举动打破了暧昧的气氛，变成了一个好笑的时刻。你要做出反应——可以挡脸，可以抢她手机，可以笑她幼稚。`,
        heartBonus: 6,
      },
    ],
    characterHints: {
      shenmo: "暗下来的时候沈默反而放松了。黑暗对她来说是安全的。她可能会第一次主动说一句比较私人的话。",
      gumian: "顾眠在暗光下更迷人了。她的声音会不自觉地变轻。如果对方靠近，她不会躲。",
      luye: "鹿野会先说'哇好浪漫'，但如果安静下来，她会突然不知道说什么。黑暗让她的笑容面具有一瞬间滑落。",
      chengye: "程野在黑暗里突然安静了。她说'看不见的时候……反而想说真话'。这是她第一次不笑着说话。",
      wenyimo: "温以墨在黑暗里不说话了。你只能看到她烟的火星。过了很久她说了一句：'……你在吗'声音很轻。",
      linsheng: "林声在黑暗里轻轻哼了一首歌。很短，只有几个音。她说'这首歌是以前一个人教我的'。然后没再说下去。",
    },
  },
  {
    id: "final_letter",
    triggerRound: 9,
    title: "最后一封信",
    icon: "✉️",
    hostLine: "最后一个环节——心跳信箱",
    description: "节目组给你们每人发了一张空白卡片和一支笔。规则是：写一句话给对方，折好放进信箱。但对方要等到下一期才能打开。",
    choices: [
      {
        text: `写："今天很开心，但说不上来为什么"`,
        label: "含蓄",
        aiContext: `【特殊事件：最后一封信】这是破冰聊天的最后一个环节。节目组让你们互相写一句话。用户写了"今天很开心，但说不上来为什么"，折好放进了信箱。现在轮到你了。你也要写一句话作为你的回复内容——这句话不是对话，是你写在卡片上给她的。写完之后可以说一句话收尾。你写的内容要跟你这个角色的性格吻合，并且暗示你对她有了一些特别的感觉。`,
        heartBonus: 8,
      },
      {
        text: `写："我想知道你信封里那个问题的答案"`,
        label: "回扣",
        aiContext: `【特殊事件：最后一封信】这是破冰聊天的最后一个环节。用户在卡片上写了"我想知道你信封里那个问题的答案"——这是在呼应之前的心跳信箱环节，意味着她对你的心事有兴趣。现在轮到你写一句话。你的回复内容就是你写在卡片上的话——要跟你的角色性格吻合，可以回应她的好奇，也可以继续吊她胃口。写完后可以说一句收尾的话。`,
        heartBonus: 10,
      },
      {
        text: "写了很久，最后把卡片翻面让她看",
        label: "大胆",
        aiContext: `【特殊事件：最后一封信】这是破冰聊天的最后一个环节。用户打破了规则——她没有把卡片折好放进信箱，而是写了很久之后直接翻面让你看。卡片上只写了两个字："继续。"她不想等到下一期。你要对这个打破规则的举动做出反应——既要对她的大胆有所回应，也要写出你自己卡片上的那句话。这个举动很可能让你心动了。`,
        heartBonus: 15,
      },
    ],
    characterHints: {
      shenmo: "沈默会写很久。她的字很好看。她写的话会很短但很重——可能只有几个字，但每个字都是认真的。",
      gumian: "顾眠会很从容地写完，微笑着折好。但如果用户打破规则让她看，她的从容会裂开一瞬间。",
      luye: "鹿野会犹豫很久不知道写什么，可能会咬笔帽。最后写出来的东西跟她平时嘻嘻哈哈的样子完全不同。",
      chengye: "程野直接拿笔很快地写完了。字很大，很用力。写完把卡片拍在桌上：'写完了！'但不让你看。",
      wenyimo: "温以墨拿着笔转了很久，什么都没写。最后她写了，但折的时候手在抖——你从没见过她手抖。",
      linsheng: "林声写完之后把卡片贴在胸口按了一下，然后才放进信箱。像是在跟卡片说话。",
    },
  },
];

const HOST_COMMENTS: Record<number, string> = {
  2: "刚聊了两轮，但她看你的次数好像比你以为的多",
  5: "有些话说出来是试探，没说出来的才是心动",
  8: "时间快到了。你注意到了吗——她跟刚入场时不太一样了",
};

function getTime() {
  return new Date().toLocaleTimeString("zh-CN", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ===================== COMPONENT =====================

export default function Episode1({ onComplete, onBack }: Episode1Props) {
  // Randomize guest order once
  const guestOrder = useMemo(() => {
    const keys = Object.keys(CHARACTER_PROFILES) as CharacterKey[];
    return keys.sort(() => Math.random() - 0.5);
  }, []);

  const entranceScript = useMemo(() => buildEntranceScript(guestOrder), [guestOrder]);

  // ===== State =====
  const [phase, setPhase] = useState<Phase>("narration");
  const [narrationIndex, setNarrationIndex] = useState(0);

  // Entrance
  const [scriptStep, setScriptStep] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState<(ScriptStep & { choiceResponse?: string })[]>([]);
  const [revealedCards, setRevealedCards] = useState<Set<CharacterKey>>(new Set());

  // Seat & Group
  const [seatChoice, setSeatChoice] = useState<CharacterKey | null>(null);
  const [groupChatStep, setGroupChatStep] = useState(0); // 0=show answers, 1=pick who to respond to, 2=show response
  const [groupChatTarget, setGroupChatTarget] = useState<CharacterKey | null>(null);

  // 1v1 Chat
  const [chosenChar, setChosenChar] = useState<CharacterKey | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant" | "host" | "event"; content: string; timestamp: string; choices?: string[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatRound, setChatRound] = useState(0);
  const [heartLevel, setHeartLevel] = useState(0);
  const [revealedSecret, setRevealedSecret] = useState("");
  const [currentEvent, setCurrentEvent] = useState<StoryEvent | null>(null);
  const [triggeredEvents, setTriggeredEvents] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const MAX_ROUNDS = 10;

  // Auto-scroll
  useEffect(() => {
    if (phase === "entrance") scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    if (phase === "chat") chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleSteps, messages, loading, phase]);

  // ==================== NARRATION ====================
  useEffect(() => {
    if (phase !== "narration") return;
    if (narrationIndex >= NARRATION_LINES.length) {
      setTimeout(() => { setPhase("entrance"); setScriptStep(0); }, 1200);
      return;
    }
    const line = NARRATION_LINES[narrationIndex];
    const delay = line.style === "divider" ? 1200 : line.style === "title" ? 2500 : line.style === "emphasis" ? 2800 : 2200;
    const timer = setTimeout(() => setNarrationIndex((i) => i + 1), delay);
    return () => clearTimeout(timer);
  }, [phase, narrationIndex]);

  // ==================== ENTRANCE SCRIPT ENGINE ====================
  useEffect(() => {
    if (phase !== "entrance") return;
    if (scriptStep >= entranceScript.length) {
      // All done -> move to seat pick
      setTimeout(() => setPhase("seat-pick"), 1500);
      return;
    }

    const step = entranceScript[scriptStep];

    // For card-reveal, track which characters are revealed
    if (step.type === "card-reveal" && step.character) {
      setRevealedCards((prev) => new Set([...prev, step.character!]));
    }

    // Add step to visible list
    setVisibleSteps((prev) => [...prev, step]);

    // Auto-advance or wait for choice
    if (step.delay > 0) {
      const timer = setTimeout(() => setScriptStep((i) => i + 1), step.delay);
      return () => clearTimeout(timer);
    }
    // delay === 0 means wait for user choice (handled by click)
  }, [phase, scriptStep, entranceScript]);

  const handleFirstImpressionChoice = (choiceIndex: number) => {
    const step = entranceScript[scriptStep];
    if (!step.choices) return;
    const choice = step.choices[choiceIndex];

    // Replace the choice step with the response
    setVisibleSteps((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { ...step, choiceResponse: choice.response };
      return updated;
    });

    // Small heart bonus for first impression
    setHeartLevel((h) => Math.min(h + 3, 100));

    // Advance
    setTimeout(() => setScriptStep((i) => i + 1), 800);
  };

  // ==================== SEAT PICK ====================
  const handleSeatPick = (key: CharacterKey) => {
    setSeatChoice(key);
    setHeartLevel((h) => Math.min(h + 5, 100));
    // After a beat, move to group chat
    setTimeout(() => setPhase("group-chat"), 2500);
  };

  // ==================== GROUP CHAT ====================
  const handleGroupChatPick = (key: CharacterKey) => {
    setGroupChatTarget(key);
    setGroupChatStep(2);
    setHeartLevel((h) => Math.min(h + 5, 100));
  };

  // ==================== SOLO PICK + START CHAT ====================
  const handleSoloPick = (key: CharacterKey) => {
    setChosenChar(key);
    setPhase("chat");
  };

  // Start chat messages
  useEffect(() => {
    if (phase === "chat" && chosenChar && messages.length === 0) {
      const profile = CHARACTER_PROFILES[chosenChar];
      setMessages([
        { role: "host", content: `1v1时间。灯光暗下来，其他人退场。现在只有你和${profile.name}。`, timestamp: getTime() },
        { role: "assistant", content: profile.greeting, timestamp: getTime(), choices: profile.openingChoices },
      ]);
    }
  }, [phase, chosenChar, messages.length]);

  // ==================== EVENT CHOICE ====================
  const handleEventChoice = useCallback(
    async (event: StoryEvent, choiceIndex: number) => {
      if (!chosenChar) return;
      const choice = event.choices[choiceIndex];
      const charHint = event.characterHints[chosenChar] || "";

      const eventMessages = [
        ...messages,
        { role: "event" as const, content: `${event.icon} ${event.title}`, timestamp: getTime() },
        { role: "user" as const, content: choice.text, timestamp: getTime() },
      ];

      setMessages(eventMessages);
      setCurrentEvent(null);
      setPhase("chat");
      setLoading(true);
      setHeartLevel((h) => Math.min(h + choice.heartBonus, 100));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: eventMessages.filter(m => m.role !== "host" && m.role !== "event").map((m) => ({ role: m.role, content: m.content })),
            character: chosenChar,
            context: `${choice.aiContext}\n\n角色提示：${charHint}`,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setMessages((prev) => [...prev, { role: "assistant", content: data.message, timestamp: getTime(), choices: data.choices }]);
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", content: "嗯...网络好像出了点问题", timestamp: getTime() }]);
      } finally {
        setLoading(false);
      }
    },
    [messages, chosenChar]
  );

  // ==================== SEND MESSAGE ====================
  const sendMessage = useCallback(
    async (text: string) => {
      if (!chosenChar) return;
      const userMsg = { role: "user" as const, content: text, timestamp: getTime() };
      const newMessages = [...messages, userMsg];
      const newRound = chatRound + 1;

      const event = STORY_EVENTS.find(e => e.triggerRound === newRound && !triggeredEvents.has(e.id));
      const hostComment = HOST_COMMENTS[newRound];
      if (hostComment && !event) {
        newMessages.push({ role: "host" as const, content: hostComment, timestamp: getTime() });
      }

      setMessages(newMessages);
      setLoading(true);
      setChatRound(newRound);

      let ctx = `【场景：恋爱综艺「心跳信箱」第1期"初见"，1v1破冰聊天环节】\n`;
      if (newRound <= 2) {
        ctx += `你们刚坐下来，有些好奇。气氛轻松但微妙。自然地聊，展现你最有魅力的一面。`;
      } else if (newRound <= 5) {
        ctx += `拘谨消散了，你们之间有了一些默契。话题可以再深一些，偶尔被她的话打动。`;
      } else if (newRound <= 8) {
        ctx += `气氛完全不一样了。你开始在意她说的每一个字。可以有心跳加速的瞬间。`;
      } else {
        ctx += `最后的时间了。情绪升温，说一些之前不会说的话。给她一个会反复想起的瞬间。`;
      }

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.filter(m => m.role !== "host" && m.role !== "event").map((m) => ({ role: m.role, content: m.content })),
            character: chosenChar,
            context: ctx,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const heartGain = newRound <= 3 ? Math.floor(Math.random() * 8) + 5 : newRound <= 6 ? Math.floor(Math.random() * 10) + 8 : Math.floor(Math.random() * 12) + 10;
        setMessages((prev) => [...prev, { role: "assistant", content: data.message, timestamp: getTime(), choices: event ? undefined : data.choices }]);
        setHeartLevel((h) => Math.min(h + heartGain, 100));

        if (event) {
          setTimeout(() => { setTriggeredEvents(prev => new Set([...prev, event.id])); setCurrentEvent(event); setPhase("event"); }, 1500);
        }
        if (newRound >= MAX_ROUNDS && !event) {
          setTimeout(() => {
            const profile = CHARACTER_PROFILES[chosenChar];
            const firstSecret = profile.bio.lines[0];
            setRevealedSecret(`${firstSecret.label}：${firstSecret.value.replace(/█+/g, "???")}`);
            setPhase("ending");
          }, 2500);
        }
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", content: "嗯...网络好像出了点问题", timestamp: getTime() }]);
      } finally {
        setLoading(false);
      }
    },
    [messages, chosenChar, chatRound, triggeredEvents]
  );

  // ==================== RENDER: NARRATION ====================
  if (phase === "narration") {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center px-8">
        <div className="space-y-3 max-w-sm">
          {NARRATION_LINES.slice(0, narrationIndex).map((line, i) => {
            const isCurrent = i === narrationIndex - 1;
            let cn = "text-center transition-all duration-700 ";
            if (line.style === "title") cn += isCurrent ? "text-2xl font-bold text-white tracking-widest opacity-100" : "text-xl font-bold text-gray-500 tracking-widest opacity-40";
            else if (line.style === "divider") cn += "text-gray-600 text-sm opacity-50 py-2";
            else if (line.style === "emphasis") cn += isCurrent ? "text-violet-300 text-base opacity-100 font-medium" : "text-gray-500 text-sm opacity-50";
            else cn += isCurrent ? "text-gray-200 text-base opacity-100" : "text-gray-600 text-sm opacity-40";
            return <p key={i} className={cn}>{line.text}</p>;
          })}
        </div>
        <button onClick={() => setNarrationIndex(NARRATION_LINES.length)} className="absolute bottom-12 text-xs text-gray-600 hover:text-gray-400 transition-colors">
          跳过 →
        </button>
      </div>
    );
  }

  // ==================== RENDER: ENTRANCE ====================
  if (phase === "entrance") {
    const currentStep = scriptStep < entranceScript.length ? entranceScript[scriptStep] : null;
    const isWaitingForChoice = currentStep && currentStep.delay === 0 && currentStep.type === "choice";

    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-950 via-gray-900 to-violet-950 flex flex-col">
        <div className="pt-[calc(2rem+env(safe-area-inset-top))] px-6 pb-2 flex items-center justify-between">
          <button onClick={onBack} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">← 返回</button>
          <span className="text-xs text-violet-300/40">第1期 · 初见</span>
        </div>

        {/* Scrolling narrative feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {visibleSteps.map((step, i) => {
            if (step.type === "divider") {
              return <div key={i} className="text-center text-gray-600 text-sm py-3 animate-fade-slide-up">·</div>;
            }
            if (step.type === "host") {
              return (
                <div key={i} className="animate-fade-slide-up">
                  <p className="text-sm text-violet-300/70 text-center leading-relaxed">{step.text}</p>
                </div>
              );
            }
            if (step.type === "hint") {
              return (
                <div key={i} className="animate-fade-slide-up flex justify-center">
                  <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-2.5 max-w-[90%]">
                    <p className="text-xs text-violet-300/80 text-center italic">{step.text}</p>
                  </div>
                </div>
              );
            }
            if (step.type === "card-reveal" && step.character) {
              const char = CHARACTER_PROFILES[step.character];
              return (
                <div key={i} className="animate-fade-slide-up flex justify-center py-3">
                  <div className="flex items-center gap-3 bg-white/8 border border-white/10 rounded-2xl px-4 py-3 max-w-[85%]">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-white/20">
                      <Image src={char.heroImage} alt={char.name} width={56} height={56} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{char.name}</span>
                        <span className="text-xs text-gray-400">{char.bio.age}岁 · {char.bio.city}</span>
                      </div>
                      <div className="text-xs text-violet-300/60 mt-0.5">{char.tagline}</div>
                    </div>
                  </div>
                </div>
              );
            }
            if (step.type === "action") {
              return (
                <div key={i} className="animate-fade-slide-up">
                  <p className="text-xs text-gray-500 italic text-center">{step.text}</p>
                </div>
              );
            }
            if (step.type === "dialogue" && step.character) {
              const char = CHARACTER_PROFILES[step.character];
              return (
                <div key={i} className="animate-fade-slide-up flex items-start gap-2.5 max-w-[90%]">
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
                    <Image src={char.avatar} alt={char.name} width={28} height={28} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500">{char.name}</span>
                    <p className="text-sm text-gray-200 mt-0.5">{step.text}</p>
                  </div>
                </div>
              );
            }
            if (step.type === "choice") {
              // If we have a choiceResponse, show the resolved state
              if ((step as ScriptStep & { choiceResponse?: string }).choiceResponse) {
                return (
                  <div key={i} className="animate-fade-slide-up">
                    <p className="text-xs text-gray-400 italic text-center leading-relaxed">
                      {(step as ScriptStep & { choiceResponse?: string }).choiceResponse}
                    </p>
                  </div>
                );
              }
              // Otherwise this is the current active choice - rendered below
              return null;
            }
            return null;
          })}
        </div>

        {/* Active choice buttons at bottom */}
        {isWaitingForChoice && currentStep.choices && (
          <div className="px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2 border-t border-white/5 bg-gray-950/80 backdrop-blur animate-fade-slide-up">
            <p className="text-xs text-gray-500 text-center mb-2">你的第一印象——</p>
            {currentStep.choices.map((choice, ci) => (
              <button
                key={ci}
                onClick={() => handleFirstImpressionChoice(ci)}
                className="w-full text-left p-3 rounded-xl bg-white/8 border border-white/10 hover:bg-white/15 hover:border-violet-500/30 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{choice.text}</span>
                  <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{choice.label}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==================== RENDER: SEAT PICK ====================
  if (phase === "seat-pick") {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-950 via-gray-900 to-violet-950 flex flex-col overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
          <div className="max-w-md w-full space-y-5 animate-fade-slide-up">
            <div className="text-center">
              <p className="text-xs text-violet-400/70 mb-2">全部嘉宾已就位</p>
              <h2 className="text-xl font-bold text-white">心动选座</h2>
              <p className="text-sm text-gray-400 mt-2">你想坐在谁旁边？</p>
              <p className="text-xs text-gray-500 mt-1">这是你的第一个信号——她们都在看着你</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {guestOrder.map((key) => {
                const char = CHARACTER_PROFILES[key];
                const isChosen = seatChoice === key;
                const showReaction = seatChoice !== null;

                return (
                  <button
                    key={key}
                    onClick={() => !seatChoice && handleSeatPick(key)}
                    disabled={seatChoice !== null}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                      isChosen
                        ? "bg-violet-500/20 border-2 border-violet-400/50 scale-[1.02]"
                        : showReaction
                          ? "bg-white/5 border border-white/5 opacity-60"
                          : "bg-white/8 border border-white/10 hover:bg-white/15 hover:border-violet-500/30 active:scale-[0.98]"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden ring-1 ring-white/20">
                      <Image src={char.avatar} alt={char.name} width={48} height={48} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-medium text-white text-sm">{char.name}</span>
                    {showReaction && (
                      <p className="text-[11px] text-gray-400 italic text-center leading-snug">
                        {isChosen ? char.seatReaction.chosen : char.seatReaction.notChosen}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== RENDER: GROUP CHAT ====================
  if (phase === "group-chat") {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-950 via-gray-900 to-violet-950 flex flex-col overflow-y-auto">
        <div className="pt-[calc(2rem+env(safe-area-inset-top))] px-6 pb-2">
          <span className="text-xs text-violet-300/40">第1期 · 初见 · 群聊环节</span>
        </div>

        <div className="flex-1 px-6 py-4 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full space-y-5 animate-fade-slide-up">
            {/* Host question */}
            <div className="text-center mb-4">
              <p className="text-sm text-violet-300/70 mb-2">主持人提问</p>
              <p className="text-base text-white font-medium leading-relaxed">
                &ldquo;用一个词形容你对今晚的期待？&rdquo;
              </p>
            </div>

            {/* Each character answers */}
            {(groupChatStep >= 0) && guestOrder.map((key) => {
              const char = CHARACTER_PROFILES[key];
              return (
                <div key={key} className="flex items-start gap-3 animate-fade-slide-up">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
                    <Image src={char.avatar} alt={char.name} width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] text-gray-500">{char.name}</span>
                    <p className="text-sm text-gray-200 mt-0.5">{char.groupChatAnswer}</p>
                  </div>
                </div>
              );
            })}

            {/* User pick: who to follow up with */}
            {groupChatStep < 2 && (
              <div className="pt-3 space-y-2 border-t border-white/5">
                <p className="text-xs text-gray-500 text-center">你想接谁的话？</p>
                <div className="grid grid-cols-3 gap-2">
                  {guestOrder.map((key) => {
                    const char = CHARACTER_PROFILES[key];
                    return (
                      <button
                        key={key}
                        onClick={() => handleGroupChatPick(key)}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-white/8 border border-white/10 hover:bg-white/15 hover:border-violet-500/30 active:scale-[0.98] transition-all"
                      >
                        <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-white/20">
                          <Image src={char.avatar} alt={char.name} width={36} height={36} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs text-white">{char.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Show response after picking */}
            {groupChatStep >= 2 && groupChatTarget && (() => {
              // Show the chosen character's response prominently, plus a couple others
              const targetChar = CHARACTER_PROFILES[groupChatTarget];
              const others = guestOrder.filter(k => k !== groupChatTarget).slice(0, 2);
              return (
              <div className="pt-3 space-y-3 border-t border-white/5 animate-fade-slide-up">
                {/* Chosen character responds */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
                    <Image src={targetChar.avatar} alt={targetChar.name} width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[11px] text-violet-400">{targetChar.name}</span>
                    <p className="text-sm text-gray-200 mt-0.5">{targetChar.groupChatReaction.chosen}</p>
                  </div>
                </div>
                {/* Others react briefly */}
                {others.map((key) => {
                  const char = CHARACTER_PROFILES[key];
                  return (
                    <div key={key} className="flex items-start gap-3 opacity-70">
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
                        <Image src={char.avatar} alt={char.name} width={24} height={24} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500">{char.name}</span>
                        <p className="text-[11px] text-gray-500 italic mt-0.5">{char.groupChatReaction.notChosen}</p>
                      </div>
                    </div>
                  );
                })}

                <div className="text-center pt-4">
                  <button
                    onClick={() => setPhase("solo-pick")}
                    className="text-sm text-violet-400 hover:text-violet-300 transition-colors animate-pulse"
                  >
                    群聊结束，进入1v1环节 →
                  </button>
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  // ==================== RENDER: SOLO PICK ====================
  if (phase === "solo-pick") {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-950 via-gray-900 to-violet-950 flex flex-col overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
          <div className="max-w-md w-full space-y-5 animate-fade-slide-up">
            <div className="text-center">
              <p className="text-xs text-violet-400/70 mb-2">接下来是——1v1时间</p>
              <h2 className="text-xl font-bold text-white">你想和谁单独聊？</h2>
              <p className="text-xs text-gray-500 mt-2">其他人会暂时离开。这段时间，只属于你们两个</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {guestOrder.map((key) => {
                const char = CHARACTER_PROFILES[key];
                return (
                  <button
                    key={key}
                    onClick={() => handleSoloPick(key)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/8 border border-white/10 hover:bg-white/15 hover:border-violet-500/30 active:scale-[0.98] transition-all"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden ring-1 ring-white/20">
                      <Image src={char.heroImage} alt={char.name} width={56} height={56} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-semibold text-white text-sm">{char.name}</span>
                    <div className="text-[11px] text-gray-400">{char.bio.age}岁 · {char.bio.city}</div>
                    <div className="text-[10px] text-gray-500/70 text-center leading-snug">
                      {char.bio.lines[0].label}：{char.bio.lines[0].value}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== RENDER: EVENT ====================
  if (phase === "event" && currentEvent && chosenChar) {
    const profile = CHARACTER_PROFILES[chosenChar];
    return (
      <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 animate-fade-slide-up">
        <div className="max-w-sm w-full space-y-5">
          <div className="text-center">
            <div className="text-4xl mb-3">{currentEvent.icon}</div>
            <p className="text-xs text-violet-400/70 mb-2">{currentEvent.hostLine}</p>
            <h2 className="text-xl font-bold text-white">{currentEvent.title}</h2>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-sm text-gray-300 leading-relaxed">{currentEvent.description}</p>
          </div>
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <Image src={profile.avatar} alt={profile.name} width={32} height={32} className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-gray-400 italic">{profile.name}看了你一眼，好像在等你做决定……</p>
          </div>
          <div className="space-y-2.5">
            {currentEvent.choices.map((choice, ci) => (
              <button key={ci} onClick={() => handleEventChoice(currentEvent, ci)} className="w-full text-left p-4 rounded-xl bg-white/8 border border-white/10 hover:bg-white/15 hover:border-violet-500/30 active:scale-[0.98] transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white group-hover:text-violet-200 transition-colors">{choice.text}</span>
                  <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">{choice.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==================== RENDER: CHAT ====================
  if (phase === "chat" && chosenChar) {
    const profile = CHARACTER_PROFILES[chosenChar];
    return (
      <div className={`flex flex-col h-[100dvh] bg-gradient-to-b ${profile.bgColor}`}>
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden shadow-md ring-2 ring-white">
                <Image src={profile.avatar} alt={profile.name} width={36} height={36} className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-gray-800">{profile.name}</h1>
                <p className="text-[11px] text-violet-500">第1期 · 初见 · 1v1</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-gray-400">{chatRound}/{MAX_ROUNDS}轮</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[11px] text-rose-400">♥</span>
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500" style={{ width: `${heartLevel}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="h-0.5 bg-gray-100">
            <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${(chatRound / MAX_ROUNDS) * 100}%` }} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="flex justify-center mb-4">
            <span className="text-[11px] text-gray-400 bg-gray-100/80 px-3 py-1 rounded-full">1v1 破冰聊天</span>
          </div>

          {messages.map((msg, i) => {
            if (msg.role === "host") return (
              <div key={i} className="flex justify-center my-4 animate-fade-slide-up">
                <div className="bg-violet-50/80 border border-violet-200/50 rounded-2xl px-4 py-2.5 max-w-[85%]">
                  <p className="text-xs text-violet-500/80 text-center leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
            if (msg.role === "event") return (
              <div key={i} className="flex justify-center my-4 animate-fade-slide-up">
                <div className="bg-amber-50/80 border border-amber-200/50 rounded-2xl px-4 py-2 max-w-[85%]">
                  <p className="text-xs text-amber-600/80 text-center font-medium">{msg.content}</p>
                </div>
              </div>
            );
            return (
              <div key={i}>
                <ChatBubble role={msg.role as "user" | "assistant"} content={msg.content} timestamp={msg.timestamp} avatar={profile.avatar} accentColor={profile.accentColor} />
                {msg.role === "assistant" && msg.choices && i === messages.length - 1 && !loading && chatRound < MAX_ROUNDS && (
                  <div className="flex flex-wrap gap-2 ml-11 mt-2 mb-2 animate-fade-slide-up">
                    {msg.choices.map((choice, ci) => (
                      <button key={ci} onClick={() => sendMessage(choice)} className="text-[13px] px-3.5 py-2 rounded-full bg-white/90 border border-gray-200 text-gray-700 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 active:scale-95 transition-all shadow-sm">
                        {choice}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {loading && <TypingIndicator avatar={profile.avatar} />}
          <div ref={chatEndRef} />
        </div>
        {chatRound < MAX_ROUNDS && <ChatInput onSend={sendMessage} disabled={loading} />}
      </div>
    );
  }

  // ==================== RENDER: ENDING ====================
  if (phase === "ending" && chosenChar) {
    const profile = CHARACTER_PROFILES[chosenChar];
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center px-6 overflow-y-auto">
        <div className="max-w-sm w-full text-center space-y-6 animate-fade-slide-up py-12">
          <div className="text-violet-300/50 text-xs">第1期 · 初见</div>
          <h2 className="text-2xl font-bold text-white">初见结束</h2>
          <p className="text-sm text-gray-400 italic leading-relaxed">&ldquo;有些心动，是从第一句话就开始的。<br/>而有些秘密，要到下一期才会揭晓。&rdquo;</p>

          <div className="bg-white/10 rounded-2xl p-5 border border-white/10">
            <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg ring-2 ring-white/20 mx-auto mb-3">
              <Image src={profile.heroImage} alt={profile.name} width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <div className="text-white font-semibold">{profile.name}</div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-rose-400">♥</span>
              <span className="text-rose-300 text-lg font-bold">{heartLevel}%</span>
              <span className="text-gray-500 text-sm">好感度</span>
            </div>
            {heartLevel >= 70 && <p className="text-xs text-rose-300/60 mt-2">她走出房间之后回头看了你一眼</p>}
            {heartLevel >= 40 && heartLevel < 70 && <p className="text-xs text-gray-400 mt-2">你们之间有了一些微妙的默契</p>}
            {heartLevel < 40 && <p className="text-xs text-gray-500 mt-2">才刚开始，一切都还有可能</p>}
          </div>

          <div className="bg-violet-500/10 rounded-2xl p-4 border border-violet-500/20">
            <div className="text-xs text-violet-400 mb-2">解锁了一条信息</div>
            <div className="text-sm text-violet-200">{revealedSecret}</div>
          </div>

          {triggeredEvents.size > 0 && (
            <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20">
              <div className="text-xs text-amber-400 mb-2">本期经历了 {triggeredEvents.size} 个特别时刻</div>
              <div className="flex justify-center gap-3">
                {STORY_EVENTS.filter(e => triggeredEvents.has(e.id)).map(e => (
                  <span key={e.id} className="text-sm text-amber-200/80">{e.icon} {e.title}</span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="text-xs text-gray-500 mb-1">下期预告</div>
            <div className="text-sm text-gray-300">第2期「心动信号」—— 开发中，敬请期待</div>
          </div>

          <div className="space-y-3 pt-2">
            <button onClick={() => onComplete(chosenChar)} className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium hover:shadow-lg active:scale-[0.98] transition-all">
              继续和{profile.name}自由聊天
            </button>
            <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">返回主页</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
