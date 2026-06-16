# -*- coding: utf-8 -*-
"""공식 비즈니스 + 강의/발표 문장 100개 일괄 등록 (1회성 시드).

직접 작성한 빈출 표현을 data/sentences.json 에 추가하고(중복 제거),
다국 악센트 오디오(보통+느린)를 12개 id씩 나눠 생성한다.
중복/기존 오디오는 자동으로 건너뛰므로 중단 후 재실행해도 안전하다.

실행:
  python app/seed_formal100.py            # 등록 + 오디오
  python app/seed_formal100.py --no-audio # 등록만
"""
import argparse
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "sentences.json"
GEN_SCRIPT = ROOT / ".claude" / "skills" / "multi-accent-audio" / "scripts" / "generate_audio.py"

# (en, ko, pattern, notes, scenario, tags)  -- notes 안에서 영어는 작은따옴표로 인용
SENTENCES = [
    # ── 미팅 진행/격식 (meeting) ──
    ("Let's get started — thanks everyone for joining on short notice.", "시작하죠 — 급한데도 참석해 주셔서 감사합니다.", "Let's get started — thanks for ~.", "'Let's get'은 t가 겹쳐 <b>렛츠겟</b>으로 붙고, 'joining on'은 연음돼 <b>조이닝온</b>으로 이어집니다.", "meeting", ["meeting", "opening"]),
    ("Before we dive in, let me quickly go over the agenda.", "본격적으로 들어가기 전에 안건을 빠르게 짚겠습니다.", "Before we dive in, let me ~.", "'dive in'은 <b>다이빈</b>으로 붙고, 'go over the'는 약형 the가 뭉개져 <b>고우오버더</b>로 들립니다.", "meeting", ["meeting", "agenda"]),
    ("Let's keep this brief so we can wrap up on time.", "제시간에 끝낼 수 있게 간단히 가죠.", "Let's keep this ~ so we can ...", "'wrap up on'은 이어져 <b>래뻐뽄</b>처럼 한 덩어리로 들립니다.", "meeting", ["meeting", "time"]),
    ("Can everyone see my screen okay?", "다들 화면 잘 보이세요?", "Can everyone ~ okay?", "'see my'는 <b>씨마이</b>, 끝의 'okay'는 억양이 올라가 확인 질문 신호입니다.", "meeting", ["meeting", "remote"]),
    ("I want to make sure everyone's on the same page.", "모두가 같은 이해를 갖고 있는지 확인하고 싶어요.", "I want to make sure ~.", "'want to'는 <b>워너</b>, 'everyone's on'은 <b>에브리원즈온</b>으로 붙습니다.", "meeting", ["meeting", "align"]),
    ("Let's park that for now and come back to it later.", "그건 일단 보류하고 나중에 다시 다루죠.", "Let's park that for now ~.", "'park that'의 끝 t가 약화돼 <b>파-크댓</b>, 'come back to it'은 <b>컴백투잇</b>으로 이어집니다.", "meeting", ["meeting", "parking"]),
    ("In the interest of time, let's move on to the next point.", "시간 관계상 다음 항목으로 넘어가죠.", "In the interest of time, let's ~.", "'interest of'는 <b>인터레스떠브</b>, 'move on to'는 <b>무본투</b>로 붙습니다.", "meeting", ["meeting", "time"]),
    ("Let's hold all questions until the end.", "질문은 끝까지 모아서 받겠습니다.", "Let's hold all questions until ~.", "'hold all'은 연음돼 <b>홀돌</b>로 들립니다.", "meeting", ["meeting", "qa"]),
    ("Can we take this offline and discuss separately?", "이건 따로 빼서 별도로 논의할까요?", "Can we take this offline ~?", "'take this offline'은 <b>테익디스오프라인</b>으로 이어집니다.", "meeting", ["meeting", "defer"]),
    ("Let's give it five more minutes, then we'll decide.", "5분만 더 두고 그다음 결정하죠.", "Let's give it ~ more minutes, then ...", "'give it five'는 <b>기빗파이브</b>로 t가 약화됩니다.", "meeting", ["meeting", "time"]),

    # ── 보고/업데이트 (internal-update) ──
    ("Here's a quick update on where we are.", "현재 상황을 간단히 업데이트드리겠습니다.", "Here's a quick update on ~.", "'Here's a'는 <b>히어저</b>, 'update on'은 t가 flap이 되어 <b>업데이론</b>으로 들립니다.", "internal-update", ["update", "status"]),
    ("We're currently on track to hit the milestone.", "현재 마일스톤 달성에 차질 없이 가고 있습니다.", "We're on track to ~.", "'on track to'는 <b>온트랙투</b>, 'hit the'는 약형이라 <b>힛더</b>로 뭉갭니다.", "internal-update", ["status", "milestone"]),
    ("We've run into a bit of a delay on the supplier side.", "공급업체 쪽에서 약간의 지연이 생겼습니다.", "We've run into ~.", "'run into a'는 줄줄이 붙어 <b>러닌투어</b>로 들립니다.", "internal-update", ["status", "risk"]),
    ("Just to flag a potential risk going forward.", "앞으로의 잠재 리스크 하나만 짚어두자면.", "Just to flag ~.", "'Just to'는 <b>저스투</b>, 'going forward'는 <b>고잉포워드</b>로 가볍게 흘러갑니다.", "internal-update", ["risk", "flag"]),
    ("The headline is, we're two weeks behind but recoverable.", "핵심은, 2주 늦었지만 회복 가능하다는 겁니다.", "The headline is, ~.", "'behind but'은 d가 약화돼 <b>비하인벗</b>으로 들립니다.", "internal-update", ["status", "summary"]),
    ("Let me give you the high-level summary first.", "먼저 큰 그림부터 요약해 드릴게요.", "Let me give you the ~ first.", "'give you the'는 <b>기뷰더</b>로 붙습니다.", "internal-update", ["summary"]),
    ("Nothing's blocking us at the moment.", "현재로선 막힌 건 없습니다.", "Nothing's blocking ~.", "'at the moment'는 끝 t가 약해 <b>앳더모먼(트)</b>로 들립니다.", "internal-update", ["status"]),
    ("I'll circle back with the details by end of day.", "세부사항은 오늘 중으로 다시 공유드리겠습니다.", "I'll circle back with ~ by ...", "'circle back'은 <b>써-클백</b>, 'end of day'는 연음돼 <b>엔더브데이</b>로 들립니다.", "internal-update", ["followup"]),

    # ── 데이터/결과 설명 (presentation) ──
    ("As you can see from this slide, the trend is clear.", "이 슬라이드에서 보시다시피, 추세가 분명합니다.", "As you can see from ~.", "'As you'는 <b>애쥬</b>, 'see from this'는 <b>씨프럼디스</b>로 이어집니다.", "presentation", ["data", "slide"]),
    ("Let me walk you through the numbers one by one.", "수치를 하나씩 짚어드리겠습니다.", "Let me walk you through ~.", "'walk you through'는 붙어서 <b>워큐쓰루</b>로 들립니다.", "presentation", ["data", "explain"]),
    ("If you look at the chart on the right, you'll notice a spike.", "오른쪽 차트를 보시면 급등이 눈에 띌 겁니다.", "If you look at ~, you'll notice ...", "'look at the'는 flap t로 <b>루깯더</b>로 들립니다.", "presentation", ["data", "chart"]),
    ("These results are statistically significant.", "이 결과는 통계적으로 유의합니다.", "These results are ~.", "'results are'는 이어져 <b>리절츠아</b>로 들립니다.", "presentation", ["data", "stats"]),
    ("The data suggests a strong correlation here.", "데이터는 여기서 강한 상관관계를 시사합니다.", "The data suggests ~.", "미국식 'data'는 flap t라 <b>데이러</b>, 'suggests a'는 <b>써제스처</b>로 붙습니다.", "presentation", ["data", "finding"]),
    ("Let me zoom in on this part for a second.", "이 부분을 잠깐 확대해서 보겠습니다.", "Let me zoom in on ~.", "'zoom in on'은 <b>주미논</b>으로 한 덩어리가 됩니다.", "presentation", ["data", "focus"]),
    ("To put this in perspective, that's a tenfold increase.", "감을 잡으시도록 말씀드리면, 그건 열 배 증가입니다.", "To put this in perspective, ~.", "'put this in'은 <b>풋디씬</b>으로 이어집니다.", "presentation", ["data", "context"]),
    ("The bottom line is, the approach works.", "결론은, 이 접근이 통한다는 겁니다.", "The bottom line is, ~.", "'bottom line'은 flap t로 <b>바럼라인</b>으로 들립니다.", "presentation", ["conclusion"]),
    ("I'd like to draw your attention to the red line.", "빨간 선에 주목해 주시기 바랍니다.", "I'd like to draw your attention to ~.", "'draw your'는 <b>드로유어</b>, 'attention to'는 <b>어텐션투</b>로 붙습니다.", "presentation", ["data", "focus"]),
    ("Let's break this down into three parts.", "이걸 세 부분으로 나눠서 보겠습니다.", "Let's break this down into ~.", "'break this down'은 <b>브레익디스다운</b>으로 이어집니다.", "presentation", ["structure"]),

    # ── 의견/동의·반대 (general) ──
    ("I see your point, but I'd push back on one thing.", "말씀 이해는 가는데, 한 가지는 반론하고 싶어요.", "I see your point, but I'd push back on ~.", "'see your'는 <b>씨유어</b>, 'push back on'은 <b>푸쉬배껀</b>으로 이어집니다.", "general", ["opinion", "disagree"]),
    ("That's a fair point — I hadn't considered that.", "일리 있는 지적이네요 — 그건 미처 생각 못 했어요.", "That's a fair point — ~.", "'hadn't considered'는 <b>해든컨씨더(드)</b>로 t가 약화됩니다.", "general", ["opinion", "agree"]),
    ("I'm inclined to agree, with one caveat.", "동의하는 쪽인데, 한 가지 단서가 있어요.", "I'm inclined to ~, with one caveat.", "'inclined to'는 <b>인클라인투</b>로 붙습니다.", "general", ["opinion"]),
    ("Let me play devil's advocate for a moment.", "잠깐 반대편 입장에서 말해볼게요.", "Let me play devil's advocate ~.", "'devil's advocate'는 <b>데블즈애드버킷</b>으로 들립니다.", "general", ["opinion", "challenge"]),
    ("I'd rather we held off until we have more data.", "데이터가 더 모일 때까지 보류하는 게 좋겠어요.", "I'd rather we ~ until ...", "'held off until'은 연음돼 <b>헬도프언틸</b>로 들립니다.", "general", ["opinion", "caution"]),
    ("Honestly, I have some reservations about that.", "솔직히 그 부분은 좀 망설여집니다.", "I have some reservations about ~.", "'reservations about'은 <b>레저베이션스어바웃</b>으로 이어집니다.", "general", ["opinion", "concern"]),
    ("Correct me if I'm wrong, but isn't that a bit risky?", "제가 틀렸으면 정정해 주세요, 근데 그거 좀 위험하지 않나요?", "Correct me if I'm wrong, but ~?", "'Correct me'는 <b>커렉미</b>, 'isn't that'는 <b>이즌댓</b>으로 붙습니다.", "general", ["opinion", "challenge"]),
    ("I'm fully on board with that direction.", "그 방향에 전적으로 동의합니다.", "I'm fully on board with ~.", "'on board with'는 <b>온보-드위(드)</b>로 들립니다.", "general", ["agree"]),
    ("Let's agree to disagree on that one.", "그건 서로 의견이 다른 걸로 하죠.", "Let's agree to disagree on ~.", "'agree to'는 <b>어그리투</b>로 붙습니다.", "general", ["opinion"]),

    # ── 명확화/확인 (survival) ──
    ("Sorry, I didn't quite catch that — could you repeat it?", "죄송해요, 잘 못 들었는데 다시 말씀해 주시겠어요?", "I didn't quite catch ~.", "'didn't quite catch'는 t들이 약화돼 <b>디든콰잇캐치</b>로 뭉갭니다.", "survival", ["clarify", "survival"]),
    ("Just so I understand, are you saying we should wait?", "제가 정확히 이해하려고요, 기다려야 한다는 말씀이세요?", "Just so I understand, ~?", "'Just so I'는 <b>저쏘아이</b>로 빠르게 붙습니다.", "survival", ["clarify", "confirm"]),
    ("Could you spell that out for me?", "좀 더 풀어서 설명해 주시겠어요?", "Could you spell that out ~?", "'spell that out'은 flap t로 <b>스펠대라웃</b>으로 들립니다.", "survival", ["clarify"]),
    ("When you say 'soon', what timeframe are we talking about?", "'곧'이라고 하시면, 어느 정도 기간을 말씀하시는 거죠?", "When you say '~', what ... are we talking about?", "'what timeframe'은 <b>왓타임프레임</b>으로 붙습니다.", "survival", ["clarify", "timeline"]),
    ("Let me repeat that back to make sure I've got it.", "제대로 이해했는지 다시 한번 정리해 볼게요.", "Let me repeat that back ~.", "'repeat that back'은 <b>리핏댓백</b>으로 이어집니다.", "survival", ["confirm"]),
    ("Do you mean the first option or the second?", "첫 번째 안을 말씀하시는 건가요, 두 번째인가요?", "Do you mean ~ or ...?", "'Do you'는 <b>두유</b>, 선택 의문문이라 first에서 올라갔다 second에서 내려갑니다.", "survival", ["clarify"]),
    ("Sorry to interrupt, but can I jump in here?", "끊어서 죄송한데, 잠깐 끼어들어도 될까요?", "Sorry to interrupt, but can I ~?", "'jump in here'는 <b>점핀히어</b>로 붙습니다.", "survival", ["meeting", "interject"]),
    ("Bear with me while I pull up the file.", "파일 여는 동안 잠시만 기다려 주세요.", "Bear with me while I ~.", "'Bear with me'는 <b>베어위드미</b>, 'pull up the'는 <b>풀럽더</b>로 이어집니다.", "survival", ["stall"]),

    # ── 협상/제안 (cro-negotiation) ──
    ("Would it be possible to move the deadline up a week?", "마감을 일주일 당기는 게 가능할까요?", "Would it be possible to ~?", "'Would it be'는 <b>우딧비</b>, 'move the deadline up'은 <b>무브더데드라이넙</b>으로 이어집니다.", "cro-negotiation", ["negotiation", "schedule"]),
    ("Let's find a middle ground that works for both sides.", "양쪽 모두에게 맞는 절충점을 찾아보죠.", "Let's find a middle ground ~.", "'middle ground'는 <b>미들그라운(드)</b>, 'works for'는 <b>웍스퍼</b>로 들립니다.", "cro-negotiation", ["negotiation"]),
    ("I can offer a little flexibility on price, not on timing.", "가격은 조금 양보할 수 있지만 일정은 어렵습니다.", "I can offer flexibility on ~, not on ...", "'offer a little'은 <b>오퍼럴리를</b>로 붙습니다.", "cro-negotiation", ["negotiation", "concession"]),
    ("What would it take to get this over the line?", "이걸 마무리 짓는 데 뭐가 필요할까요?", "What would it take to ~?", "'What would it take'는 <b>왓우딧테익</b>으로 한 덩어리가 됩니다.", "cro-negotiation", ["negotiation", "close"]),
    ("Let's table the pricing discussion until next week.", "가격 논의는 다음 주로 미루죠.", "Let's table ~ until ...", "'table the'는 <b>테이블더</b>로 약형 the가 붙습니다.", "cro-negotiation", ["negotiation", "defer"]),
    ("If we commit to a larger volume, can you do better on the rate?", "물량을 더 늘리면 단가를 더 낮춰 주실 수 있나요?", "If we ~, can you do better on ...?", "'do better on'은 flap t로 <b>두베러론</b>으로 들립니다.", "cro-negotiation", ["negotiation", "price"]),
    ("That works on our end.", "저희 쪽은 그걸로 괜찮습니다.", "That works on ~ end.", "'works on our'는 <b>웍썬아워</b>로 이어집니다.", "cro-negotiation", ["agree"]),
    ("Let's put that in writing to avoid any confusion.", "혼선 방지를 위해 그건 문서로 남기죠.", "Let's put that in writing ~.", "'put that in'은 flap t로 <b>풋대린</b>으로 들립니다.", "cro-negotiation", ["negotiation", "document"]),

    # ── 일정/로지스틱스 (general) ──
    ("Does Thursday afternoon work for everyone?", "목요일 오후에 다들 괜찮으세요?", "Does ~ work for everyone?", "'work for'는 <b>웍퍼</b>로 약하게 붙습니다.", "general", ["schedule"]),
    ("Let's pencil in a follow-up for next Tuesday.", "다음 주 화요일에 후속 미팅을 임시로 잡아두죠.", "Let's pencil in ~.", "'pencil in'은 <b>펜슬린</b>으로 이어집니다.", "general", ["schedule"]),
    ("I'll send out a calendar invite shortly.", "곧 캘린더 초대를 보내드리겠습니다.", "I'll send out ~ shortly.", "'send out a'는 flap t로 <b>센다우러</b>로 들립니다.", "general", ["schedule", "email"]),
    ("Can we push our call to later in the week?", "통화를 이번 주 후반으로 미룰 수 있을까요?", "Can we push ~ to ...?", "'push our'는 <b>푸쉬아워</b>로 붙습니다.", "general", ["schedule"]),
    ("Let's aim to wrap by half past.", "30분까지는 마무리하는 걸로 하죠.", "Let's aim to ~ by ...", "'wrap by'는 <b>랩바이</b>, 'half past'는 l 묵음으로 <b>해프패스(트)</b>로 들립니다.", "general", ["time"]),
    ("I'm double-booked, so let me get back to you.", "일정이 겹쳐서, 다시 연락드릴게요.", "I'm double-booked, so ~.", "'get back to you'는 <b>겟백투유</b>로 이어집니다.", "general", ["schedule"]),

    # ── 강의/발표 도입·전환 (presentation) ──
    ("Thank you all for coming — today I'll be talking about reproducibility.", "와 주셔서 감사합니다 — 오늘은 재현성에 대해 말씀드리겠습니다.", "Today I'll be talking about ~.", "'talking about'은 <b>토킹어바웃</b>으로 약형이 붙습니다.", "presentation", ["lecture", "intro"]),
    ("I'll structure my talk around three main questions.", "제 발표는 세 가지 핵심 질문을 중심으로 구성됩니다.", "I'll structure my talk around ~.", "'structure my'는 <b>스트럭처마이</b>로 이어집니다.", "presentation", ["lecture", "structure"]),
    ("By the end of this session, you'll be able to apply it yourself.", "이 세션이 끝날 때쯤이면 직접 적용하실 수 있게 됩니다.", "By the end of this session, you'll ~.", "'end of this'는 <b>엔더브디스</b>로 연음됩니다.", "presentation", ["lecture", "objective"]),
    ("Let me start with a bit of background.", "먼저 약간의 배경부터 말씀드리겠습니다.", "Let me start with ~.", "'start with a'는 <b>스타-위더</b>로 붙습니다.", "presentation", ["lecture", "intro"]),
    ("That brings me to my next point.", "그러면 다음 요점으로 넘어갑니다.", "That brings me to ~.", "'brings me to'는 <b>브링즈미투</b>로 이어집니다.", "presentation", ["lecture", "transition"]),
    ("Now, let's turn our attention to the results.", "이제 결과로 눈을 돌려보죠.", "Now, let's turn our attention to ~.", "'turn our attention'은 <b>터-나워어텐션</b>으로 연음됩니다.", "presentation", ["lecture", "transition"]),
    ("With that in mind, let's look at the implications.", "그 점을 염두에 두고 함의를 살펴보죠.", "With that in mind, let's ~.", "'that in mind'는 <b>대린마인(드)</b>로 붙습니다.", "presentation", ["lecture", "transition"]),
    ("So far, we've covered two of the three topics.", "지금까지 세 주제 중 두 개를 다뤘습니다.", "So far, we've covered ~.", "'we've covered'는 <b>위브커버드</b>로 이어집니다.", "presentation", ["lecture", "recap"]),
    ("Let me recap the key takeaways before we move on.", "넘어가기 전에 핵심 요점을 정리하겠습니다.", "Let me recap ~ before we move on.", "'takeaways'는 <b>테이꺼웨이즈</b>로 들립니다.", "presentation", ["lecture", "recap"]),
    ("Let's circle back to the question I raised earlier.", "앞서 제기한 질문으로 다시 돌아가 보죠.", "Let's circle back to ~.", "'circle back to'는 <b>써클백투</b>로 이어집니다.", "presentation", ["lecture", "transition"]),

    # ── 강의 설명·강조·예시 (presentation) ──
    ("In other words, the simpler the model, the better.", "다시 말해, 모델이 단순할수록 좋습니다.", "In other words, ~.", "'In other words'는 <b>이나더워-즈</b>로 붙습니다.", "presentation", ["lecture", "explain"]),
    ("Let me give you a concrete example.", "구체적인 예를 하나 들어보겠습니다.", "Let me give you a ~ example.", "'give you a'는 <b>기뷰어</b>로 이어집니다.", "presentation", ["lecture", "example"]),
    ("The key thing to remember here is consistency.", "여기서 기억하실 핵심은 일관성입니다.", "The key thing to remember is ~.", "'thing to remember'는 <b>씽투리멤버</b>로 붙습니다.", "presentation", ["lecture", "emphasis"]),
    ("This is where it gets interesting.", "바로 여기서부터 흥미로워집니다.", "This is where ~.", "'where it gets'는 <b>웨어릿겟츠</b>로 이어집니다.", "presentation", ["lecture", "emphasis"]),
    ("To illustrate, imagine you're running an assay.", "예를 들자면, 어세이를 돌리고 있다고 상상해 보세요.", "To illustrate, imagine ~.", "'To illustrate'는 <b>투일러스트레잇</b>으로 들립니다.", "presentation", ["lecture", "example"]),
    ("It's worth emphasizing that timing matters here.", "여기선 타이밍이 중요하다는 점을 강조하고 싶습니다.", "It's worth emphasizing that ~.", "'worth emphasizing'은 <b>워-쓰엠퍼사이징</b>으로 이어집니다.", "presentation", ["lecture", "emphasis"]),
    ("Think of it as a filter, not a wall.", "그걸 벽이 아니라 필터라고 생각해 보세요.", "Think of it as ~, not ...", "'Think of it as'는 <b>씽꺼빗애즈</b>로 붙습니다.", "presentation", ["lecture", "analogy"]),
    ("Notice how the curve flattens out toward the end.", "끝으로 갈수록 곡선이 평평해지는 것에 주목하세요.", "Notice how ~.", "'flattens out'은 <b>플래튼즈아웃</b>으로 이어집니다.", "presentation", ["lecture", "data"]),
    ("The takeaway here is simple but important.", "여기서의 교훈은 단순하지만 중요합니다.", "The takeaway here is ~.", "'takeaway here'는 <b>테이꺼웨이히어</b>로 붙습니다.", "presentation", ["lecture", "summary"]),

    # ── 발표 Q&A 대응 (presentation) ──
    ("That's a great question — let me address that.", "아주 좋은 질문이네요 — 답변드리겠습니다.", "That's a great question — let me ~.", "'That's a great'는 <b>대쩌그레잇</b>으로 붙습니다.", "presentation", ["qa"]),
    ("I'll come back to that point in a moment, if that's okay.", "괜찮으시면 그 부분은 잠시 후에 다시 다루겠습니다.", "I'll come back to ~ in a moment.", "'come back to that'은 <b>컴백투댓</b>으로 이어집니다.", "presentation", ["qa", "defer"]),
    ("If I understand your question correctly, you're asking about cost.", "질문을 제대로 이해했다면, 비용에 관한 거시죠.", "If I understand your question correctly, ~.", "'understand your'는 <b>언더스탠쥬어</b>로 붙습니다.", "presentation", ["qa", "clarify"]),
    ("That's outside the scope of today's talk, but happy to discuss after.", "그건 오늘 발표 범위 밖이지만, 끝나고 기꺼이 논의하겠습니다.", "That's outside the scope of ~, but ...", "'outside the scope'는 <b>아웃싸이더스코웁</b>으로 이어집니다.", "presentation", ["qa", "scope"]),
    ("Does that answer your question?", "답변이 되었을까요?", "Does that answer ~?", "'answer your'는 <b>앤써유어</b>로 붙습니다.", "presentation", ["qa", "confirm"]),
    ("I don't have those numbers offhand, but I'll follow up.", "그 수치는 지금 바로는 없지만, 따로 알려드리겠습니다.", "I don't have ~ offhand, but I'll follow up.", "'offhand'는 <b>오프핸(드)</b>, 'follow up'은 <b>팔로우업</b>으로 들립니다.", "presentation", ["qa", "followup"]),
    ("Let me open it up to questions.", "이제 질문을 받겠습니다.", "Let me open it up to ~.", "'open it up'은 <b>오프닛업</b>으로 이어집니다.", "presentation", ["qa"]),
    ("Feel free to jump in if anything's unclear.", "이해 안 되는 게 있으면 언제든 끼어드세요.", "Feel free to ~ if ...", "'Feel free to'는 <b>필프리투</b>로 붙습니다.", "presentation", ["qa", "invite"]),

    # ── 마무리/다음 단계 (general) ──
    ("To sum up, we're on track and the risks are manageable.", "정리하자면, 일정은 순조롭고 리스크는 관리 가능합니다.", "To sum up, ~.", "'sum up'은 <b>써멉</b>으로 붙습니다.", "general", ["closing", "summary"]),
    ("Let's recap the action items before we close.", "끝내기 전에 실행 항목을 정리하죠.", "Let's recap the action items ~.", "'action items'는 flap t로 <b>액션아이럼즈</b>로 들립니다.", "general", ["closing", "actions"]),
    ("I'll take the lead on this and report back.", "이 건은 제가 주도해서 다시 보고드리겠습니다.", "I'll take the lead on ~.", "'take the lead on'은 <b>테익더리던</b>으로 이어집니다.", "general", ["closing", "ownership"]),
    ("Let's touch base again early next week.", "다음 주 초에 다시 한번 상황을 맞춰보죠.", "Let's touch base ~.", "'touch base'는 <b>터치베이스</b>로 붙습니다.", "general", ["closing", "followup"]),
    ("Thanks everyone — I think that's a good place to stop.", "다들 감사합니다 — 여기서 마치면 좋겠네요.", "I think that's a good place to ~.", "'good place to'는 <b>굿플레이스투</b>로 이어집니다.", "general", ["closing"]),
    ("I'll send out the minutes by tomorrow morning.", "회의록은 내일 아침까지 보내드리겠습니다.", "I'll send out ~ by ...", "'send out the'는 <b>센다웃더</b>로 붙습니다.", "general", ["closing", "email"]),
    ("Let's make sure we follow through on this.", "이 건은 끝까지 챙기도록 하죠.", "Let's make sure we follow through on ~.", "'follow through on'은 <b>팔로우쓰루온</b>으로 이어집니다.", "general", ["closing", "actions"]),

    # ── 이메일/격식 (general) ──
    ("Just following up on my last email.", "지난 이메일 관련해서 다시 연락드립니다.", "Just following up on ~.", "'following up on'은 <b>팔로잉어뽄</b>으로 이어집니다.", "general", ["email", "followup"]),
    ("Please find the attached report for your review.", "검토하실 수 있도록 보고서를 첨부합니다.", "Please find the attached ~.", "'attached'는 끝 t가 약해 <b>어태치(트)</b>로 들립니다.", "general", ["email", "formal"]),
    ("I wanted to give you a heads-up about the change.", "변경 사항에 대해 미리 알려드리고 싶었어요.", "I wanted to give you a heads-up about ~.", "'give you a heads-up'은 <b>기뷰어헤접</b>으로 붙습니다.", "general", ["email", "notice"]),
    ("Let me know if that works for you.", "그게 괜찮으신지 알려주세요.", "Let me know if ~.", "'Let me know'는 <b>렘미노우</b>로 t가 사라집니다.", "general", ["email", "closing"]),
    ("Apologies for the short notice on this.", "촉박하게 알려드려 죄송합니다.", "Apologies for ~.", "'Apologies for'는 <b>어팔러지스퍼</b>로 이어집니다.", "general", ["email", "apology"]),
    ("I'll keep you posted as things develop.", "진행되는 대로 계속 알려드리겠습니다.", "I'll keep you posted ~.", "'keep you posted'는 <b>키쀼포스티(드)</b>로 붙습니다.", "general", ["email", "followup"]),
]


