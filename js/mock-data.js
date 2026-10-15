// 프로토타입용 목업 데이터 (실제 data.json / 구글 시트에서 일부 발췌)
window.MOCK = window.MOCK || {};
// 영작·단어는 loadContent()가 data/*.json 에서 채운다
MOCK.orderPackages = [];
MOCK.wordQuizzes = [];

// 빈칸 학습: 구글 시트 '표현' 탭 발췌.
// cloze 는 명세서 4.3절의 '빈칸 예문' 포맷 — {중괄호} 부분이 빈칸이 된다.
MOCK.blankItems = [
 { id: "EX-S01E01-01", season: "S01", ep: "E01", expr: "go out with", meaning: "~와 사귀다, 데이트하다", level: "초급", cloze: "I'm {going out with} Jake this Friday." },
 { id: "EX-S01E01-02", season: "S01", ep: "E01", expr: "go through", meaning: "(어려운 일을) 겪다", level: "중급", cloze: "She {went through} a tough year at work." },
 { id: "EX-S01E01-03", season: "S01", ep: "E01", expr: "freak out", meaning: "당황해서 어쩔 줄 모르다", level: "중급", cloze: "Don't {freak out}, it's just a small spider." },
 { id: "EX-S01E01-04", season: "S01", ep: "E01", expr: "hang out", meaning: "어울리다, 같이 시간을 보내다", level: "초급", cloze: "Let's {hang out} at my place this weekend." },
 { id: "EX-S01E01-05", season: "S01", ep: "E01", expr: "out loud", meaning: "소리 내어, 말로 크게", level: "초급", cloze: "He read the letter {out loud} to the class." },
 { id: "EX-S01E01-06", season: "S01", ep: "E01", expr: "be up to", meaning: "~을 하고 있다, 계획이 있다", level: "초급", cloze: "What {are} you {up to} tonight?" },
 { id: "EX-S01E01-07", season: "S01", ep: "E01", expr: "steer clear of", meaning: "~을 피하다, 가까이 가지 않다", level: "고급", cloze: "{Steer clear of} that road, it's closed." },
 { id: "EX-S01E01-08", season: "S01", ep: "E01", expr: "cut off", meaning: "말을 끊다, 연결을 끊다", level: "중급", cloze: "The call got {cut off} in the middle." },
 { id: "EX-S01E01-09", season: "S01", ep: "E01", expr: "put together", meaning: "조립하다, 한데 모아 만들다", level: "중급", cloze: "We {put} the bookshelf {together} in an hour." },
 { id: "EX-S01E01-10", season: "S01", ep: "E01", expr: "start + -ing", meaning: "~하기 시작하다", level: "초급", cloze: "It {started} raining right after lunch." },
 { id: "EX-S01E02-01", season: "S01", ep: "E02", expr: "give back", meaning: "돌려주다", level: "초급", cloze: "Can you {give back} my pen when you're done?" },
 { id: "EX-S01E02-02", season: "S01", ep: "E02", expr: "end up + -ing", meaning: "결국 ~하게 되다", level: "중급", cloze: "We {ended up} staying home all day." }
];
MOCK.blankTotal = 3183;