def gen_audio(ids: list) -> None:
    for i in range(0, len(ids), 12):
        chunk = ids[i:i + 12]
        for rate in ("+0%", "-15%"):
            try:
                subprocess.run(
                    [sys.executable, str(GEN_SCRIPT), "--batch", str(DB_PATH),
                     "--ids", ",".join(chunk), "--rate=" + rate, "--out", str(ROOT / "audio")],
                    cwd=str(ROOT), timeout=300,
                )
            except Exception as e:  # noqa: BLE001
                print(f"오디오 생성 실패(ids={chunk}, rate={rate}): {e}", file=sys.stderr)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-audio", action="store_true")
    args = ap.parse_args()

    db = json.loads(DB_PATH.read_text(encoding="utf-8"))
    existing_lower = {s["en"].lower() for s in db["sentences"]}
    max_n = max((int(s["id"][1:]) for s in db["sentences"]), default=0)

    new_ids, skipped = [], 0
    for en, ko, pattern, notes, scenario, tags in SENTENCES:
        en = " ".join(en.split())
        if en.lower() in existing_lower:
            skipped += 1
            continue
        max_n += 1
        sid = "s" + str(max_n).zfill(3)
        db["sentences"].append({
            "id": sid, "en": en, "ko": ko, "pattern": pattern, "notes": notes,
            "scenario": scenario, "tags": tags[:3],
            "added": date.today().isoformat(),
            "srs": {"box": 1, "next_review": date.today().isoformat(), "last_result": None},
            "listening": {"attempts": 0, "correct": 0, "missed_words": [], "weak_accents": []},
        })
        existing_lower.add(en.lower())
        new_ids.append(sid)

    if new_ids:
        DB_PATH.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"등록 {len(new_ids)}개 (중복 건너뜀 {skipped}개). ids: {new_ids[0] if new_ids else '-'}~{new_ids[-1] if new_ids else '-'}")

    if new_ids and not args.no_audio:
        print("오디오 생성 중... (4음성 x 2속도)")
        gen_audio(new_ids)
        print("오디오 생성 완료")
    return 0


if __name__ == "__main__":
    sys.exit(main())
